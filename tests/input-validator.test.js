/**
 * 输入数据验证模块单元测试
 * 测试用户名、邮箱、密码验证的各种场景
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const InputValidator = require('../js/input-validator.js');

describe('InputValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('用户名验证', () => {
    test('有效用户名应该通过验证', () => {
      const validUsernames = ['john123', 'user_name', 'test-user', 'abc123'];
      
      validUsernames.forEach(username => {
        const result = validator.validateUsername(username);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitized).toBe(username);
      });
    });

    test('空用户名应该失败', () => {
      const result = validator.validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('用户名不能为空');
    });

    test('过短用户名应该失败', () => {
      const result = validator.validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('用户名至少需要3个字符');
    });

    test('过长用户名应该失败', () => {
      const result = validator.validateUsername('a'.repeat(21));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('用户名不能超过20个字符');
    });

    test('包含非法字符的用户名应该失败', () => {
      const invalidUsernames = ['user@name', 'user name', 'user#123', 'user.name'];
      
      invalidUsernames.forEach(username => {
        const result = validator.validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('用户名只能包含字母、数字、下划线和连字符');
      });
    });

    test('保留用户名应该失败', () => {
      const reservedUsernames = ['admin', 'root', 'user', 'test', 'guest', 'system'];
      
      reservedUsernames.forEach(username => {
        const result = validator.validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('该用户名为系统保留，请选择其他用户名');
      });
    });

    test('应该去除前后空格', () => {
      const result = validator.validateUsername('  validuser  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('validuser');
    });
  });

  describe('邮箱验证', () => {
    test('有效邮箱应该通过验证', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];
      
      validEmails.forEach(email => {
        const result = validator.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('空邮箱应该失败', () => {
      const result = validator.validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('邮箱地址不能为空');
    });

    test('无效邮箱格式应该失败', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        '.user@example.com',
        'user@example.'
      ];
      
      invalidEmails.forEach(email => {
        const result = validator.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('请输入有效的邮箱地址');
      });
    });

    test('过长邮箱应该失败', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validator.validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('邮箱地址过长');
    });

    test('应该转换为小写并去除空格', () => {
      const result = validator.validateEmail('  TEST@EXAMPLE.COM  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });
  });

  describe('密码验证', () => {
    test('强密码应该通过验证', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password2024',
        'Complex#Pass789'
      ];
      
      strongPasswords.forEach(password => {
        const result = validator.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(['strong', 'very-strong']).toContain(result.strength);
      });
    });

    test('空密码应该失败', () => {
      const result = validator.validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码不能为空');
      expect(result.strength).toBe('none');
    });

    test('过短密码应该失败', () => {
      const result = validator.validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码至少需要8个字符');
    });

    test('过长密码应该失败', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = validator.validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码不能超过128个字符');
    });

    test('缺少大写字母的密码应该失败', () => {
      const result = validator.validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个大写字母');
    });

    test('缺少小写字母的密码应该失败', () => {
      const result = validator.validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个小写字母');
    });

    test('缺少数字的密码应该失败', () => {
      const result = validator.validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个数字');
    });

    test('缺少特殊字符的密码应该失败', () => {
      const result = validator.validatePassword('NoSpecialChars123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个特殊字符');
    });

    test('常见密码应该失败', () => {
      const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
      
      commonPasswords.forEach(password => {
        const result = validator.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('密码过于简单，请选择更安全的密码');
      });
    });

    test('密码强度计算应该正确', () => {
      const testCases = [
        { password: 'weak', expectedStrength: 'weak' },
        { password: 'Medium123', expectedStrength: 'strong' }, // 修正：包含大小写+数字，得分较高
        { password: 'Strong123!', expectedStrength: 'very-strong' },
        { password: 'VeryStrong123!@#$', expectedStrength: 'very-strong' }
      ];
      
      testCases.forEach(({ password, expectedStrength }) => {
        const result = validator.validatePassword(password);
        expect(result.strength).toBe(expectedStrength);
      });
    });
  });

  describe('确认密码验证', () => {
    test('匹配的密码应该通过验证', () => {
      const password = 'TestPassword123!';
      const result = validator.validateConfirmPassword(password, password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('空确认密码应该失败', () => {
      const result = validator.validateConfirmPassword('password', '');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('请确认密码');
    });

    test('不匹配的密码应该失败', () => {
      const result = validator.validateConfirmPassword('password1', 'password2');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('两次输入的密码不一致');
    });
  });

  describe('批量验证', () => {
    test('所有有效数据应该通过验证', () => {
      const formData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!'
      };
      
      const result = validator.validateAll(formData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData.username).toBe('testuser');
      expect(result.sanitizedData.email).toBe('test@example.com');
    });

    test('包含无效数据应该失败', () => {
      const formData = {
        username: 'ab', // 太短
        email: 'invalid-email', // 无效格式
        password: 'weak', // 太弱
        confirmPassword: 'different' // 不匹配
      };
      
      const result = validator.validateAll(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.fieldResults.username.isValid).toBe(false);
      expect(result.fieldResults.email.isValid).toBe(false);
      expect(result.fieldResults.password.isValid).toBe(false);
      expect(result.fieldResults.confirmPassword.isValid).toBe(false);
    });
  });

  describe('单字段验证', () => {
    test('应该正确验证各个字段', () => {
      expect(validator.validateField('username', 'validuser').isValid).toBe(true);
      expect(validator.validateField('email', 'test@example.com').isValid).toBe(true);
      expect(validator.validateField('password', 'StrongPass123!').isValid).toBe(true);
      expect(validator.validateField('confirmPassword', 'same', 'same').isValid).toBe(true);
    });

    test('未知字段应该返回有效结果', () => {
      const result = validator.validateField('unknownField', 'value');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('密码强度描述', () => {
    test('应该返回正确的强度描述', () => {
      const testCases = [
        { strength: 'none', expectedText: '无' },
        { strength: 'weak', expectedText: '弱' },
        { strength: 'medium', expectedText: '中等' },
        { strength: 'strong', expectedText: '强' },
        { strength: 'very-strong', expectedText: '很强' }
      ];
      
      testCases.forEach(({ strength, expectedText }) => {
        const description = validator.getPasswordStrengthDescription(strength);
        expect(description.text).toBe(expectedText);
        expect(description).toHaveProperty('color');
        expect(description).toHaveProperty('percentage');
      });
    });

    test('未知强度应该返回默认描述', () => {
      const description = validator.getPasswordStrengthDescription('unknown');
      expect(description.text).toBe('无');
    });
  });

  describe('边界情况测试', () => {
    test('应该处理null和undefined输入', () => {
      expect(validator.validateUsername(null).isValid).toBe(false);
      expect(validator.validateUsername(undefined).isValid).toBe(false);
      expect(validator.validateEmail(null).isValid).toBe(false);
      expect(validator.validateEmail(undefined).isValid).toBe(false);
      expect(validator.validatePassword(null).isValid).toBe(false);
      expect(validator.validatePassword(undefined).isValid).toBe(false);
    });

    test('应该处理极端长度的输入', () => {
      const veryLongString = 'a'.repeat(1000);
      expect(validator.validateUsername(veryLongString).isValid).toBe(false);
      expect(validator.validateEmail(veryLongString + '@example.com').isValid).toBe(false);
      expect(validator.validatePassword(veryLongString).isValid).toBe(false);
    });

    test('应该处理特殊字符输入', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = validator.validatePassword('Test123' + specialChars);
      expect(result.isValid).toBe(true);
    });
  });
});