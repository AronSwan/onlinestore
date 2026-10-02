// 用途：FirstName 值对象单元测试（严格构造路径 vs 持久化宽松路径 fromPersisted）
// 依赖文件：first-name.value-object.ts
// 时间：2026-10-02（D4 整改补充用例）

import { FirstName } from './first-name.value-object';
import { UserConstraintException } from '../errors/user.errors';

describe('FirstName Value Object', () => {
  describe('严格构造路径 new FirstName()', () => {
    it('应接受合法名字', () => {
      const firstName = new FirstName('John');
      expect(firstName.getValue()).toBe('John');
    });

    it('应拒绝空值与空白值', () => {
      expect(() => new FirstName('')).toThrow(UserConstraintException);
      expect(() => new FirstName('   ')).toThrow(UserConstraintException);
    });

    it('应拒绝超出长度上限的名字', () => {
      const tooLong = 'a'.repeat(FirstName.MAX_LENGTH + 1);
      expect(() => new FirstName(tooLong)).toThrow(UserConstraintException);
    });

    it('应拒绝含数字/下划线的名字（NAME_PATTERN 严格校验，保持不变）', () => {
      expect(() => new FirstName('user_2026')).toThrow(UserConstraintException);
    });
  });

  describe('持久化宽松路径 FirstName.fromPersisted()', () => {
    it('应接受 username 形态的历史数据（含数字/下划线）且值正确', () => {
      const firstName = FirstName.fromPersisted('user_2026');
      expect(firstName).toBeInstanceOf(FirstName);
      expect(firstName.getValue()).toBe('user_2026');
      expect(firstName.value).toBe('user_2026');
    });

    it('应接受普通合法名字（与严格路径一致）', () => {
      const firstName = FirstName.fromPersisted('John');
      expect(firstName.getValue()).toBe('John');
    });

    it('应拒绝空值与空白值', () => {
      expect(() => FirstName.fromPersisted('')).toThrow(UserConstraintException);
      expect(() => FirstName.fromPersisted('   ')).toThrow(UserConstraintException);
    });

    it('应拒绝超出长度上限的名字（与严格路径一致）', () => {
      const tooLong = 'a'.repeat(FirstName.MAX_LENGTH + 1);
      expect(() => FirstName.fromPersisted(tooLong)).toThrow(
        new UserConstraintException(
          `First name is too long. Maximum allowed length is ${FirstName.MAX_LENGTH}`,
          'INVALID_FIRST_NAME',
        ),
      );
    });

    it('宽松路径跳过字符集校验但严格路径仍抛（行为差异回归锚点）', () => {
      expect(() => FirstName.fromPersisted('user_2026')).not.toThrow();
      expect(() => new FirstName('user_2026')).toThrow(UserConstraintException);
    });
  });
});
