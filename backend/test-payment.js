// 支付功能测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testPaymentFlow() {
  console.log('🚀 开始测试支付功能...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查通过:', healthResponse.data);

    // 2. 创建支付订单
    console.log('\n2. 创建支付订单...');
    const paymentData = {
      orderId: `ORDER_${Date.now()}`,
      userId: 1,
      amount: 100.00,
      currency: 'CNY',
      method: 'ALIPAY',
      returnUrl: 'http://localhost:3000/payment/return',
      notifyUrl: 'http://localhost:3000/payment/notify',
      expireMinutes: 30,
      metadata: {
        productName: '测试商品',
        description: '支付功能测试'
      }
    };

    const createResponse = await axios.post(`${BASE_URL}/payment/create`, paymentData);
    console.log('✅ 支付订单创建成功:', createResponse.data);
    
    const paymentId = createResponse.data.paymentId;

    // 3. 查询支付状态
    console.log('\n3. 查询支付状态...');
    const statusResponse = await axios.get(`${BASE_URL}/payment/status/${paymentId}`);
    console.log('✅ 支付状态查询成功:', statusResponse.data);

    // 4. 测试批量查询
    console.log('\n4. 测试批量查询...');
    const batchResponse = await axios.post(`${BASE_URL}/payment/batch-status`, {
      paymentIds: [paymentId]
    });
    console.log('✅ 批量查询成功:', batchResponse.data);

    // 5. 查询订单支付记录
    console.log('\n5. 查询订单支付记录...');
    const orderPaymentsResponse = await axios.get(`${BASE_URL}/payment/order/${paymentData.orderId}`);
    console.log('✅ 订单支付记录查询成功:', orderPaymentsResponse.data);

    console.log('\n🎉 支付功能测试完成！所有接口正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 测试Redpanda消息发布
async function testRedpandaIntegration() {
  console.log('\n📡 测试Redpanda消息集成...');
  
  try {
    // 测试通知发送
    const notificationResponse = await axios.post(`${BASE_URL}/notification/test`, {
      userId: 1,
      channel: 'email',
      template: 'PAYMENT_SUCCESS',
      payload: {
        paymentId: 'TEST_PAY_123',
        amount: 100.00
      }
    });
    console.log('✅ 通知消息发送成功:', notificationResponse.data);

  } catch (error) {
    console.error('❌ Redpanda集成测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
async function runTests() {
  await testPaymentFlow();
  await testRedpandaIntegration();
}

runTests().catch(console.error);