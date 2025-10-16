# OpenObserve 查询功能调试报告

## 📋 概述

本报告记录了 OpenObserve 查询功能的调试过程和发现。

## 🔍 调试过程

### 1. 初始问题

- 数据发送成功，但查询未返回结果
- 查询API返回错误：`{"code":400,"message":"expected value at line 1 column 1"}`

### 2. 问题排查

#### 2.1 查询格式问题

**发现**: 查询API需要包含时间范围参数
```json
{
  "query": {
    "sql": "SELECT * FROM \"stream_name\" LIMIT 10",
    "start_time": "微秒时间戳",
    "end_time": "微秒时间戳"
  }
}
```

**解决**: 添加必需的时间范围参数

#### 2.2 时间戳格式问题

**发现**: OpenObserve 使用微秒格式的时间戳，而不是毫秒格式
- 流统计信息中的时间戳：`"doc_time_min":1760275044549951,"doc_time_max":1760275560000000`
- 这表明 OpenObserve 内部使用微秒精度的时间戳

**解决**: 将毫秒时间戳转换为微秒时间戳（乘以1000）

#### 2.3 字段名称问题

**发现**: 查询结果中的时间字段名为 `_timestamp`，而不是 `timestamp`

**解决**: 在查询中使用正确的字段名

### 3. 成功的查询方法

#### 3.1 直接使用curl查询

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YWRtaW5AZXhhbXBsZS5jb206Q29tcGxleHBhc3MjMTIz" \
  -d '{
    "query": {
      "sql": "SELECT * FROM \"test_runner_metrics\" ORDER BY \"_timestamp\" DESC LIMIT 10",
      "start_time": "1760275044549951",
      "end_time": "1760277591083000"
    }
  }' \
  http://localhost:5080/api/default/_search
```

#### 3.2 查询结果

成功返回了5条记录：
```json
{
  "took": 16,
  "hits": [
    {
      "_timestamp": 1760275276241000,
      "labels_component": "test-runner",
      "labels_test_id": "openobserve-test",
      "metric_name": "test_counter",
      "metric_type": "counter",
      "metric_value": 42
    },
    {
      "_timestamp": 1760275276223000,
      "category": "TEST",
      "component": "test-runner",
      "level": "INFO",
      "message": "测试日志消息",
      "test_id": "openobserve-test"
    }
    // ... 更多记录
  ],
  "total": 5
}
```

## 🎯 关键发现

### 1. 时间戳格式

OpenObserve 使用微秒精度的时间戳：
- 内部存储：微秒格式
- API输入：微秒格式
- 数据输入：ISO 8601 格式的字符串（OpenObserve 会自动转换）

### 2. 查询API要求

查询API必须包含以下参数：
- `sql`: SQL查询语句
- `start_time`: 开始时间（微秒格式）
- `end_time`: 结束时间（微秒格式）

### 3. 字段映射

- 时间字段：`_timestamp`
- 其他字段：按原样存储

### 4. 数据索引

数据发送后需要一些时间进行索引，通常需要几秒钟。

## 🔧 解决方案

### 1. 修正查询格式

```javascript
const query = {
  query: {
    sql: `SELECT * FROM "${streamName}" ORDER BY "_timestamp" DESC LIMIT 10`,
    start_time: startTime.toString(),
    end_time: endTime.toString()
  }
};
```

### 2. 时间戳转换

```javascript
// 将毫秒时间戳转换为微秒时间戳
const microsecondTimestamp = Date.now() * 1000;
```

### 3. 获取流信息

```javascript
// 获取流信息以确定时间范围
const streamResponse = await fetch(`${openobserveUrl}/api/${organization}/streams`, {
  headers: {
    'Authorization': `Basic ${btoa(`${username}:${password}`)}`
  }
});

const streamResult = await streamResponse.json();
const stream = streamResult.list.find(s => s.name === streamName);
const startTime = stream.stats.doc_time_min;
const endTime = Date.now() * 1000; // 使用当前时间作为结束时间
```

## 📊 测试结果

✅ **成功查询到数据**
- 找到5条记录
- 包括日志数据和指标数据
- 时间戳正确解析
- 字段映射正确

## 📝 结论

OpenObserve 查询功能已经正常工作，但需要注意以下几点：

1. **时间戳格式**：使用微秒格式，而不是毫秒格式
2. **查询参数**：必须包含时间范围参数
3. **字段名称**：时间字段为 `_timestamp`
4. **数据索引**：数据发送后需要等待索引完成

通过解决这些问题，我们成功地实现了 OpenObserve 的数据查询功能。