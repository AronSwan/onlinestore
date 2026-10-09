# 地址处理系统 (Address Processing System)

这是一个基于 NestJS 的地址处理系统，集成了 Nominatim 地理编码服务和多国地址格式化功能。

## 功能特性

### 🌍 多国地址支持
- 支持中国、美国、英国、德国、法国、日本、韩国、澳大利亚、加拿大、巴西等主要国家
- 每个国家都有专门的地址格式模板
- 自动识别和验证邮编格式

### 🗺️ 地理编码服务
- 基于 OpenStreetMap 的 Nominatim 服务
- 支持地址转坐标（地理编码）
- 支持坐标转地址（反向地理编码）
- 结构化地址搜索
- 自动请求限制（公共API每秒1次）

### ✅ 地址验证
- 实时地址验证
- 置信度评分
- 必需字段检查
- 格式标准化

### 💾 数据持久化
- TypeORM 实体映射
- PostgreSQL 数据库支持
- 地理坐标索引优化
- 审计字段（创建/更新时间）

## 快速开始

### 1. 安装依赖

```bash
npm install @nestjs/typeorm typeorm pg axios
```

### 2. 环境配置

在 `.env` 文件中添加：

```env
# Nominatim 配置
NOMINATIM_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=YourApp/1.0

# 数据库配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=shopping_site
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
```

### 3. 导入模块

在 `app.module.ts` 中导入：

```typescript
import { AddressModule } from './address/address.module';

@Module({
  imports: [
    // ... 其他模块
    AddressModule,
  ],
})
export class AppModule {}
```

### 4. 数据库迁移

```bash
npm run migration:generate -- --name=CreateAddressTable
npm run migration:run
```

## API 使用示例

### 创建地址

```bash
POST /addresses
Content-Type: application/json

{
  "rawAddress": "北京市朝阳区建国门外大街1号",
  "countryCode": "CN",
  "language": "zh-CN"
}
```

响应：
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "rawAddress": "北京市朝阳区建国门外大街1号",
  "formattedAddress": "中国 北京市 朝阳区 建国门外大街 1号",
  "street": "建国门外大街",
  "houseNumber": "1号",
  "city": "朝阳区",
  "state": "北京市",
  "country": "CN",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "isValid": true,
  "confidence": 0.95,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 批量创建地址

```bash
POST /addresses/batch
Content-Type: application/json

[
  {
    "rawAddress": "1600 Pennsylvania Avenue NW, Washington, DC 20500",
    "countryCode": "US"
  },
  {
    "rawAddress": "10 Downing Street, London SW1A 2AA",
    "countryCode": "GB"
  }
]
```

### 地理编码

```bash
POST /addresses/geocode
Content-Type: application/json

{
  "address": "天安门广场",
  "countryCode": "CN",
  "limit": 5
}
```

### 反向地理编码

```bash
POST /addresses/reverse-geocode
Content-Type: application/json

{
  "latitude": 39.9042,
  "longitude": 116.4074,
  "language": "zh-CN"
}
```

### 验证地址

```bash
POST /addresses/validate
Content-Type: application/json

{
  "address": "北京市朝阳区建国门外大街1号",
  "countryCode": "CN",
  "strictMode": true
}
```

## 服务架构

### AddressService
主要业务逻辑服务，处理地址的 CRUD 操作。

### NominatimService
Nominatim API 集成服务，提供地理编码功能。

### AddressFormattingService
地址格式化服务，支持多国地址格式。

### AddressValidationService
地址验证服务，综合多个服务进行地址验证。

## 支持的国家格式

| 国家代码 | 国家名称 | 格式示例 |
|---------|---------|---------|
| CN | 中国 | 中国 北京市 朝阳区 建国门外大街 1号 |
| US | 美国 | 1600 Pennsylvania Avenue NW<br>Washington, DC 20500<br>United States |
| GB | 英国 | 10 Downing Street<br>London<br>SW1A 2AA<br>United Kingdom |
| DE | 德国 | Unter den Linden 1<br>10117 Berlin<br>Germany |
| FR | 法国 | 55 Rue du Faubourg Saint-Honoré<br>75008 Paris<br>France |
| JP | 日本 | 日本<br>100-8968<br>東京都 千代田区<br>永田町 1-6-1 |

## 性能优化

### 数据库索引
- 地理坐标复合索引：`(latitude, longitude)`
- 地区索引：`(country, city)`
- 邮编索引：`(postalCode)`

### 缓存策略
- Redis 缓存常用地址查询结果
- 地理编码结果缓存（24小时）
- 地址验证结果缓存（1小时）

### 请求限制
- Nominatim 公共API：每秒1次请求
- 自动重试机制
- 请求超时设置（10秒）

## 错误处理

系统提供详细的错误信息和状态码：

- `400 Bad Request`: 请求参数错误
- `404 Not Found`: 地址未找到
- `422 Unprocessable Entity`: 地址验证失败
- `503 Service Unavailable`: 地理编码服务不可用

## 测试

运行单元测试：
```bash
npm run test src/address
```

运行集成测试：
```bash
npm run test:e2e -- --testNamePattern="Address"
```

## 部署建议

### 生产环境
1. 使用私有 Nominatim 实例以避免请求限制
2. 配置 Redis 缓存集群
3. 启用数据库连接池
4. 配置监控和日志

### Docker 部署
```yaml
version: '3.8'
services:
  nominatim:
    image: mediagis/nominatim:4.2
    environment:
      - PBF_URL=https://download.geofabrik.de/asia/china-latest.osm.pbf
    ports:
      - "8080:8080"
```

## 许可证

本项目基于 MIT 许可证开源。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [Nominatim API 文档](https://nominatim.org/release-docs/develop/api/Overview/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [OpenCage Address Formatting](https://github.com/OpenCageData/address-formatting)