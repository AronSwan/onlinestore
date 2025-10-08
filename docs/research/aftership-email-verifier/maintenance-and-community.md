# 维护与社区（加强版）

维护信号
- CI 与质量：仓库含 GitHub Actions、golangci 配置、广泛的单测（address/smtp/mx/schedule 等），质量保障较为到位。
- 变更记录（CHANGELOG 要点）：
  - v1.1.0：Result 结构尺寸优化（96→80），ParseAddress 改为值返回以降低 GC 压力与提升局部性。
  - v1.3.2：使用 x/net/proxy 修复 SOCKS5 相关问题。
  - v1.3.x：catchAll 检测可选化。
  - v1.4.0：HasMXRecord 判定优化；引入厂商 API 校验支持（在主干内可看到 Yahoo 实现），并更新依赖。
- 依赖与生态：go.mod/go.sum 更新比较积极；GoreportCard、Coveralls 等徽章显示质量指标。

社区与贡献
- 参照 CONTRIBUTING.md 流程提交；遵循 golangci 与测试规范。
- 建议在提交前：本地跑 lint/test；为新增功能提供单测（包含错误路径与边界条件）。

生产使用建议
- 自行基准：针对目标域（免费/企业/限速）做连接与验证延迟分布测试，校准超时与并发。
- 观测与告警：上线前接入指标与告警；对 unknown 比例、超时率与代理故障设置阈值。
- 清单数据治理：标注一次性域名来源与更新时间；误判回报机制与白名单流程。