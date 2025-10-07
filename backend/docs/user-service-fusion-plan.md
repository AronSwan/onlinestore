# 用户服务融合方案（参考 temp_congomall 用户管理模块）

目标：在现有 NestJS + TypeORM 后端中，构建完整“用户域”（认证会话、用户资料、收货地址、行政区划、验证码与风控），与订单、购物车无缝对接，接口契约尽量对齐 temp_congomall，降低前后端适配成本。

## 1. 模块划分与目录（DDD 分层）

- users（用户资料/账户）
  - domain：聚合 CustomerUser（账号/邮箱/手机号/密码散列/头像/性别/生日/状态）
  - infrastructure：UserEntity、UserRepository（TypeORM），唯一约束 accountNumber/email/phone
  - application：资料查询/更新、头像更新、密码修改（二次验证）
  - interfaces：UsersController（受 JwtAuthGuard）
- auth（认证与会话）
  - domain：刷新令牌策略（旋转、版本号/黑名单）
  - application：登录（账号密码/邮箱验证码）、checkLogin、logout、refresh、验证码下发
  - interfaces：AuthController（/api/customer-user/login|check-login|logout）
  - integration：@nestjs/jwt + passport（local/jwt/mail-code 策略）
- verify（验证码子域）
  - domain：验证码模型（用途、TTL、错误计数、频控）
  - infrastructure：Redis 存储 + 频控（IP/用户维度）
  - interfaces：/api/customer-user/verify-code/send
- address（收货地址）
  - domain：ReceiveAddress（userId、name、phone、省市区编码与名称、detail、isDefault）
  - application：列表、保存、更新、删除、设置默认（事务，保证唯一默认）
  - interfaces：路径命名对齐 congomall（见第3节）
  - cache：按 userId 缓存列表，写操作失效
- basic-data（行政区划）
  - domain：RegionInfo（code/name/level/parent/sort）
  - interfaces：/api/basics-data/region/all|list/level/{level}|list/code/{code}|list/parent/{parent}
  - cache：长 TTL + 抖动；启动预热与定时刷新

## 2. 数据模型（TypeORM 实体与索引）

- users_user
  - id(PK, UUID)、account_number(UNIQ)、email(UNIQ, nullable)、phone(UNIQ, nullable)
  - username、password_hash、salt、avatar、gender、birthday、status、created_at、updated_at
  - 索引：account_number、email、phone
- users_session（可选，用于刷新令牌状态/版本）
  - user_id、refresh_token_hash、version、expires_at、device_info、ip
  - 索引：user_id、expires_at
- users_receive_address
  - id(PK, UUID)、user_id、name、phone、province_code/name、city_code/name、district_code/name、detail_address、is_default、created_at、updated_at
  - 事务保证：同 user_id 仅1条 is_default=true；索引：user_id、is_default、created_at
- basic_region_info
  - code(PK)、name、level、parent、sort；索引：level、parent、sort
- verify_code（如用 Redis，可不建表）
  - key（login:mail:xxx）、code、ttl、attempts、throttle

## 3. 接口契约（对齐 temp_congomall 命名）

- 认证与用户
  - POST /api/customer-user/login
    - body：{ loginType, accountNumber, passwordOrCode, captchaToken? }
    - resp：{ customerUserId, username, accountNumber, accessToken, refreshToken, expireIn }
  - GET /api/customer-user/check-login?accessToken=xxx
  - GET /api/customer-user/logout?accessToken=xxx
  - POST /api/customer-user/verify-code/send
    - body：{ sendType: 'login'|'register', mail|phone, scene }
- 收货地址
  - GET    /api/customer-user/receive-address/{customerUserId}
  - POST   /api/customer-user/receive-address
  - PUT    /api/customer-user/receive-address
  - DELETE /api/customer-user/{customerUserId}/receive-address/{receiveAddressId}
  - 可选：PUT /api/customer-user/receive-address/{receiveAddressId}/default
- 行政区划
  - GET /api/basics-data/region/all
  - GET /api/basics-data/region/list/level/{level}
  - GET /api/basics-data/region/list/code/{code}
  - GET /api/basics-data/region/list/parent/{parent}

说明：字段命名、路径风格尽量与 temp_congomall 一致，便于 BFF/前端复用。

