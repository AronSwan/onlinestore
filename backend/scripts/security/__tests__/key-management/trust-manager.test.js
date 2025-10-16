/**
 * 信任管理器单元测试
 *
 * 测试覆盖：
 * 1. 信任策略管理
 * 2. 指纹信任管理
 * 3. 信任验证和检查
 * 4. 信任撤销和恢复
 * 5. 信任策略应用
 * 6. 错误处理和边界情况
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const TrustManager = require('../../key-management/trust-manager');
const Config = require('../../shared/config');
const SecurityUtils = require('../../shared/security-utils');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 测试配置
const TEST_CONFIG = {
  trustStore: {
    path: path.join(__dirname, '../test-trust'),
    backupPath: path.join(__dirname, '../test-trust/backup'),
    maxTrustedKeys: 100,
    autoRevokeAfter: 30 * 24 * 60 * 60 * 1000, // 30天
  },
  security: {
    level: 'high',
    requireTrustedKeys: true,
  },
};

// 测试数据
const TEST_FINGERPRINT = 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678';
const TEST_KEY_NAME = 'test-trusted-key';

describe('信任管理器单元测试', () => {
  let trustManager;
  let config;
  let securityUtils;

  beforeAll(() => {
    config = new Config();
    securityUtils = new SecurityUtils();

    // 应用测试配置
    config.merge(TEST_CONFIG);
  });

  beforeEach(async () => {
    trustManager = new TrustManager();

    // 确保测试目录存在
    await fs.mkdir(TEST_CONFIG.trustStore.path, { recursive: true });
    await fs.mkdir(TEST_CONFIG.trustStore.backupPath, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(TEST_CONFIG.trustStore.path, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('信任策略管理', () => {
    test('应该添加信任策略', async () => {
      const policy = {
        name: 'test-policy',
        description: '测试信任策略',
        rules: [
          {
            type: 'fingerprint',
            value: TEST_FINGERPRINT,
            action: 'allow',
          },
        ],
        priority: 1,
      };

      const result = await trustManager.addTrustPolicy(policy);

      expect(result.success).toBe(true);
      expect(result.policyId).toBeDefined();
    });

    test('应该获取信任策略', async () => {
      const policy = {
        name: 'get-policy',
        description: '获取测试策略',
        rules: [
          {
            type: 'fingerprint',
            value: TEST_FINGERPRINT,
            action: 'allow',
          },
        ],
      };

      const addResult = await trustManager.addTrustPolicy(policy);
      const getResult = await trustManager.getTrustPolicy(addResult.policyId);

      expect(getResult).toBeDefined();
      expect(getResult.name).toBe('get-policy');
      expect(getResult.description).toBe('获取测试策略');
      expect(getResult.rules).toHaveLength(1);
    });

    test('应该更新信任策略', async () => {
      const policy = {
        name: 'update-policy',
        description: '原始描述',
        rules: [
          {
            type: 'fingerprint',
            value: TEST_FINGERPRINT,
            action: 'allow',
          },
        ],
      };

      const addResult = await trustManager.addTrustPolicy(policy);

      const updates = {
        description: '更新后的描述',
        rules: [
          {
            type: 'fingerprint',
            value: TEST_FINGERPRINT,
            action: 'deny', // 改为拒绝
          },
        ],
      };

      const updateResult = await trustManager.updateTrustPolicy(addResult.policyId, updates);

      expect(updateResult.success).toBe(true);

      const updatedPolicy = await trustManager.getTrustPolicy(addResult.policyId);
      expect(updatedPolicy.description).toBe('更新后的描述');
      expect(updatedPolicy.rules[0].action).toBe('deny');
    });

    test('应该删除信任策略', async () => {
      const policy = {
        name: 'delete-policy',
        description: '要删除的策略',
        rules: [
          {
            type: 'fingerprint',
            value: TEST_FINGERPRINT,
            action: 'allow',
          },
        ],
      };

      const addResult = await trustManager.addTrustPolicy(policy);

      // 验证策略存在
      const policyBefore = await trustManager.getTrustPolicy(addResult.policyId);
      expect(policyBefore).toBeDefined();

      // 删除策略
      const deleteResult = await trustManager.deleteTrustPolicy(addResult.policyId);
      expect(deleteResult.success).toBe(true);

      // 验证策略已删除
      await expect(trustManager.getTrustPolicy(addResult.policyId)).rejects.toThrow();
    });

    test('应该列出所有信任策略', async () => {
      const policies = [
        {
          name: 'policy-1',
          description: '策略1',
          rules: [{ type: 'fingerprint', value: 'fp1', action: 'allow' }],
        },
        {
          name: 'policy-2',
          description: '策略2',
          rules: [{ type: 'fingerprint', value: 'fp2', action: 'allow' }],
        },
      ];

      for (const policy of policies) {
        await trustManager.addTrustPolicy(policy);
      }

      const allPolicies = await trustManager.listTrustPolicies();

      expect(Array.isArray(allPolicies)).toBe(true);
      expect(allPolicies.length).toBeGreaterThanOrEqual(policies.length);

      // 验证策略名称存在
      const policyNames = allPolicies.map(p => p.name);
      policies.forEach(policy => {
        expect(policyNames).toContain(policy.name);
      });
    });

    test('应该应用信任策略', async () => {
      const policy = {
        name: 'application-policy',
        description: '应用测试策略',
        rules: [
          {
            type: 'fingerprint',
            value: TEST_FINGERPRINT,
            action: 'allow',
          },
        ],
      };

      await trustManager.addTrustPolicy(policy);

      const context = {
        fingerprint: TEST_FINGERPRINT,
        keyName: TEST_KEY_NAME,
        operation: 'sign',
      };

      const result = await trustManager.applyTrustPolicies(context);

      expect(result.allowed).toBe(true);
      expect(result.appliedPolicies).toHaveLength(1);
      expect(result.reason).toBe('指纹匹配允许规则');
    });
  });

  describe('指纹信任管理', () => {
    test('应该添加受信任指纹', async () => {
      const result = await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, {
        keyId: TEST_KEY_NAME,
        notes: '测试密钥',
      });

      expect(result.fingerprint).toBe(TEST_FINGERPRINT);

      // 验证指纹被信任
      const isTrusted = await trustManager.isFingerprintTrusted(TEST_FINGERPRINT);
      expect(isTrusted).toBe(true);
    });

    test('应该获取受信任指纹信息', async () => {
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, {
        keyId: TEST_KEY_NAME,
        notes: '测试密钥',
      });

      const fingerprintInfo = await trustManager.getTrustedFingerprint(TEST_FINGERPRINT);

      expect(fingerprintInfo).toBeDefined();
      expect(fingerprintInfo.fingerprint).toBe(TEST_FINGERPRINT);
      expect(fingerprintInfo.keyName).toBe(TEST_KEY_NAME);
      expect(fingerprintInfo.description).toBe('测试密钥');
      expect(fingerprintInfo.trustedSince).toBeDefined();
    });

    test('应该列出所有受信任指纹', async () => {
      const fingerprints = [
        {
          fingerprint: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
          keyId: 'key1',
        },
        {
          fingerprint: 'B2C3D4E5F67890123456789012345678901234567890123456789012345679',
          keyId: 'key2',
        },
        {
          fingerprint: 'C3D4E5F67890123456789012345678901234567890123456789012345679A',
          keyId: 'key3',
        },
      ];

      for (const fp of fingerprints) {
        await trustManager.addTrustedFingerprint(fp.fingerprint, { keyId: fp.keyId });
      }

      const trustedFingerprints = trustManager.listTrustedFingerprints();

      expect(Array.isArray(trustedFingerprints)).toBe(true);
      expect(trustedFingerprints.length).toBeGreaterThanOrEqual(fingerprints.length);

      // 验证所有添加的指纹都在列表中
      const fpList = trustedFingerprints.map(f => f.fingerprint);
      fingerprints.forEach(fp => {
        expect(fpList).toContain(fp.fingerprint);
      });
    });

    test('应该验证指纹信任状态', async () => {
      // 添加受信任指纹
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyId: TEST_KEY_NAME });

      // 验证信任状态
      const isTrusted = await trustManager.isFingerprintTrusted(TEST_FINGERPRINT);
      expect(isTrusted).toBe(true);

      // 验证不存在的指纹
      const nonExistentTrusted = await trustManager.isFingerprintTrusted(
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      );
      expect(nonExistentTrusted).toBe(false);
    });

    test('应该检查指纹是否被撤销', async () => {
      // 添加然后撤销指纹
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyName: TEST_KEY_NAME });
      await trustManager.revokeFingerprint(TEST_FINGERPRINT, '测试撤销');

      const isRevoked = await trustManager.isFingerprintRevoked(TEST_FINGERPRINT);
      expect(isRevoked).toBe(true);
    });

    test('应该批量管理指纹信任', async () => {
      const fingerprints = [
        {
          fingerprint: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
          keyId: 'batch-key-1',
        },
        {
          fingerprint: 'B2C3D4E5F67890123456789012345678901234567890123456789012345679',
          keyId: 'batch-key-2',
        },
        {
          fingerprint: 'C3D4E5F67890123456789012345678901234567890123456789012345679A',
          keyId: 'batch-key-3',
        },
      ];

      // 批量添加
      const addResult = await trustManager.addTrustedFingerprints(fingerprints);
      expect(addResult.addedCount).toBe(fingerprints.length);
      expect(addResult.failedCount).toBe(0);

      // 验证批量添加
      for (const fp of fingerprints) {
        const isTrusted = await trustManager.isFingerprintTrusted(fp.fingerprint);
        expect(isTrusted).toBe(true);
      }

      // 批量撤销
      const fingerprintsToRevoke = fingerprints.map(f => f.fingerprint);
      const revokeResult = await trustManager.revokeFingerprints(
        fingerprintsToRevoke,
        '批量撤销测试',
      );

      expect(revokeResult.revokedCount).toBe(fingerprints.length);

      // 验证批量撤销
      for (const fp of fingerprints) {
        const isRevoked = await trustManager.isFingerprintRevoked(fp.fingerprint);
        expect(isRevoked).toBe(true);
      }
    });
  });

  describe('信任验证和检查', () => {
    beforeEach(async () => {
      // 添加一些测试指纹
      await trustManager.addTrustedFingerprint(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        { keyId: 'trusted-key-1' },
      );
      await trustManager.addTrustedFingerprint(
        'B2C3D4E5F67890123456789012345678901234567890123456789012345679',
        { keyId: 'trusted-key-2' },
      );
      await trustManager.addTrustedFingerprint(
        'C3D4E5F67890123456789012345678901234567890123456789012345679A',
        { keyId: 'revoked-key' },
      );
      await trustManager.revokeFingerprint(
        'C3D4E5F67890123456789012345678901234567890123456789012345679A',
        '测试撤销',
      );
    });

    test('应该验证密钥信任', async () => {
      const publicKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      }).publicKey;

      // 计算指纹并添加信任
      const fingerprint = SecurityUtils.generateFingerprint(publicKey);
      await trustManager.addTrustedFingerprint(fingerprint, { keyId: 'test-key' });

      const trustResult = await trustManager.verifyKeyTrust(publicKey);

      expect(trustResult.trusted).toBe(true);
      expect(trustResult.fingerprint).toBe(fingerprint);
      expect(trustResult.reason).toBe('指纹受信任');
    });

    test('应该检查未受信任的密钥', async () => {
      const publicKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      }).publicKey;

      const trustResult = await trustManager.verifyKeyTrust(publicKey);

      expect(trustResult.trusted).toBe(false);
      expect(trustResult.reason).toBe('指纹未受信任');
    });

    test('应该检查被撤销的密钥', async () => {
      const publicKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      }).publicKey;

      // 计算指纹，添加信任然后撤销
      const fingerprint = SecurityUtils.generateFingerprint(publicKey);
      await trustManager.addTrustedFingerprint(fingerprint, { keyId: 'revoked-test-key' });
      await trustManager.revokeFingerprint(fingerprint, '测试撤销');

      const trustResult = await trustManager.verifyKeyTrust(publicKey);

      expect(trustResult.trusted).toBe(false);
      expect(trustResult.reason).toContain('撤销');
    });

    test('应该执行深度信任验证', async () => {
      const context = {
        fingerprint: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        keyName: 'trusted-key-1',
        operation: 'sign',
        data: 'important-data',
        requireDeepValidation: true,
      };

      const validationResult = await trustManager.deepTrustValidation(context);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.trustLevel).toBe('high');
      expect(validationResult.checks).toContain('fingerprint_trust');
      expect(validationResult.checks).toContain('revocation_status');
    });

    test('应该计算信任分数', async () => {
      const context = {
        fingerprint: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        keyName: 'trusted-key-1',
        age: 30, // 天
        usageCount: 100,
        lastUsed: new Date().toISOString(),
      };

      const trustScore = await trustManager.calculateTrustScore(context);

      expect(trustScore.score).toBeGreaterThan(0);
      expect(trustScore.score).toBeLessThanOrEqual(100);
      expect(trustScore.factors).toBeDefined();
      expect(trustScore.level).toMatch(/^(low|medium|high|very high)$/);
    });
  });

  describe('信任撤销和恢复', () => {
    test('应该撤销指纹信任', async () => {
      // 先添加信任
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyId: TEST_KEY_NAME });

      // 验证信任状态
      let isTrusted = await trustManager.isFingerprintTrusted(TEST_FINGERPRINT);
      expect(isTrusted).toBe(true);

      // 撤销信任
      const revokeResult = await trustManager.revokeFingerprint(TEST_FINGERPRINT, '安全原因撤销');

      expect(revokeResult.revokedAt).toBeDefined();
      expect(revokeResult.reason).toBe('安全原因撤销');

      // 验证信任状态已改变
      isTrusted = await trustManager.isFingerprintTrusted(TEST_FINGERPRINT);
      expect(isTrusted).toBe(false);

      // 验证撤销状态
      const isRevoked = await trustManager.isFingerprintRevoked(TEST_FINGERPRINT);
      expect(isRevoked).toBe(true);
    });

    test('应该恢复被撤销的指纹', async () => {
      // 添加然后撤销
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyId: TEST_KEY_NAME });
      await trustManager.revokeFingerprint(TEST_FINGERPRINT, '测试撤销');

      // 验证撤销状态
      let isRevoked = await trustManager.isFingerprintRevoked(TEST_FINGERPRINT);
      expect(isRevoked).toBe(true);

      // 恢复信任
      const restoreResult = await trustManager.restoreFingerprint(
        TEST_FINGERPRINT,
        '误撤销，现在恢复',
      );

      expect(restoreResult.success).toBe(true);

      // 验证恢复状态
      isRevoked = await trustManager.isFingerprintRevoked(TEST_FINGERPRINT);
      expect(isRevoked).toBe(false);

      const isTrusted = await trustManager.isFingerprintTrusted(TEST_FINGERPRINT);
      expect(isTrusted).toBe(true);
    });

    test('应该获取撤销历史', async () => {
      // 添加、撤销、恢复以创建历史
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyId: TEST_KEY_NAME });
      await trustManager.revokeFingerprint(TEST_FINGERPRINT, '第一次撤销');
      await trustManager.restoreFingerprint(TEST_FINGERPRINT, '第一次恢复');
      await trustManager.revokeFingerprint(TEST_FINGERPRINT, '第二次撤销');

      const revocationHistory = await trustManager.getRevocationHistory(TEST_FINGERPRINT);

      expect(Array.isArray(revocationHistory)).toBe(true);
      expect(revocationHistory.length).toBe(2); // 两次撤销

      // 验证历史记录内容
      revocationHistory.forEach(record => {
        expect(record.fingerprint).toBe(TEST_FINGERPRINT);
        expect(record.action).toBe('revoke');
        expect(record.reason).toBeDefined();
        expect(record.timestamp).toBeDefined();
      });
    });

    test('应该自动撤销过期信任', async () => {
      // 添加一个很快过期的信任
      const shortLivedFingerprint =
        'D4E5F678901234567890123456789012345678901234567890123456789ABCD';
      await trustManager.addTrustedFingerprint(shortLivedFingerprint, {
        keyId: 'short-lived-key',
        expiresAt: new Date(Date.now() + 1000).toISOString(), // 1秒后过期
      });

      // 立即验证信任状态
      let isTrusted = await trustManager.isFingerprintTrusted(shortLivedFingerprint);
      expect(isTrusted).toBe(true);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 触发自动清理
      await trustManager.cleanupExpiredTrust();

      // 验证信任已自动撤销
      isTrusted = await trustManager.isFingerprintTrusted(shortLivedFingerprint);
      expect(isTrusted).toBe(false);

      const isRevoked = await trustManager.isFingerprintRevoked(shortLivedFingerprint);
      expect(isRevoked).toBe(true);
    });

    test('应该永久撤销指纹', async () => {
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyId: TEST_KEY_NAME });

      const permanentRevokeResult = await trustManager.permanentlyRevokeFingerprint(
        TEST_FINGERPRINT,
        '安全漏洞，永久撤销',
      );

      expect(permanentRevokeResult.success).toBe(true);
      expect(permanentRevokeResult.permanent).toBe(true);

      // 验证永久撤销状态
      const isPermanentlyRevoked =
        await trustManager.isFingerprintPermanentlyRevoked(TEST_FINGERPRINT);
      expect(isPermanentlyRevoked).toBe(true);

      // 尝试恢复应该失败
      const restoreResult = await trustManager.restoreFingerprint(TEST_FINGERPRINT, '尝试恢复');
      expect(restoreResult.success).toBe(false);
    });
  });

  describe('信任策略应用', () => {
    test('应该根据策略评估操作', async () => {
      // 创建允许特定操作的策略
      const allowPolicy = {
        name: 'allow-signing',
        description: '允许签名操作',
        rules: [
          {
            type: 'operation',
            value: 'sign',
            action: 'allow',
          },
        ],
      };

      await trustManager.addTrustPolicy(allowPolicy);

      const context = {
        fingerprint: TEST_FINGERPRINT,
        keyName: TEST_KEY_NAME,
        operation: 'sign',
      };

      const evaluation = await trustManager.evaluateOperation(context);

      expect(evaluation.allowed).toBe(true);
      expect(evaluation.reason).toBe('操作匹配允许规则');
    });

    test('应该根据策略拒绝操作', async () => {
      // 创建拒绝特定操作的策略
      const denyPolicy = {
        name: 'deny-export',
        description: '拒绝导出操作',
        rules: [
          {
            type: 'operation',
            value: 'export',
            action: 'deny',
          },
        ],
      };

      await trustManager.addTrustPolicy(denyPolicy);

      const context = {
        fingerprint: TEST_FINGERPRINT,
        keyName: TEST_KEY_NAME,
        operation: 'export',
      };

      const evaluation = await trustManager.evaluateOperation(context);

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.reason).toBe('操作匹配拒绝规则');
    });

    test('应该处理策略冲突', async () => {
      // 创建冲突的策略
      const allowPolicy = {
        name: 'allow-all',
        description: '允许所有操作',
        rules: [
          {
            type: 'operation',
            value: '*',
            action: 'allow',
          },
        ],
        priority: 1,
      };

      const denyPolicy = {
        name: 'deny-sign',
        description: '拒绝签名操作',
        rules: [
          {
            type: 'operation',
            value: 'sign',
            action: 'deny',
          },
        ],
        priority: 2, // 更高优先级
      };

      await trustManager.addTrustPolicy(allowPolicy);
      await trustManager.addTrustPolicy(denyPolicy);

      const context = {
        fingerprint: TEST_FINGERPRINT,
        keyName: TEST_KEY_NAME,
        operation: 'sign',
      };

      const evaluation = await trustManager.evaluateOperation(context);

      // 更高优先级的拒绝策略应该生效
      expect(evaluation.allowed).toBe(false);
      expect(evaluation.reason).toContain('更高优先级');
    });

    test('应该应用默认策略', async () => {
      // 不添加任何特定策略，测试默认行为
      const context = {
        fingerprint: TEST_FINGERPRINT,
        keyName: TEST_KEY_NAME,
        operation: 'verify',
      };

      const evaluation = await trustManager.evaluateOperation(context);

      // 默认情况下，验证操作应该被允许
      expect(evaluation.allowed).toBe(true);
      expect(evaluation.reason).toBe('默认策略允许');
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理无效的指纹格式', async () => {
      const invalidFingerprint = 'invalid-fingerprint-format';

      await expect(
        trustManager.addTrustedFingerprint(invalidFingerprint, { keyName: 'test-key' }),
      ).rejects.toThrow();
    });

    test('应该处理重复的指纹添加', async () => {
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyName: TEST_KEY_NAME });

      // 尝试重复添加相同的指纹
      await expect(
        trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyName: 'different-key' }),
      ).rejects.toThrow();
    });

    test('应该处理撤销不存在的指纹', async () => {
      await expect(
        trustManager.revokeFingerprint('nonexistent-fingerprint', '测试撤销'),
      ).rejects.toThrow();
    });

    test('应该处理恢复未撤销的指纹', async () => {
      await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, { keyName: TEST_KEY_NAME });

      // 尝试恢复未撤销的指纹
      await expect(
        trustManager.restoreFingerprint(TEST_FINGERPRINT, '不需要恢复'),
      ).rejects.toThrow();
    });

    test('应该处理存储限制', async () => {
      // 设置很小的最大信任密钥数
      await trustManager.setMaxTrustedKeys(2);

      // 添加两个指纹
      await trustManager.addTrustedFingerprint(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        { keyName: 'key1' },
      );
      await trustManager.addTrustedFingerprint(
        'B2C3D4E5F67890123456789012345678901234567890123456789012345679',
        { keyName: 'key2' },
      );

      // 尝试添加第三个应该失败
      await expect(
        trustManager.addTrustedFingerprint(
          'C3D4E5F67890123456789012345678901234567890123456789012345679A',
          { keyName: 'key3' },
        ),
      ).rejects.toThrow();
    });

    test('应该从错误状态恢复', async () => {
      // 模拟一个错误（例如无效的策略规则）
      const invalidPolicy = {
        name: 'invalid-policy',
        description: '无效策略',
        rules: [
          {
            type: 'invalid-type',
            value: 'test',
            action: 'invalid-action',
          },
        ],
      };

      await expect(trustManager.addTrustPolicy(invalidPolicy)).rejects.toThrow();

      // 验证信任管理器仍然可以正常使用
      const validResult = await trustManager.addTrustedFingerprint(TEST_FINGERPRINT, {
        keyName: TEST_KEY_NAME,
      });
      expect(validResult.success).toBe(true);
    });
  });

  describe('性能测试', () => {
    test('应该高效处理大量信任记录', async () => {
      const startTime = Date.now();
      const recordCount = 50;

      // 添加大量信任记录
      const promises = [];
      for (let i = 0; i < recordCount; i++) {
        const fingerprint =
          `A1B2C3D4E5F678901234567890123456789012345678901234567890123${i.toString().padStart(2, '0')}`.padEnd(
            64,
            '0',
          );
        const keyName = `perf-key-${i}`;
        promises.push(trustManager.addTrustedFingerprint(fingerprint, { keyName }));
      }

      await Promise.all(promises);
      const addTime = Date.now() - startTime;

      // 验证所有记录都已添加
      const trustedFingerprints = await trustManager.listTrustedFingerprints();
      expect(trustedFingerprints.length).toBeGreaterThanOrEqual(recordCount);

      // 性能检查：50个记录应该在合理时间内完成
      expect(addTime).toBeLessThan(5000);
    });

    test('应该高效验证信任', async () => {
      // 添加一些测试指纹
      const testFingerprints = [];
      for (let i = 0; i < 10; i++) {
        const fingerprint =
          `A1B2C3D4E5F678901234567890123456789012345678901234567890123${i.toString().padStart(2, '0')}`.padEnd(
            64,
            '0',
          );
        await trustManager.addTrustedFingerprint(fingerprint, { keyName: `verify-key-${i}` });
        testFingerprints.push(fingerprint);
      }

      const startTime = Date.now();

      // 执行多次信任验证
      const verifyPromises = testFingerprints.map(fp => trustManager.isFingerprintTrusted(fp));

      const results = await Promise.all(verifyPromises);
      const verifyTime = Date.now() - startTime;

      // 验证所有结果都为true
      results.forEach(result => {
        expect(result).toBe(true);
      });

      // 验证操作在合理时间内完成
      expect(verifyTime).toBeLessThan(1000);
    });
  });

  describe('数据持久化', () => {
    test('应该保存和加载信任状态', async () => {
      // 添加一些信任数据
      await trustManager.addTrustedFingerprint(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        { keyName: 'save-key-1' },
      );
      await trustManager.addTrustedFingerprint(
        'B2C3D4E5F67890123456789012345678901234567890123456789012345679',
        { keyName: 'save-key-2' },
      );
      await trustManager.revokeFingerprint(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        '测试保存',
      );

      // 保存状态
      const saveResult = await trustManager.saveTrustState();
      expect(saveResult.success).toBe(true);
      expect(saveResult.filePath).toBeDefined();

      // 创建新的信任管理器并加载状态
      const newTrustManager = new TrustManager();
      await newTrustManager.loadTrustState(saveResult.filePath);

      // 验证状态已加载
      const isTrusted1 = await newTrustManager.isFingerprintTrusted(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
      );
      const isTrusted2 = await newTrustManager.isFingerprintTrusted(
        'B2C3D4E5F67890123456789012345678901234567890123456789012345679',
      );
      const isRevoked1 = await newTrustManager.isFingerprintRevoked(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
      );

      expect(isTrusted1).toBe(false);
      expect(isTrusted2).toBe(true);
      expect(isRevoked1).toBe(true);
    });

    test('应该备份和恢复信任数据', async () => {
      // 添加测试数据
      await trustManager.addTrustedFingerprint(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        { keyName: 'backup-key' },
      );

      // 创建备份
      const backupResult = await trustManager.createBackup();
      expect(backupResult.success).toBe(true);
      expect(backupResult.backupPath).toBeDefined();

      // 修改数据
      await trustManager.revokeFingerprint(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        '测试修改',
      );

      // 从备份恢复
      const restoreResult = await trustManager.restoreFromBackup(backupResult.backupPath);
      expect(restoreResult.success).toBe(true);

      // 验证数据已恢复（指纹应该仍然是受信任的）
      const isTrusted = await trustManager.isFingerprintTrusted(
        'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
      );
      expect(isTrusted).toBe(true);
    });
  });
});
