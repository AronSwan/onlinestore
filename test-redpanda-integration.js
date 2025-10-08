// 测试 Redpanda 集成的 Node.js 脚本
const { Kafka } = require('kafkajs');

async function testRedpandaConnection() {
  const kafka = new Kafka({
    clientId: 'test-client',
    brokers: ['localhost:9092'],
    logLevel: 1 // ERROR level
  });

  const admin = kafka.admin();
  const producer = kafka.producer();
  const consumer = kafka.consumer({ groupId: 'test-group' });

  try {
    // 1. 连接测试
    console.log('🔌 连接 Redpanda...');
    await admin.connect();
    await producer.connect();
    await consumer.connect();
    console.log('✅ 连接成功');

    // 2. 创建主题测试
    console.log('📝 创建测试主题...');
    await admin.createTopics({
      topics: [{
        topic: 'nodejs-test',
        numPartitions: 3,
        replicationFactor: 1
      }]
    });
    console.log('✅ 主题创建成功');

    // 3. 生产消息测试
    console.log('📤 发送测试消息...');
    await producer.send({
      topic: 'nodejs-test',
      messages: [{
        key: 'test-key',
        value: JSON.stringify({
          message: 'Hello from Node.js',
          timestamp: new Date().toISOString()
        })
      }]
    });
    console.log('✅ 消息发送成功');

    // 4. 消费消息测试
    console.log('📥 消费测试消息...');
    await consumer.subscribe({ topic: 'nodejs-test' });
    
    let messageReceived = false;
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = JSON.parse(message.value.toString());
        console.log('✅ 收到消息:', value);
        messageReceived = true;
        return false; // 停止消费
      }
    });

    // 等待消息
    const timeout = new Promise(resolve => setTimeout(resolve, 3000));
    await timeout;

    if (messageReceived) {
      console.log('🎉 Redpanda 集成测试完全成功！');
    } else {
      console.log('⚠️ 消息消费超时，可能存在问题');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  } finally {
    await admin.disconnect();
    await producer.disconnect();
    await consumer.disconnect();
  }
}

// 运行测试
testRedpandaConnection()
  .then(() => {
    console.log('✅ 所有测试通过');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });