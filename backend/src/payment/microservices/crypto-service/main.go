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
	"github.com/joho/godotenv"
)

type CryptoPaymentRequest struct {
	OrderID      string                 `json:"orderId" binding:"required"`
	Amount       float64                `json:"amount" binding:"required"`
	Currency     string                 `json:"currency" binding:"required"`
	Network      string                 `json:"network" binding:"required"`
	UserID       int                    `json:"userId" binding:"required"`
	ExpireMinutes int                   `json:"expireMinutes"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type CryptoPaymentResponse struct {
	Success   bool   `json:"success"`
	PaymentID string `json:"paymentId,omitempty"`
	Address   string `json:"address,omitempty"`
	Amount    float64 `json:"amount,omitempty"`
	QRCode    string `json:"qrCode,omitempty"`
	ExpiredAt string `json:"expiredAt,omitempty"`
	Message   string `json:"message,omitempty"`
}

type CryptoQueryResponse struct {
	Success       bool    `json:"success"`
	Status        string  `json:"status"`
	TxHash        string  `json:"txHash,omitempty"`
	Confirmations int     `json:"confirmations,omitempty"`
	PaidAt        string  `json:"paidAt,omitempty"`
	ActualAmount  float64 `json:"actualAmount,omitempty"`
	Message       string  `json:"message,omitempty"`
}

type CryptoService struct {
	// 模拟的地址池
	addressPool map[string]string
}

func NewCryptoService() *CryptoService {
	return &CryptoService{
		addressPool: map[string]string{
			"USDT_TRC20": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
			"USDT_ERC20": "0x742d35Cc6634C0532925a3b8D2A7b5B2C8e1F5C3",
			"USDT_BEP20": "0x742d35Cc6634C0532925a3b8D2A7b5B2C8e1F5C3",
			"BTC":        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
			"ETH":        "0x742d35Cc6634C0532925a3b8D2A7b5B2C8e1F5C3",
		},
	}
}

func (cs *CryptoService) CreatePayment(req *CryptoPaymentRequest) (*CryptoPaymentResponse, error) {
	// 生成支付ID
	paymentID := fmt.Sprintf("CRYPTO_%d_%s", time.Now().Unix(), req.Currency)
	
	// 获取对应的地址
	addressKey := fmt.Sprintf("%s_%s", req.Currency, req.Network)
	address, exists := cs.addressPool[addressKey]
	if !exists {
		address = cs.addressPool[req.Currency]
	}
	
	if address == "" {
		return &CryptoPaymentResponse{
			Success: false,
			Message: fmt.Sprintf("不支持的加密货币: %s-%s", req.Currency, req.Network),
		}, nil
	}

	// 生成二维码（模拟）
	qrCode := fmt.Sprintf("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
	
	// 设置过期时间
	expireMinutes := req.ExpireMinutes
	if expireMinutes == 0 {
		expireMinutes = 60 // 默认60分钟
	}
	expiredAt := time.Now().Add(time.Duration(expireMinutes) * time.Minute)

	return &CryptoPaymentResponse{
		Success:   true,
		PaymentID: paymentID,
		Address:   address,
		Amount:    req.Amount,
		QRCode:    qrCode,
		ExpiredAt: expiredAt.Format(time.RFC3339),
	}, nil
}

func (cs *CryptoService) QueryPayment(paymentID string) (*CryptoQueryResponse, error) {
	// 模拟查询结果
	// 在实际应用中，这里会查询区块链网络
	return &CryptoQueryResponse{
		Success:       true,
		Status:        "confirming", // pending, confirming, confirmed, failed
		TxHash:        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
		Confirmations: 3,
		ActualAmount:  100.0,
	}, nil
}

func (cs *CryptoService) ValidateTransaction(txHash, currency, network string) (bool, error) {
	// 模拟交易验证
	// 在实际应用中，这里会验证区块链交易
	if txHash == "" {
		return false, fmt.Errorf("交易哈希不能为空")
	}
	
	// 简单的格式验证
	switch currency {
	case "BTC":
		return len(txHash) == 64, nil
	case "ETH", "USDT":
		return len(txHash) == 66 && txHash[:2] == "0x", nil
	default:
		return false, fmt.Errorf("不支持的货币类型: %s", currency)
	}
}

func (cs *CryptoService) GetAddressBalance(address, currency, network string) (float64, error) {
	// 模拟余额查询
	// 在实际应用中，这里会查询区块链地址余额
	return 1000.0, nil
}

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Printf("加载.env文件失败: %v", err)
	}

	// 初始化加密货币服务
	cryptoService := NewCryptoService()

	// 设置Gin模式
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 中间件
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, X-Timestamp, X-Signature")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})

	// API路由
	api := r.Group("/api/v1")
	{
		api.POST("/crypto/payment/create", func(c *gin.Context) {
			var req CryptoPaymentRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, CryptoPaymentResponse{
					Success: false,
					Message: err.Error(),
				})
				return
			}

			resp, err := cryptoService.CreatePayment(&req)
			if err != nil {
				c.JSON(http.StatusInternalServerError, CryptoPaymentResponse{
					Success: false,
					Message: err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, resp)
		})

		api.GET("/crypto/payment/query/:paymentId", func(c *gin.Context) {
			paymentID := c.Param("paymentId")
			
			resp, err := cryptoService.QueryPayment(paymentID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, CryptoQueryResponse{
					Success: false,
					Message: err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, resp)
		})

		api.GET("/crypto/address/balance", func(c *gin.Context) {
			address := c.Query("address")
			currency := c.Query("currency")
			network := c.Query("network")
			
			balance, err := cryptoService.GetAddressBalance(address, currency, network)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"balance": balance,
			})
		})

		api.GET("/crypto/transaction/validate", func(c *gin.Context) {
			txHash := c.Query("txHash")
			currency := c.Query("currency")
			network := c.Query("network")
			
			valid, err := cryptoService.ValidateTransaction(txHash, currency, network)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"valid":   valid,
			})
		})
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
			"service": "crypto-gateway",
		})
	})

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
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

	log.Printf("加密货币网关已启动，端口: %s", port)

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