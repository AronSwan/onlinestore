package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-pay/gopay"
	"github.com/go-pay/gopay/alipay"
	"github.com/go-pay/gopay/wechat"
	"github.com/joho/godotenv"
)

type PaymentRequest struct {
	Method       string                 `json:"method" binding:"required"`
	OrderID      string                 `json:"orderId" binding:"required"`
	Amount       float64                `json:"amount" binding:"required"`
	Currency     string                 `json:"currency"`
	Subject      string                 `json:"subject" binding:"required"`
	Body         string                 `json:"body"`
	ReturnURL    string                 `json:"returnUrl"`
	NotifyURL    string                 `json:"notifyUrl"`
	ExpireMinutes int                   `json:"expireMinutes"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type PaymentResponse struct {
	Success   bool   `json:"success"`
	Code      string `json:"code,omitempty"`
	Message   string `json:"message,omitempty"`
	Data      *PaymentData `json:"data,omitempty"`
}

type PaymentData struct {
	PaymentID   string `json:"paymentId"`
	RedirectURL string `json:"redirectUrl,omitempty"`
	QRCode      string `json:"qrCode,omitempty"`
	DeepLink    string `json:"deepLink,omitempty"`
	ExpiredAt   string `json:"expiredAt,omitempty"`
}

type PaymentService struct {
	alipayClient *alipay.Client
	wechatClient *wechat.Client
}

func NewPaymentService() *PaymentService {
	// 初始化支付宝客户端
	alipayClient, err := alipay.NewClient(
		os.Getenv("ALIPAY_APP_ID"),
		os.Getenv("ALIPAY_PRIVATE_KEY"),
		true, // 是否是沙箱环境
	)
	if err != nil {
		log.Printf("初始化支付宝客户端失败: %v", err)
	} else {
		// 设置支付宝公钥
		err = alipayClient.SetAliPayPublicKey(os.Getenv("ALIPAY_PUBLIC_KEY"))
		if err != nil {
			log.Printf("设置支付宝公钥失败: %v", err)
		}
	}

	// 初始化微信客户端
	wechatClient := wechat.NewClient(
		os.Getenv("WECHAT_APP_ID"),
		os.Getenv("WECHAT_MCH_ID"),
		os.Getenv("WECHAT_API_KEY"),
		true, // 是否是沙箱环境
	)

	return &PaymentService{
		alipayClient: alipayClient,
		wechatClient: wechatClient,
	}
}

func (ps *PaymentService) CreatePayment(req *PaymentRequest) (*PaymentResponse, error) {
	switch req.Method {
	case "alipay":
		return ps.createAlipayPayment(req)
	case "wechat":
		return ps.createWechatPayment(req)
	default:
		return &PaymentResponse{
			Success: false,
			Code:    "UNSUPPORTED_METHOD",
			Message: fmt.Sprintf("不支持的支付方式: %s", req.Method),
		}, nil
	}
}

func (ps *PaymentService) createAlipayPayment(req *PaymentRequest) (*PaymentResponse, error) {
	if ps.alipayClient == nil {
		return &PaymentResponse{
			Success: false,
			Code:    "CLIENT_ERROR",
			Message: "支付宝客户端未初始化",
		}, nil
	}

	// 构建支付宝支付参数
	bm := make(gopay.BodyMap)
	bm.Set("out_trade_no", req.OrderID)
	bm.Set("total_amount", fmt.Sprintf("%.2f", req.Amount))
	bm.Set("subject", req.Subject)
	bm.Set("body", req.Body)
	
	if req.ReturnURL != "" {
		bm.Set("return_url", req.ReturnURL)
	}
	if req.NotifyURL != "" {
		bm.Set("notify_url", req.NotifyURL)
	}
	if req.ExpireMinutes > 0 {
		bm.Set("timeout_express", fmt.Sprintf("%dm", req.ExpireMinutes))
	}

	// 创建支付宝页面支付
	payURL, err := ps.alipayClient.TradePagePay(context.Background(), bm)
	if err != nil {
		return &PaymentResponse{
			Success: false,
			Code:    "PAYMENT_ERROR",
			Message: fmt.Sprintf("创建支付宝支付失败: %v", err),
		}, nil
	}

	return &PaymentResponse{
		Success: true,
		Data: &PaymentData{
			PaymentID:   req.OrderID,
			RedirectURL: payURL,
			ExpiredAt:   time.Now().Add(time.Duration(req.ExpireMinutes) * time.Minute).Format(time.RFC3339),
		},
	}, nil
}

func (ps *PaymentService) createWechatPayment(req *PaymentRequest) (*PaymentResponse, error) {
	if ps.wechatClient == nil {
		return &PaymentResponse{
			Success: false,
			Code:    "CLIENT_ERROR",
			Message: "微信客户端未初始化",
		}, nil
	}

	// 构建微信支付参数
	bm := make(gopay.BodyMap)
	bm.Set("out_trade_no", req.OrderID)
	bm.Set("total_fee", int(req.Amount*100)) // 微信支付金额单位为分
	bm.Set("body", req.Subject)
	bm.Set("spbill_create_ip", "127.0.0.1") // 实际应用中应该获取真实IP
	bm.Set("trade_type", "NATIVE") // 扫码支付
	
	if req.NotifyURL != "" {
		bm.Set("notify_url", req.NotifyURL)
	}
	if req.ExpireMinutes > 0 {
		expireTime := time.Now().Add(time.Duration(req.ExpireMinutes) * time.Minute)
		bm.Set("time_expire", expireTime.Format("20060102150405"))
	}

	// 创建微信扫码支付
	wxRsp, err := ps.wechatClient.UnifiedOrder(context.Background(), bm)
	if err != nil {
		return &PaymentResponse{
			Success: false,
			Code:    "PAYMENT_ERROR",
			Message: fmt.Sprintf("创建微信支付失败: %v", err),
		}, nil
	}

	if wxRsp.ReturnCode != "SUCCESS" || wxRsp.ResultCode != "SUCCESS" {
		return &PaymentResponse{
			Success: false,
			Code:    "PAYMENT_ERROR",
			Message: fmt.Sprintf("微信支付创建失败: %s", wxRsp.ErrCodeDes),
		}, nil
	}

	return &PaymentResponse{
		Success: true,
		Data: &PaymentData{
			PaymentID: req.OrderID,
			QRCode:    wxRsp.CodeUrl,
			ExpiredAt: time.Now().Add(time.Duration(req.ExpireMinutes) * time.Minute).Format(time.RFC3339),
		},
	}, nil
}

func (ps *PaymentService) QueryPayment(paymentID string) (*PaymentResponse, error) {
	// 这里应该根据支付方式查询对应的支付状态
	// 为简化示例，这里返回模拟数据
	return &PaymentResponse{
		Success: true,
		Data: &PaymentData{
			PaymentID: paymentID,
		},
	}, nil
}

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Printf("加载.env文件失败: %v", err)
	}

	// 初始化支付服务
	paymentService := NewPaymentService()

	// 设置Gin模式
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 中间件
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.Next()
	})

	// API路由
	api := r.Group("/api/v1")
	{
		api.POST("/payment/create", func(c *gin.Context) {
			var req PaymentRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, PaymentResponse{
					Success: false,
					Code:    "INVALID_PARAMS",
					Message: err.Error(),
				})
				return
			}

			resp, err := paymentService.CreatePayment(&req)
			if err != nil {
				c.JSON(http.StatusInternalServerError, PaymentResponse{
					Success: false,
					Code:    "INTERNAL_ERROR",
					Message: err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, resp)
		})

		api.GET("/payment/query/:paymentId", func(c *gin.Context) {
			paymentID := c.Param("paymentId")
			
			resp, err := paymentService.QueryPayment(paymentID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, PaymentResponse{
					Success: false,
					Code:    "INTERNAL_ERROR",
					Message: err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, resp)
		})

		api.POST("/payment/refund", func(c *gin.Context) {
			// 退款逻辑
			c.JSON(http.StatusOK, PaymentResponse{
				Success: true,
				Message: "退款功能待实现",
			})
		})
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
		})
	})

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// 优雅关闭
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务器启动失败: %v", err)
		}
	}()

	log.Printf("Gopay微服务已启动，端口: %s", port)

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("正在关闭服务器...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("服务器强制关闭:", err)
	}

	log.Println("服务器已关闭")
}