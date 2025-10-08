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

    // 4. 列出所有主题
    const topics = await admin.listTopics();
    console.log('📋 当前主题列表:', topics);

    console.log('🎉 Redpanda 集成测试成功！');

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