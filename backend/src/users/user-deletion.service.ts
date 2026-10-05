// 用途：权益批 B10（隐私 P1② 被遗忘权）——DELETE /api/users/me 的级联删除服务
// 依赖文件：@nestjs/typeorm DataSource（本模块已注册的全部实体表，经原生 SQL 触达）
// 作者：权益修复批施工席
// 时间：2026-10-06
//
// 口径（docs/rights-group-verdict.md §二 B10）：
//   - 本人令牌鉴权（路由级 JwtAuthGuard，id 取自 token sub，不接受 URL 传参——
//     A 删 B 只能走 ADMIN 专用的 DELETE /users/:id，非 admin 403）；
//   - 级联清 cart/orders（含 order_items）/users，FK 依赖表（user_addresses/
//     customer_profiles）与令牌会话表（users_session）一并清；
//   - 取物理删 + audit 留痕：audit_logs 行不删，userName（现存值=邮箱）更新为
//     "[已注销]"。
// 已知限制（如实声明）：audit_logs 的 recordHash 覆盖 userName（canonical 16 键），
// 本脱敏会使受影响行的存档哈希失配——需随后跑 backend/scripts/backfill-audit-chain.mjs
// 全链重锚恢复链校验（注销是成文的数据主体权利，重锚在案可查）。

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** 审计留痕的脱敏用户名（被遗忘权：行留、名脱） */
export const ANONYMIZED_USERNAME = '[已注销]';

@Injectable()
export class UserDeletionService {
  private readonly logger = new Logger(UserDeletionService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * 注销当前用户：单事务内按 FK 依赖序清空从表 → 脱敏审计 → 删用户行。
   * @param userId JWT sub（数值主键）
   */
  async deleteMeCascade(userId: number): Promise<void> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new NotFoundException('用户不存在');
    }
    const uid = String(userId);

    await this.dataSource.transaction(async (em) => {
      const rows: Array<Record<string, unknown>> = await em.query(
        'SELECT id FROM users WHERE id = ?',
        [userId],
      );
      if (!rows || rows.length === 0) {
        throw new NotFoundException('用户不存在');
      }

      // 依赖序：先子后父（SQLite FK 约束：orders/user_addresses/customer_profiles → users）。
      // order_items 的外键列是 orderId（驼峰，见 order-item.entity.ts 原始建表），
      // 先实测 PRAGMA table_info 后落 SQL（2026-10-06）
      await em.query(
        'DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE user_id = ?)',
        [userId],
      );
      await em.query('DELETE FROM orders WHERE user_id = ?', [userId]);
      await em.query('DELETE FROM cart_items WHERE customer_user_id = ?', [uid]);
      await em.query('DELETE FROM user_addresses WHERE user_id = ?', [userId]);
      await em.query('DELETE FROM customer_profiles WHERE user_id = ?', [userId]);
      await em.query('DELETE FROM users_session WHERE userId = ?', [uid]);
      // audit 留痕：行保留，userName 脱敏（存档哈希失配已知，随后重锚）
      await em.query('UPDATE audit_logs SET userName = ? WHERE userId = ?', [
        ANONYMIZED_USERNAME,
        uid,
      ]);
      await em.query('DELETE FROM users WHERE id = ?', [userId]);
    });

    // 延时补脱敏（fire-and-forget）：审计拦截器在响应后为本次 DELETE 再写一行
    // 审计（userName=邮箱）；3 秒后把该行的 userName 也脱敏掉，失败只记日志不回滚注销
    setTimeout(() => {
      void this.anonymizeAuditTrail(uid);
    }, 3000);
  }

  private async anonymizeAuditTrail(uid: string): Promise<void> {
    try {
      await this.dataSource.query(
        'UPDATE audit_logs SET userName = ? WHERE userId = ?',
        [ANONYMIZED_USERNAME, uid],
      );
    } catch (error) {
      this.logger.warn(
        `注销后审计脱敏补跑失败（userId=${uid}）：${String(error)}`,
      );
    }
  }
}
