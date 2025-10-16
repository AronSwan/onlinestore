/**
 * 多签名单元测试
 *
 * 测试覆盖：
 * 1. 多签名会话管理
 * 2. 多签名收集和验证
 * 3. 阈值签名验证
 * 4. 会话状态管理
 * 5. 错误处理和边界情况
 * 6. 性能测试
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const { MultiSignature } = require('../../signature-service/multi-signature');
const { Signer } = require('../../signature-service/signer');
const { Verifier } = require('../../signature-service/verifier');
const { KeyManager } = require('../../key-management/key-manager');
const { TrustManager } = require('../../key-management/trust-manager');
const { Config } = require('../../shared/config');
const { SecurityUtils } = require('../../shared/security-utils');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 测试配置
const TEST_CONFIG = {
  keyStorage: {
    path: path.join(__dirname, '../test-keys'),
    backupPath: path.join(__dirname, '../test-keys/backup'),
  },
  multiSignature: {
    sessionTimeout: 300000, // 5分钟
    maxParticipants: 10,
    defaultThreshold: 2,
    maxThreshold: 5,
  },
  security: {
    level: 'high',
    minPassphraseLength: 16,
    enforceStrongPassphrase: true,
  },
};

// 测试数据
const TEST_PASSPHRASE = 'TestPassphrase123!@#';
const TEST_DATA = 'Hello, World! This is test data for multi-signature verification.';
const TEST_SESSION_ID = 'test-multi-signature-session';

describe('多签名单元测试', () => {
  let multiSignature;
  let signer;
  let verifier;
  let keyManager;
  let trustManager;
  let config;
  let securityUtils;
  const testKeys = [];

  beforeAll(async () => {
    config = new Config();
    securityUtils = new SecurityUtils();

    // 应用测试配置
    config.merge(TEST_CONFIG);

    // 初始化密钥管理器
    keyManager = new KeyManager();
    trustManager = new TrustManager();
    await fs.mkdir(TEST_CONFIG.keyStorage.path, { recursive: true });

    // 生成多个测试密钥
    const keyNames = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5'];

    for (const keyName of keyNames) {
      const keyParams = {
        name: keyName,
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };

      const keyInfo = await keyManager.generateKey(keyParams);
      testKeys.push({
        name: keyName,
        info: keyInfo,
      });

      // 将测试密钥添加到信任管理器
      await trustManager.addTrustedFingerprint(keyInfo.fingerprint, {
        keyName: keyName,
        description: `测试多签名密钥 ${keyName}`,
      });
    }
  });

  beforeEach(async () => {
    multiSignature = new MultiSignature();
    signer = new Signer();
    verifier = new Verifier();
  });

  afterEach(async () => {
    // 清理测试会话
    try {
      await multiSignature.cleanupExpiredSessions();
    } catch (error) {
      // 忽略清理错误
    }
  });

  afterAll(async () => {
    // 清理测试目录
    try {
      await fs.rm(TEST_CONFIG.keyStorage.path, { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '../test-multi-signatures'), {
        recursive: true,
        force: true,
      });
      await fs.rm(path.join(__dirname, '../test-trust'), { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('多签名会话管理', () => {
    test('应该成功创建多签名会话', async () => {
      const sessionParams = {
        sessionId: TEST_SESSION_ID,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      const session = await multiSignature.createSession(sessionParams);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(TEST_SESSION_ID);
      expect(session.data).toBe(TEST_DATA);
      expect(session.threshold).toBe(2);
      expect(session.participants).toHaveLength(3);
      expect(session.status).toBe('pending');
      expect(session.createdAt).toBeDefined();
      expect(session.expiresAt).toBeDefined();
    });

    test('应该获取会话信息', async () => {
      const sessionParams = {
        sessionId: TEST_SESSION_ID,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);
      const session = await multiSignature.getSession(TEST_SESSION_ID);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(TEST_SESSION_ID);
      expect(session.threshold).toBe(2);
      expect(session.participants).toHaveLength(3);
    });

    test('应该列出所有活动会话', async () => {
      const session1Params = {
        sessionId: 'session-1',
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 2).map(k => k.name),
      };

      const session2Params = {
        sessionId: 'session-2',
        data: TEST_DATA + '2',
        threshold: 3,
        participants: testKeys.slice(0, 4).map(k => k.name),
      };

      await multiSignature.createSession(session1Params);
      await multiSignature.createSession(session2Params);

      const sessions = await multiSignature.listSessions();

      expect(sessions).toBeDefined();
      expect(sessions.length).toBeGreaterThanOrEqual(2);

      const session1 = sessions.find(s => s.sessionId === 'session-1');
      const session2 = sessions.find(s => s.sessionId === 'session-2');

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
      expect(session1.threshold).toBe(2);
      expect(session2.threshold).toBe(3);
    });

    test('应该更新会话状态', async () => {
      const sessionParams = {
        sessionId: TEST_SESSION_ID,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 更新会话状态
      await multiSignature.updateSessionStatus(TEST_SESSION_ID, 'collecting');

      const session = await multiSignature.getSession(TEST_SESSION_ID);
      expect(session.status).toBe('collecting');

      // 再次更新状态
      await multiSignature.updateSessionStatus(TEST_SESSION_ID, 'completed');
      const updatedSession = await multiSignature.getSession(TEST_SESSION_ID);
      expect(updatedSession.status).toBe('completed');
    });

    test('应该删除会话', async () => {
      const sessionParams = {
        sessionId: 'temp-session',
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 2).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 验证会话存在
      const session = await multiSignature.getSession('temp-session');
      expect(session).toBeDefined();

      // 删除会话
      await multiSignature.deleteSession('temp-session');

      // 验证会话已被删除
      await expect(multiSignature.getSession('temp-session')).rejects.toThrow();
    });

    test('应该清理过期会话', async () => {
      // 创建一个立即过期的会话
      const expiredSessionParams = {
        sessionId: 'expired-session',
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 2).map(k => k.name),
        timeout: 1, // 1ms后过期
      };

      await multiSignature.createSession(expiredSessionParams);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10));

      // 清理过期会话
      const cleanupResult = await multiSignature.cleanupExpiredSessions();

      expect(cleanupResult.cleanedCount).toBeGreaterThan(0);

      // 验证过期会话已被删除
      await expect(multiSignature.getSession('expired-session')).rejects.toThrow();
    });

    test('应该验证会话完整性', async () => {
      const sessionParams = {
        sessionId: TEST_SESSION_ID,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      const integrity = await multiSignature.verifySessionIntegrity(TEST_SESSION_ID);

      expect(integrity.valid).toBe(true);
      expect(integrity.sessionId).toBe(TEST_SESSION_ID);
      expect(integrity.dataHash).toBeDefined();
      expect(integrity.participantsCount).toBe(3);
      expect(integrity.thresholdMet).toBe(false);
    });
  });

  describe('多签名收集和验证', () => {
    let testSessionId;

    beforeEach(async () => {
      testSessionId = `test-session-${Date.now()}`;

      const sessionParams = {
        sessionId: testSessionId,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);
    });

    test('应该收集多个签名', async () => {
      // 第一个参与者签名
      const signature1 = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      const collectParams1 = {
        sessionId: testSessionId,
        signature: signature1,
        keyName: 'key-1',
      };

      const result1 = await multiSignature.collectSignature(collectParams1);

      expect(result1.collected).toBe(true);
      expect(result1.currentCount).toBe(1);
      expect(result1.thresholdMet).toBe(false);
      expect(result1.pendingParticipants).toHaveLength(2);

      // 第二个参与者签名
      const signature2 = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-2',
        format: 'json',
      });

      const collectParams2 = {
        sessionId: testSessionId,
        signature: signature2,
        keyName: 'key-2',
      };

      const result2 = await multiSignature.collectSignature(collectParams2);

      expect(result2.collected).toBe(true);
      expect(result2.currentCount).toBe(2);
      expect(result2.thresholdMet).toBe(true); // 达到阈值
      expect(result2.pendingParticipants).toHaveLength(1);
    });

    test('应该拒绝无效签名', async () => {
      const invalidSignature = 'invalid-signature-data';

      const collectParams = {
        sessionId: testSessionId,
        signature: invalidSignature,
        keyName: 'key-1',
      };

      await expect(multiSignature.collectSignature(collectParams)).rejects.toThrow();
    });

    test('应该拒绝非参与者的签名', async () => {
      const signature = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-4', // key-4不在参与者列表中
        format: 'json',
      });

      const collectParams = {
        sessionId: testSessionId,
        signature: signature,
        keyName: 'key-4',
      };

      await expect(multiSignature.collectSignature(collectParams)).rejects.toThrow();
    });

    test('应该拒绝重复签名', async () => {
      const signature = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      const collectParams = {
        sessionId: testSessionId,
        signature: signature,
        keyName: 'key-1',
      };

      // 第一次收集应该成功
      await multiSignature.collectSignature(collectParams);

      // 第二次收集应该失败
      await expect(multiSignature.collectSignature(collectParams)).rejects.toThrow();
    });

    test('应该获取收集的签名列表', async () => {
      // 收集两个签名
      const signature1 = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      const signature2 = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-2',
        format: 'json',
      });

      await multiSignature.collectSignature({
        sessionId: testSessionId,
        signature: signature1,
        keyName: 'key-1',
      });

      await multiSignature.collectSignature({
        sessionId: testSessionId,
        signature: signature2,
        keyName: 'key-2',
      });

      const signatures = await multiSignature.getCollectedSignatures(testSessionId);

      expect(signatures).toBeDefined();
      expect(signatures).toHaveLength(2);
      expect(signatures[0].keyName).toBe('key-1');
      expect(signatures[1].keyName).toBe('key-2');
      expect(signatures[0].collectedAt).toBeDefined();
      expect(signatures[1].collectedAt).toBeDefined();
    });

    test('应该验证多签名组合', async () => {
      // 收集两个签名
      const signature1 = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      const signature2 = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-2',
        format: 'json',
      });

      await multiSignature.collectSignature({
        sessionId: testSessionId,
        signature: signature1,
        keyName: 'key-1',
      });

      await multiSignature.collectSignature({
        sessionId: testSessionId,
        signature: signature2,
        keyName: 'key-2',
      });

      const verification = await multiSignature.verifyMultiSignature(testSessionId);

      expect(verification.valid).toBe(true);
      expect(verification.sessionId).toBe(testSessionId);
      expect(verification.threshold).toBe(2);
      expect(verification.actualCount).toBe(2);
      expect(verification.thresholdMet).toBe(true);
      expect(verification.verifiedSignatures).toHaveLength(2);
      expect(verification.failedSignatures).toHaveLength(0);
    });

    test('应该处理部分签名验证失败', async () => {
      // 收集一个有效签名和一个无效签名
      const validSignature = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      const invalidSignature = 'corrupted-signature-data';

      // 手动添加无效签名到会话（绕过正常收集验证）
      const session = await multiSignature.getSession(testSessionId);
      session.collectedSignatures.push({
        keyName: 'key-2',
        signature: invalidSignature,
        collectedAt: new Date(),
      });
      await multiSignature.updateSession(testSessionId, session);

      const verification = await multiSignature.verifyMultiSignature(testSessionId);

      expect(verification.valid).toBe(false); // 因为有无效签名
      expect(verification.actualCount).toBe(2);
      expect(verification.verifiedSignatures).toHaveLength(1);
      expect(verification.failedSignatures).toHaveLength(1);
      expect(verification.failedSignatures[0].keyName).toBe('key-2');
      expect(verification.failedSignatures[0].error).toBeDefined();
    });
  });

  describe('阈值签名验证', () => {
    test('应该验证达到阈值的签名', async () => {
      const sessionId = `threshold-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 收集刚好达到阈值的签名
      for (let i = 0; i < 2; i++) {
        const signature = await signer.sign({
          data: TEST_DATA,
          keyName: testKeys[i].name,
          format: 'json',
        });

        await multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: testKeys[i].name,
        });
      }

      const thresholdCheck = await multiSignature.checkThreshold(sessionId);

      expect(thresholdCheck.thresholdMet).toBe(true);
      expect(thresholdCheck.currentCount).toBe(2);
      expect(thresholdCheck.threshold).toBe(2);
      expect(thresholdCheck.remainingRequired).toBe(0);
    });

    test('应该验证未达到阈值的签名', async () => {
      const sessionId = `below-threshold-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 3,
        participants: testKeys.slice(0, 4).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 只收集2个签名，阈值是3
      for (let i = 0; i < 2; i++) {
        const signature = await signer.sign({
          data: TEST_DATA,
          keyName: testKeys[i].name,
          format: 'json',
        });

        await multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: testKeys[i].name,
        });
      }

      const thresholdCheck = await multiSignature.checkThreshold(sessionId);

      expect(thresholdCheck.thresholdMet).toBe(false);
      expect(thresholdCheck.currentCount).toBe(2);
      expect(thresholdCheck.threshold).toBe(3);
      expect(thresholdCheck.remainingRequired).toBe(1);
    });

    test('应该验证超过阈值的签名', async () => {
      const sessionId = `above-threshold-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 4).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 收集3个签名，阈值是2
      for (let i = 0; i < 3; i++) {
        const signature = await signer.sign({
          data: TEST_DATA,
          keyName: testKeys[i].name,
          format: 'json',
        });

        await multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: testKeys[i].name,
        });
      }

      const thresholdCheck = await multiSignature.checkThreshold(sessionId);

      expect(thresholdCheck.thresholdMet).toBe(true);
      expect(thresholdCheck.currentCount).toBe(3);
      expect(thresholdCheck.threshold).toBe(2);
      expect(thresholdCheck.remainingRequired).toBe(0);
      expect(thresholdCheck.excessCount).toBe(1);
    });

    test('应该验证所有参与者都签名的场景', async () => {
      const sessionId = `all-participants-test-${Date.now()}`;
      const participants = testKeys.slice(0, 3).map(k => k.name);

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: participants.length, // 要求所有参与者都签名
        participants: participants,
      };

      await multiSignature.createSession(sessionParams);

      // 所有参与者都签名
      for (const keyName of participants) {
        const signature = await signer.sign({
          data: TEST_DATA,
          keyName: keyName,
          format: 'json',
        });

        await multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: keyName,
        });
      }

      const thresholdCheck = await multiSignature.checkThreshold(sessionId);

      expect(thresholdCheck.thresholdMet).toBe(true);
      expect(thresholdCheck.currentCount).toBe(participants.length);
      expect(thresholdCheck.threshold).toBe(participants.length);
      expect(thresholdCheck.remainingRequired).toBe(0);
      expect(thresholdCheck.allParticipantsSigned).toBe(true);
    });
  });

  describe('会话状态管理', () => {
    test('应该跟踪会话进度', async () => {
      const sessionId = `progress-test-${Date.now()}`;
      const participants = testKeys.slice(0, 4).map(k => k.name);

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 3,
        participants: participants,
      };

      await multiSignature.createSession(sessionParams);

      // 收集部分签名
      for (let i = 0; i < 2; i++) {
        const signature = await signer.sign({
          data: TEST_DATA,
          keyName: participants[i],
          format: 'json',
        });

        await multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: participants[i],
        });
      }

      const progress = await multiSignature.getSessionProgress(sessionId);

      expect(progress.sessionId).toBe(sessionId);
      expect(progress.totalParticipants).toBe(4);
      expect(progress.collectedCount).toBe(2);
      expect(progress.threshold).toBe(3);
      expect(progress.percentage).toBe(50); // 2/4 = 50%
      expect(progress.thresholdPercentage).toBe(66.67); // 2/3 ≈ 66.67%
      expect(progress.remainingForThreshold).toBe(1);
      expect(progress.thresholdMet).toBe(false);
    });

    test('应该完成会话', async () => {
      const sessionId = `completion-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 收集达到阈值的签名
      for (let i = 0; i < 2; i++) {
        const signature = await signer.sign({
          data: TEST_DATA,
          keyName: testKeys[i].name,
          format: 'json',
        });

        await multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: testKeys[i].name,
        });
      }

      // 完成会话
      const completionResult = await multiSignature.completeSession(sessionId);

      expect(completionResult.completed).toBe(true);
      expect(completionResult.sessionId).toBe(sessionId);
      expect(completionResult.finalCount).toBe(2);
      expect(completionResult.thresholdMet).toBe(true);

      // 验证会话状态已更新
      const session = await multiSignature.getSession(sessionId);
      expect(session.status).toBe('completed');
      expect(session.completedAt).toBeDefined();
    });

    test('应该取消会话', async () => {
      const sessionId = `cancellation-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 取消会话
      const cancellationResult = await multiSignature.cancelSession(sessionId, '测试取消');

      expect(cancellationResult.cancelled).toBe(true);
      expect(cancellationResult.sessionId).toBe(sessionId);
      expect(cancellationResult.reason).toBe('测试取消');

      // 验证会话状态已更新
      const session = await multiSignature.getSession(sessionId);
      expect(session.status).toBe('cancelled');
      expect(session.cancelledAt).toBeDefined();
      expect(session.cancellationReason).toBe('测试取消');
    });

    test('应该重置会话', async () => {
      const sessionId = `reset-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 3).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 收集一些签名
      const signature = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      await multiSignature.collectSignature({
        sessionId: sessionId,
        signature: signature,
        keyName: 'key-1',
      });

      // 验证有收集的签名
      let signatures = await multiSignature.getCollectedSignatures(sessionId);
      expect(signatures).toHaveLength(1);

      // 重置会话
      const resetResult = await multiSignature.resetSession(sessionId);

      expect(resetResult.reset).toBe(true);
      expect(resetResult.sessionId).toBe(sessionId);
      expect(resetResult.clearedSignatures).toBe(1);

      // 验证签名已被清除
      signatures = await multiSignature.getCollectedSignatures(sessionId);
      expect(signatures).toHaveLength(0);

      // 验证会话状态已重置
      const session = await multiSignature.getSession(sessionId);
      expect(session.status).toBe('pending');
      expect(session.collectedSignatures).toHaveLength(0);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理不存在的会话', async () => {
      await expect(multiSignature.getSession('non-existent-session')).rejects.toThrow();
    });

    test('应该处理无效的会话参数', async () => {
      const invalidParams = {
        sessionId: '',
        data: TEST_DATA,
        threshold: 2,
        participants: [],
      };

      await expect(multiSignature.createSession(invalidParams)).rejects.toThrow();
    });

    test('应该处理阈值大于参与者数量的情况', async () => {
      const invalidParams = {
        sessionId: 'invalid-threshold-session',
        data: TEST_DATA,
        threshold: 5, // 阈值大于参与者数量
        participants: testKeys.slice(0, 3).map(k => k.name), // 只有3个参与者
      };

      await expect(multiSignature.createSession(invalidParams)).rejects.toThrow();
    });

    test('应该处理空参与者列表', async () => {
      const invalidParams = {
        sessionId: 'empty-participants-session',
        data: TEST_DATA,
        threshold: 1,
        participants: [], // 空参与者列表
      };

      await expect(multiSignature.createSession(invalidParams)).rejects.toThrow();
    });

    test('应该处理无效的阈值', async () => {
      const invalidParams = {
        sessionId: 'invalid-threshold-value',
        data: TEST_DATA,
        threshold: 0, // 无效阈值
        participants: testKeys.slice(0, 2).map(k => k.name),
      };

      await expect(multiSignature.createSession(invalidParams)).rejects.toThrow();
    });

    test('应该处理已完成的会话', async () => {
      const sessionId = `completed-session-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 1,
        participants: testKeys.slice(0, 1).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 收集签名并完成会话
      const signature = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      await multiSignature.collectSignature({
        sessionId: sessionId,
        signature: signature,
        keyName: 'key-1',
      });

      await multiSignature.completeSession(sessionId);

      // 尝试向已完成的会话添加签名应该失败
      const anotherSignature = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-2',
        format: 'json',
      });

      await expect(
        multiSignature.collectSignature({
          sessionId: sessionId,
          signature: anotherSignature,
          keyName: 'key-2',
        }),
      ).rejects.toThrow();
    });

    test('应该处理已取消的会话', async () => {
      const sessionId = `cancelled-session-test-${Date.now()}`;

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 2,
        participants: testKeys.slice(0, 2).map(k => k.name),
      };

      await multiSignature.createSession(sessionParams);

      // 取消会话
      await multiSignature.cancelSession(sessionId, '测试取消');

      // 尝试向已取消的会话添加签名应该失败
      const signature = await signer.sign({
        data: TEST_DATA,
        keyName: 'key-1',
        format: 'json',
      });

      await expect(
        multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: 'key-1',
        }),
      ).rejects.toThrow();
    });

    test('应该从错误状态恢复', async () => {
      // 先触发一个错误
      await expect(multiSignature.getSession('non-existent')).rejects.toThrow();

      // 验证多签名服务仍然可以正常使用
      const sessionParams = {
        sessionId: 'recovery-test',
        data: TEST_DATA,
        threshold: 1,
        participants: testKeys.slice(0, 1).map(k => k.name),
      };

      const session = await multiSignature.createSession(sessionParams);
      expect(session).toBeDefined();
      expect(session.sessionId).toBe('recovery-test');
    });
  });

  describe('性能测试', () => {
    test('应该高效处理多个会话', async () => {
      const sessionCount = 5;
      const startTime = Date.now();

      for (let i = 0; i < sessionCount; i++) {
        const sessionParams = {
          sessionId: `performance-session-${i}`,
          data: TEST_DATA,
          threshold: 2,
          participants: testKeys.slice(0, 3).map(k => k.name),
        };

        await multiSignature.createSession(sessionParams);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 5个会话应该在合理时间内创建
      expect(totalTime).toBeLessThan(1000); // 1秒内

      // 验证所有会话都存在
      const sessions = await multiSignature.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(sessionCount);
    });

    test('应该高效处理并发签名收集', async () => {
      const sessionId = `concurrent-test-${Date.now()}`;
      const participants = testKeys.slice(0, 3).map(k => k.name);

      const sessionParams = {
        sessionId: sessionId,
        data: TEST_DATA,
        threshold: 3,
        participants: participants,
      };

      await multiSignature.createSession(sessionParams);

      const promises = participants.map(async keyName => {
        const signature = await signer.sign({
          data: TEST_DATA,
          keyName: keyName,
          format: 'json',
        });

        return multiSignature.collectSignature({
          sessionId: sessionId,
          signature: signature,
          keyName: keyName,
        });
      });

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const concurrentTime = endTime - startTime;

      // 验证所有操作都成功
      results.forEach(result => {
        expect(result.collected).toBe(true);
      });

      // 并发操作应该在合理时间内完成
      expect(concurrentTime).toBeLessThan(2000); // 2秒内

      // 验证阈值已满足
      const thresholdCheck = await multiSignature.checkThreshold(sessionId);
      expect(thresholdCheck.thresholdMet).toBe(true);
    });

    test('应该测量多签名性能', async () => {
      const benchmarkParams = {
        participants: testKeys.slice(0, 3).map(k => k.name),
        threshold: 2,
        iterations: 3,
      };

      const results = await multiSignature.runBenchmark(benchmarkParams);

      expect(results).toBeDefined();
      expect(results.iterations).toBe(3);
      expect(results.totalTime).toBeGreaterThan(0);
      expect(results.avgSessionCreationTime).toBeGreaterThan(0);
      expect(results.avgSignatureCollectionTime).toBeGreaterThan(0);
      expect(results.avgVerificationTime).toBeGreaterThan(0);
      expect(results.successCount).toBe(3);
    });

    test('应该优化大参与者的会话性能', async () => {
      const largeParticipants = testKeys.slice(0, 5).map(k => k.name);

      const sessionParams = {
        sessionId: 'large-participants-test',
        data: TEST_DATA,
        threshold: 3,
        participants: largeParticipants,
      };

      const startTime = Date.now();
      const session = await multiSignature.createSession(sessionParams);
      const creationTime = Date.now() - startTime;

      expect(session).toBeDefined();
      expect(session.participants).toHaveLength(5);
      // 大参与者会话创建应该在合理时间内完成
      expect(creationTime).toBeLessThan(500); // 500ms内
    });
  });

  describe('批量操作', () => {
    test('应该批量创建多个会话', async () => {
      const batchSessions = [
        {
          sessionId: 'batch-session-1',
          data: 'data-1',
          threshold: 2,
          participants: testKeys.slice(0, 3).map(k => k.name),
        },
        {
          sessionId: 'batch-session-2',
          data: 'data-2',
          threshold: 1,
          participants: testKeys.slice(0, 2).map(k => k.name),
        },
        {
          sessionId: 'batch-session-3',
          data: 'data-3',
          threshold: 3,
          participants: testKeys.slice(0, 4).map(k => k.name),
        },
      ];

      const results = await multiSignature.batchCreateSessions(batchSessions);

      expect(results).toBeDefined();
      expect(results.createdCount).toBe(batchSessions.length);
      expect(results.failedCount).toBe(0);
      expect(results.results).toHaveLength(batchSessions.length);

      // 验证每个会话都成功创建
      results.results.forEach((result, index) => {
        expect(result.sessionId).toBe(batchSessions[index].sessionId);
        expect(result.success).toBe(true);
      });
    });

    test('应该批量验证多个会话', async () => {
      // 创建多个测试会话
      const sessionIds = [];
      for (let i = 0; i < 3; i++) {
        const sessionId = `batch-verify-${i}`;
        sessionIds.push(sessionId);

        const sessionParams = {
          sessionId: sessionId,
          data: TEST_DATA,
          threshold: 2,
          participants: testKeys.slice(0, 3).map(k => k.name),
        };

        await multiSignature.createSession(sessionParams);

        // 为每个会话收集足够的签名
        for (let j = 0; j < 2; j++) {
          const signature = await signer.sign({
            data: TEST_DATA,
            keyName: testKeys[j].name,
            format: 'json',
          });

          await multiSignature.collectSignature({
            sessionId: sessionId,
            signature: signature,
            keyName: testKeys[j].name,
          });
        }
      }

      const batchResults = await multiSignature.batchVerifySessions(sessionIds);

      expect(batchResults).toBeDefined();
      expect(batchResults.verifiedCount).toBe(sessionIds.length);
      expect(batchResults.failedCount).toBe(0);
      expect(batchResults.results).toHaveLength(sessionIds.length);

      // 验证每个会话都通过验证
      batchResults.results.forEach(result => {
        expect(result.valid).toBe(true);
        expect(result.thresholdMet).toBe(true);
      });
    });

    test('应该批量清理过期会话', async () => {
      // 创建一些立即过期的会话
      const expiredSessions = [];
      for (let i = 0; i < 3; i++) {
        const sessionParams = {
          sessionId: `expired-batch-${i}`,
          data: TEST_DATA,
          threshold: 2,
          participants: testKeys.slice(0, 2).map(k => k.name),
          timeout: 1, // 1ms后过期
        };

        await multiSignature.createSession(sessionParams);
        expiredSessions.push(`expired-batch-${i}`);
      }

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10));

      const cleanupResults = await multiSignature.batchCleanupSessions(expiredSessions);

      expect(cleanupResults).toBeDefined();
      expect(cleanupResults.cleanedCount).toBe(expiredSessions.length);
      expect(cleanupResults.failedCount).toBe(0);

      // 验证所有过期会话已被清理
      for (const sessionId of expiredSessions) {
        await expect(multiSignature.getSession(sessionId)).rejects.toThrow();
      }
    });
  });
});
