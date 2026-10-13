# 订单快照测试矩阵（阶段 4）

> 生成：2026-10-13 · 状态：现有 77 tests 全绿
> 口径：仅覆盖 jest spec（不含 e2e/真库集成）

## 覆盖矩阵

| 模块 | spec 文件 | tests | 状态 |
|------|-----------|-------|------|
| order-snapshot-chain.ts | order-snapshot-chain.spec.ts | 14 | ✅ |
| anchor-utils.ts | anchor-utils.spec.ts | 32 | ✅ |
| db-open.ts | db-open.spec.ts | 6 | ✅ |
| console-tty.ts | console-tty.spec.ts | 8 | ✅ |
| pii-mask.ts | pii-mask.spec.ts | 17 | ✅ |
| order-snapshot.service.ts | — | 0 | ❌ 无 spec |
| order-snapshot-read.service.ts | — | 0 | ❌ 无 spec |
| order-snapshot.controller.ts | — | 0 | ❌ 无 spec |
| reconcile-orders.mjs | — | 0 | ❌ 无 spec |

## 判型覆盖（order-snapshot-chain.spec.ts）

| 判型 | 断言 | 状态 |
|------|------|------|
| UNCHAINED (seq NULL) | ✅ 1 条 | ✅ |
| UNCHAINED (双 NULL) | ✅ 3 条 | ✅ |
| UNCHAINED (全行) | ✅ 1 条 | ✅ |
| BREAK | ✅ 1 条（篡改中段） | ✅ |
| CONTENT | ✅ 2 条（audit+order） | ✅ |
| GAP | ❌ 无直测 | ❌ |
| DUPLICATE_SEQ | ❌ 无直测 | ❌ |
| FORK | ❌ 无直测 | ❌ |

## PII 脱敏覆盖（pii-mask.spec.ts）

| 场景 | 断言 | 状态 |
|------|------|------|
| maskName 两字/三字/单字/null | ✅ 4 条 | ✅ |
| maskPhone 11位/短号/null | ✅ 3 条 | ✅ |
| maskAddress 长/短/null | ✅ 3 条 | ✅ |
| isAdmin=true 原样 | ✅ 2 条 | ✅ |
| isAdmin=false 遮罩 | ✅ 2 条 | ✅ |
| 非 PII 字段不动 | ✅ 1 条 | ✅ |
| 不改原对象 | ✅ 1 条 | ✅ |
| PII null | ✅ 1 条 | ✅ |

## 待补 spec（优先级）

1. **P1** order-snapshot.service.ts（写路径——genesis/update/零变化跳过/version 递增）
2. **P1** GAP/DUPLICATE_SEQ/FORK 判型直测
3. **P2** order-snapshot-read.service.ts（读路径——查/验/时间线 diff）
4. **P2** order-snapshot.controller.ts（端点——越权/脱敏/404）
5. **P3** reconcile-orders.mjs（四项对账逻辑）

## 复现命令

```bash
cd backend && npx jest --config=jest.config.cjs --no-coverage --testPathPattern="orders/snapshot"
# 5 suites / 77 tests PASS
```