## 4. 业务流程（与 CongoMall 对齐）

- 账号密码登录：
  频控 → 查用户 → bcrypt 校验 → 签发 access/refresh → 记录会话或提升 version → 返回响应 DTO
- 邮箱验证码登录：
  发送：Redis 存 code+TTL、频控、失败重试 → 登录：校验 code → 签发 token → 失效验证码
- check-login：校验 JWT，返回用户概要或 401
- logout：刷新令牌失效（版本号或黑名单），记录审计
- 收货地址：
  列表优先读缓存；新增/更新/删除/设默认使用事务（先取消其他默认，再设定目标），写后删除缓存
- 行政区划：
  启动预热缓存，接口读缓存，未命中回源 DB 再回写缓存

## 5. DTO 与校验（示例）

- UserLoginCommand：loginType('ACCOUNT'|'MAIL_CODE')、accountNumber、password、mail、code、captchaToken?
- UserLoginRespDTO：customerUserId、username、accountNumber、accessToken、refreshToken、expireIn
- ReceiveAddressSave/UpdateCommand：userId、name、phone、provinceCode/Name、cityCode/Name、districtCode/Name、detailAddress、isDefault?
- ReceiveAddressRespDTO：addressId、userId、userName、phone、…、isDefault

所有入参使用 class-validator 强校验；Swagger 注解补齐示例。

## 6. 缓存与一致性

- 地址：userId → 列表，TTL 5~10 分钟 + 随机 0~2 分钟；写操作删除缓存 key
- 行政区划：TTL 1 天 + 抖动；定时预热
- 会话：accessToken 不缓存；refreshToken 状态/版本存 Redis 或 DB

## 7. 安全与风控

- 全局限流（@nestjs/throttler）：登录/验证码接口更严格（IP+用户维度）
- 密码安全：bcrypt 12+、强度校验、不回传敏感字段
- 验证码防刷：Redis 计数、冷却时间、设备/IP 维度限速
- CORS/Helmet/CSP 严格配置；审计日志覆盖登录、登出、资料与地址变更

## 8. 可观测性与指标

- 指标：login_success_total/login_failed_total、verify_send_total、address_rw_latency_ms、cache_hit_ratio、rate_limit_drops
- Tracing：登录/验证码/地址链路打 span（携带 userId）
- 日志：结构化 + 路由标签（已具备 RouteLabelInterceptor）

## 9. 与订单/购物车的集成

- 统一主键：customerUserId = users_user.id
- 下单使用地址快照存入订单，避免后续修改影响历史
- 事件（可选）：UserRegisteredEvent、AddressChangedEvent（Outbox + Redpanda/Kafka）

## 10. 落地路线图（建议）

- 阶段1（3-5天）：address/basic-data MVP
  - Address 实体/服务/控制器 + 事务/缓存/指标
  - RegionInfo 数据导入与查询 + 缓存
- 阶段2（5-7天）：auth 登录/注册/验证码
  - 账号密码 + 邮箱验证码登录、check-login、logout、refresh
  - 频控、Redis 验证码、审计与告警
- 阶段3（3-5天）：稳态增强
  - 统一错误码、SLO/报警、Outbox 事件骨架、e2e 闭环与压测

## 11. 实施清单（短平快）

- 统一测试与 tsconfig.spec 命名策略；提升 TS 严格度（noImplicitAny/strictNullChecks）
- 启用全局 Throttler、CORS 白名单、Helmet 与 CSP
- 为 address/basic-data 接口补齐 Swagger、Jest 单测与覆盖率阈值
- 缓存键：addr:list:{userId}；region:all / region:level:{level} / region:code:{code} / region:parent:{parent}
- 数据库迁移：users_user、users_receive_address、basic_region_info、（可选）users_session

## 12. 兼容与回滚

- 兼容：优先新增接口与字段，避免破坏既有路径；通过 Assembler 适配字段差异
- 回滚：特性开关（Feature Flag）包裹新登录方式与验证码；出现异常可快速关闭
- 备份：上线前导出表结构与快照，预备回滚脚本

——
如需，我可以按此方案生成 address/basic-data/auth/users 模块骨架（Entity/DTO/Service/Controller/测试/Swagger）与数据库迁移脚本。