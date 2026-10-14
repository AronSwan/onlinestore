# Ask HN 帖草稿（v2——地道化重写，待用户批准，未发布）

> 用途：外部设计反馈（"尽量不要闭门造车"第三件：外发帖）
> 状态：**草稿——未经用户批准，不发布**
> v1→v2 修订：去翻译腔/拆括号嵌套/去报告腔/第 3 问从空泛改具体（点出 key rotation 真实张力）/开头改"diminishing returns reviewing it ourselves"（契合开门初衷）
> 发布前闸：字节级回读比对

---

**标题**：Ask HN: What are the failure modes of an in-database hash chain audit log?

**正文**：

We're adding an audit trail to a small e-commerce system (NestJS, SQLite in dev, TiDB in prod) and after several rounds of internal review we're hitting diminishing returns. Here's the design — what are we missing?

The core is a `domain_events` table that lives in the same database as the business data:

- Each row has the event type, aggregate id, actor, and chain columns (seq, prevHash, recordHash). recordHash = SHA256(prevHash + a canonical serialization of 11 fields).
- The payload itself is not hashed into the chain. Each row stores payloadHash = HMAC(payload) instead. That keeps PII out of the chain — we can honor a GDPR erasure request by deleting the payload column and the chain still verifies — and a periodic job recomputes the HMACs to catch payload tampering.
- Two write paths. User and admin mutations insert the event row in the same transaction as the business write, so a failed audit write rolls back the business op. System-generated events are inserted with chain columns NULL and a background worker chains them later (retry with backoff, dead-letter after too many attempts).
- The chain head is anchored periodically to a git repo.
- DB triggers abort any UPDATE or DELETE on the table. Append-only is enforced by the storage engine, not just app code.
- Verification is an offline script that walks the chain in seq order, plus a self-test: a deliberately tampered row must fail verification, otherwise we consider the verifier itself broken.

Things we already know about:

- Anyone with full DB write access can recompute the whole chain in under a second. The anchor is the real defense, and honestly a git repo in the same trust domain is the weak version of that. The plan is to move digests somewhere the DB admin can't write — offline custody, RFC 3161, or an append-only remote.
- Between anchors, the tail can be rewritten undetectably. Sentinel rows at head and tail narrow this, and money-class events should get anchored immediately rather than waiting for the interval.
- Verification is O(n). We're fine with this at our volumes — verification is a batch job, not a request path. If it ever matters, schemaVersion is the first canonical key, so we can start a Merkle-based epoch later without touching old rows.
- Chain-tip forks can't happen today (single writer), but they will the moment we're on Postgres with multiple writers. Advisory locks plus fork detection in verify are on the migration checklist, not yet designed.

Questions:

1. What failure modes are we still missing?
2. If you've run a hash-chain audit log inside an OLTP table in production for a few years — what broke first? Performance, schema evolution, or the verification story?
3. The HMAC-instead-of-hashing-the-payload trick — anything we're underweighting there? Key rotation looks annoying either way (recompute all old HMACs, or keep old keys forever), and low-entropy fields like email addresses are presumably dictionary-attackable.

---

## 发布前自查（字节级）

- [x] 无内部编号（债/批/席/员/轮次）
- [x] 无仓名/路径/组织名
- [x] 无内部流程词汇
- [x] 技术细节与 v5.1 一致（11 键/HMAC/分腿/锚/触发器/自检/纪元——无杜撰）
- [x] 已知反对如实呈现（四条全带，含"git 锚是弱版本"自嘲式诚实）

## v1→v2 道地化修订记录

| v1 生硬处 | v2 处理 |
|----------|---------|
| "I'd like wider challenge"（语法别扭）| "we're hitting diminishing returns"（HN 常用语气，契合开门初衷）|
| "our internal reviewers have picked apart over several rounds"（内部流程感）| 降为半句 "after several rounds of internal review" |
| "What we already know and have accepted or mitigated:"（报告腔）| "Things we already know about:"（口语）|
| 括号套从句堆砌（GDPR 那句三层嵌套）| 拆句 + 破折号 |
| "Sentinel rows at chain head and tail so truncation is detected."（弱被动）| 并入尾部窗口段落（哨兵行服务于该问题——语境更自然）|
| 第 3 问 "Any subtleties...we're underweighting?"（空泛引不来答案）| 点出两个具体张力：key rotation 二选一困境 + 低熵字典攻击 |
| "structurally impossible"（太绝对）| "can't happen today (single writer), but they will the moment..."（时间限定+自认未来坑）|

## 发布操作（批准后）

1. 你批准本 v2（或再改）
2. 你用自有 HN 账号发布（HN 需登录账号，建议自贴；正文即上节内容）
3. 48-72h 后回收：top-level 回复按"新 failure mode / 经验印证 / 已知项确认"三分类归档到 `docs/drafts/ask-hn-feedback.md`
