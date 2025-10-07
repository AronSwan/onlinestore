# JWT 密钥管理指南

## 概述

本文档提供了 JWT 认证系统中 RSA 密钥对的完整管理方案，包括生成、存储、分发、轮换和撤销的最佳实践。

## 🔐 密钥生成

### 1. RSA 密钥对生成

#### 生产环境密钥生成
```bash
#!/bin/bash
# generate-jwt-keys.sh - 生产级 JWT 密钥生成脚本

set -euo pipefail

# 配置
KEY_SIZE=4096
KEY_DIR="./keys"
PRIVATE_KEY_FILE="jwt-private.pem"
PUBLIC_KEY_FILE="jwt-public.pem"
PKCS8_PRIVATE_KEY_FILE="jwt-private-pkcs8.pem"

# 创建密钥目录
mkdir -p "$KEY_DIR"
cd "$KEY_DIR"

echo "生成 $KEY_SIZE 位 RSA 密钥对..."

# 生成私钥
openssl genrsa -out "$PRIVATE_KEY_FILE" "$KEY_SIZE"

# 提取公钥
openssl rsa -in "$PRIVATE_KEY_FILE" -pubout -out "$PUBLIC_KEY_FILE"

# 转换私钥为 PKCS#8 格式（推荐）
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
    -in "$PRIVATE_KEY_FILE" -out "$PKCS8_PRIVATE_KEY_FILE"

# 设置安全权限
chmod 600 "$PRIVATE_KEY_FILE" "$PKCS8_PRIVATE_KEY_FILE"
chmod 644 "$PUBLIC_KEY_FILE"

echo "密钥生成完成："
echo "  私钥: $KEY_DIR/$PRIVATE_KEY_FILE"
echo "  私钥(PKCS#8): $KEY_DIR/$PKCS8_PRIVATE_KEY_FILE"
echo "  公钥: $KEY_DIR/$PUBLIC_KEY_FILE"

# 验证密钥对
echo "验证密钥对..."
echo "test data" | openssl rsautl -encrypt -pubin -inkey "$PUBLIC_KEY_FILE" | \
    openssl rsautl -decrypt -inkey "$PRIVATE_KEY_FILE" > /dev/null

echo "密钥对验证成功！"
```

#### PowerShell 版本（Windows）
```powershell
# Generate-JwtKeys.ps1 - Windows JWT 密钥生成脚本

param(
    [int]$KeySize = 4096,
    [string]$OutputDir = ".\keys"
)

# 创建输出目录
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
}

$PrivateKeyPath = Join-Path $OutputDir "jwt-private.pem"
$PublicKeyPath = Join-Path $OutputDir "jwt-public.pem"
$Pkcs8PrivateKeyPath = Join-Path $OutputDir "jwt-private-pkcs8.pem"

Write-Host "生成 $KeySize 位 RSA 密钥对..."

try {
    # 生成私钥
    & openssl genrsa -out $PrivateKeyPath $KeySize
    if ($LASTEXITCODE -ne 0) { throw "私钥生成失败" }

    # 提取公钥
    & openssl rsa -in $PrivateKeyPath -pubout -out $PublicKeyPath
    if ($LASTEXITCODE -ne 0) { throw "公钥提取失败" }

    # 转换为 PKCS#8 格式
    & openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in $PrivateKeyPath -out $Pkcs8PrivateKeyPath
    if ($LASTEXITCODE -ne 0) { throw "PKCS#8 转换失败" }

    Write-Host "密钥生成完成：" -ForegroundColor Green
    Write-Host "  私钥: $PrivateKeyPath"
    Write-Host "  私钥(PKCS#8): $Pkcs8PrivateKeyPath"
    Write-Host "  公钥: $PublicKeyPath"

    # 验证密钥对
    $testData = "test data"
    $testFile = Join-Path $OutputDir "test.txt"
    $encryptedFile = Join-Path $OutputDir "test.enc"
    $decryptedFile = Join-Path $OutputDir "test.dec"

    $testData | Out-File -FilePath $testFile -Encoding ASCII -NoNewline
    & openssl rsautl -encrypt -pubin -inkey $PublicKeyPath -in $testFile -out $encryptedFile
    & openssl rsautl -decrypt -inkey $PrivateKeyPath -in $encryptedFile -out $decryptedFile

    $decryptedData = Get-Content $decryptedFile -Raw
    if ($decryptedData.Trim() -eq $testData) {
        Write-Host "密钥对验证成功！" -ForegroundColor Green
    } else {
        throw "密钥对验证失败"
    }

    # 清理测试文件
    Remove-Item $testFile, $encryptedFile, $decryptedFile -ErrorAction SilentlyContinue

} catch {
    Write-Error "密钥生成失败: $($_.Exception.Message)"
    exit 1
}
```

### 2. 密钥质量验证

#### 密钥强度检查脚本
```bash
#!/bin/bash
# validate-key-strength.sh - 密钥强度验证脚本

PRIVATE_KEY_FILE="$1"

if [[ ! -f "$PRIVATE_KEY_FILE" ]]; then
    echo "错误: 私钥文件不存在: $PRIVATE_KEY_FILE"
    exit 1
fi

echo "验证密钥强度..."

# 检查密钥长度
KEY_SIZE=$(openssl rsa -in "$PRIVATE_KEY_FILE" -text -noout | grep "Private-Key:" | grep -o '[0-9]\+')
echo "密钥长度: $KEY_SIZE 位"

if [[ $KEY_SIZE -lt 2048 ]]; then
    echo "警告: 密钥长度小于 2048 位，不推荐用于生产环境"
    exit 1
elif [[ $KEY_SIZE -lt 4096 ]]; then
    echo "注意: 推荐使用 4096 位密钥以获得更高安全性"
fi

# 检查密钥格式
if openssl rsa -in "$PRIVATE_KEY_FILE" -check -noout > /dev/null 2>&1; then
    echo "密钥格式: 有效"
else
    echo "错误: 密钥格式无效"
    exit 1
fi

# 检查密钥是否加密
if grep -q "ENCRYPTED" "$PRIVATE_KEY_FILE"; then
    echo "密钥状态: 已加密"
else
    echo "密钥状态: 未加密"
fi

echo "密钥验证完成"
```

## 🗄️ 密钥存储

### 1. 环境变量存储

#### 安全的环境变量设置
```bash
# .env.production - 生产环境配置
# 注意: 实际部署时应使用密钥管理服务

# 私钥（仅认证服务需要）
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIJQgIBADANBgkqhkiG9w0BAQEFAASCCSwwggkoAgEAAoICAQC...
-----END PRIVATE KEY-----"

# 公钥（所有验证服务需要）
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtGb...
-----END PUBLIC KEY-----"

# 密钥标识
JWT_ACCESS_KEY_ID="access-key-2024-01"
JWT_REFRESH_KEY_ID="refresh-key-2024-01"
```

#### 环境变量加载器
```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

export class JwtKeyLoader {
  private static instance: JwtKeyLoader;
  private privateKey: string;
  private publicKey: string;

  private constructor() {
    this.loadKeys();
  }

  static getInstance(): JwtKeyLoader {
    if (!JwtKeyLoader.instance) {
      JwtKeyLoader.instance = new JwtKeyLoader();
    }
    return JwtKeyLoader.instance;
  }

  private loadKeys(): void {
    // 优先从环境变量加载
    if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
      this.privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
      this.publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
      return;
    }

    // 从文件加载（开发环境）
    const keyDir = process.env.JWT_KEY_DIR || './keys';
    try {
      this.privateKey = readFileSync(join(keyDir, 'jwt-private.pem'), 'utf8');
      this.publicKey = readFileSync(join(keyDir, 'jwt-public.pem'), 'utf8');
    } catch (error) {
      throw new Error(`Failed to load JWT keys: ${error.message}`);
    }
  }

  getPrivateKey(): string {
    return this.privateKey;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  // 验证密钥对
  validateKeyPair(): boolean {
    try {
      const crypto = require('crypto');
      const testData = 'test-data-for-validation';
      
      // 使用私钥签名
      const sign = crypto.createSign('SHA256');
      sign.update(testData);
      const signature = sign.sign(this.privateKey);
      
      // 使用公钥验证
      const verify = crypto.createVerify('SHA256');
      verify.update(testData);
      return verify.verify(this.publicKey, signature);
    } catch (error) {
      return false;
    }
  }
}
```

### 2. 密钥管理服务集成

#### AWS Secrets Manager 集成
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class AwsKeyManager {
  private client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async getPrivateKey(): Promise<string> {
    const command = new GetSecretValueCommand({
      SecretId: process.env.JWT_PRIVATE_KEY_SECRET_ID || 'jwt/private-key'
    });

    try {
      const response = await this.client.send(command);
      return response.SecretString;
    } catch (error) {
      throw new Error(`Failed to retrieve private key: ${error.message}`);
    }
  }

  async getPublicKey(): Promise<string> {
    const command = new GetSecretValueCommand({
      SecretId: process.env.JWT_PUBLIC_KEY_SECRET_ID || 'jwt/public-key'
    });

    try {
      const response = await this.client.send(command);
      return response.SecretString;
    } catch (error) {
      throw new Error(`Failed to retrieve public key: ${error.message}`);
    }
  }
}
```

#### Azure Key Vault 集成
```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export class AzureKeyManager {
  private client: SecretClient;

  constructor() {
    const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
    if (!vaultUrl) {
      throw new Error('AZURE_KEY_VAULT_URL environment variable is required');
    }

    const credential = new DefaultAzureCredential();
    this.client = new SecretClient(vaultUrl, credential);
  }

  async getPrivateKey(): Promise<string> {
    try {
      const secret = await this.client.getSecret('jwt-private-key');
      return secret.value;
    } catch (error) {
      throw new Error(`Failed to retrieve private key: ${error.message}`);
    }
  }

  async getPublicKey(): Promise<string> {
    try {
      const secret = await this.client.getSecret('jwt-public-key');
      return secret.value;
    } catch (error) {
      throw new Error(`Failed to retrieve public key: ${error.message}`);
    }
  }
}
```

### 3. JWKS (JSON Web Key Set) 实现

#### JWKS 端点实现
```typescript
import { Controller, Get } from '@nestjs/common';
import { JwtKeyService } from './jwt-key.service';

@Controller('.well-known')
export class JwksController {
  constructor(private readonly jwtKeyService: JwtKeyService) {}

  @Get('jwks.json')
  async getJwks() {
    const publicKeys = await this.jwtKeyService.getPublicKeys();
    
    return {
      keys: publicKeys.map(key => ({
        kty: 'RSA',
        use: 'sig',
        kid: key.keyId,
        alg: 'RS256',
        n: key.modulus,
        e: key.exponent
      }))
    };
  }
}
```

#### JWKS 客户端
```typescript
import axios from 'axios';
import { createPublicKey } from 'crypto';

export class JwksClient {
  private cache = new Map<string, string>();
  private cacheExpiry = new Map<string, number>();

  constructor(private jwksUri: string) {}

  async getPublicKey(keyId: string): Promise<string> {
    // 检查缓存
    const cached = this.cache.get(keyId);
    const expiry = this.cacheExpiry.get(keyId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // 从 JWKS 端点获取
    try {
      const response = await axios.get(this.jwksUri);
      const jwks = response.data;
      
      const key = jwks.keys.find(k => k.kid === keyId);
      if (!key) {
        throw new Error(`Key with ID ${keyId} not found in JWKS`);
      }

      // 构造 PEM 格式的公钥
      const publicKey = this.jwkToPem(key);
      
      // 缓存公钥（1小时）
      this.cache.set(keyId, publicKey);
      this.cacheExpiry.set(keyId, Date.now() + 3600000);
      
      return publicKey;
    } catch (error) {
      throw new Error(`Failed to fetch public key: ${error.message}`);
    }
  }

  private jwkToPem(jwk: any): string {
    // 将 JWK 转换为 PEM 格式
    const keyObject = createPublicKey({
      key: {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e
      },
      format: 'jwk'
    });

    return keyObject.export({
      type: 'spki',
      format: 'pem'
    }) as string;
  }
}
```

## 🔄 密钥轮换

### 1. 轮换策略

#### 自动轮换服务
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger(KeyRotationService.name);

  constructor(
    private readonly keyManager: JwtKeyManager,
    private readonly notificationService: NotificationService
  ) {}

  // 每月检查密钥轮换需求
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async checkKeyRotation(): Promise<void> {
    this.logger.log('Checking key rotation requirements...');

    try {
      const currentKeys = await this.keyManager.getCurrentKeys();
      
      for (const key of currentKeys) {
        const ageInDays = this.calculateKeyAge(key.createdAt);
        const rotationThreshold = 180; // 6个月
        
        if (ageInDays >= rotationThreshold) {
          this.logger.warn(`Key ${key.keyId} is ${ageInDays} days old and needs rotation`);
          await this.initiateKeyRotation(key);
        } else if (ageInDays >= rotationThreshold - 30) {
          this.logger.log(`Key ${key.keyId} will need rotation in ${rotationThreshold - ageInDays} days`);
          await this.notificationService.sendKeyRotationReminder(key);
        }
      }
    } catch (error) {
      this.logger.error('Key rotation check failed', error);
    }
  }

  private async initiateKeyRotation(oldKey: JwtKey): Promise<void> {
    this.logger.log(`Initiating rotation for key ${oldKey.keyId}`);

    try {
      // 1. 生成新密钥对
      const newKeyPair = await this.generateNewKeyPair();
      
      // 2. 部署新密钥
      await this.deployNewKey(newKeyPair);
      
      // 3. 更新配置
      await this.updateKeyConfiguration(newKeyPair);
      
      // 4. 验证新密钥
      await this.validateNewKey(newKeyPair);
      
      // 5. 计划旧密钥退役
      await this.scheduleKeyRetirement(oldKey);
      
      // 6. 发送通知
      await this.notificationService.sendKeyRotationSuccess(oldKey, newKeyPair);
      
      this.logger.log(`Key rotation completed for ${oldKey.keyId} -> ${newKeyPair.keyId}`);
    } catch (error) {
      this.logger.error(`Key rotation failed for ${oldKey.keyId}`, error);
      await this.notificationService.sendKeyRotationFailure(oldKey, error);
      throw error;
    }
  }

  private calculateKeyAge(createdAt: Date): number {
    return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async generateNewKeyPair(): Promise<JwtKeyPair> {
    // 实现密钥对生成逻辑
    // 返回新的密钥对
  }

  private async deployNewKey(keyPair: JwtKeyPair): Promise<void> {
    // 实现密钥部署逻辑
  }

  private async scheduleKeyRetirement(oldKey: JwtKey): Promise<void> {
    // 计划在所有令牌过期后退役旧密钥
    const retirementDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后
    await this.keyManager.scheduleKeyRetirement(oldKey.keyId, retirementDate);
  }
}
```

### 2. 渐进式轮换

#### 多密钥支持实现
```typescript
@Injectable()
export class MultiKeyJwtService {
  private readonly logger = new Logger(MultiKeyJwtService.name);

  constructor(private readonly keyManager: JwtKeyManager) {}

  async signToken(payload: any): Promise<string> {
    // 使用最新的活跃密钥签名
    const currentKey = await this.keyManager.getCurrentSigningKey();
    
    return jwt.sign(payload, currentKey.privateKey, {
      algorithm: 'RS256',
      keyid: currentKey.keyId,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });
  }

  async verifyToken(token: string): Promise<any> {
    try {
      // 解码 header 获取 keyId
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        throw new Error('Token missing key ID');
      }

      const keyId = decoded.header.kid;
      
      // 获取对应的公钥
      const publicKey = await this.keyManager.getPublicKey(keyId);
      if (!publicKey) {
        throw new Error(`Public key not found for key ID: ${keyId}`);
      }

      // 验证令牌
      return jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE
      });
    } catch (error) {
      this.logger.error('Token verification failed', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### 3. 零停机轮换

#### 轮换协调器
```typescript
@Injectable()
export class ZeroDowntimeRotationCoordinator {
  private readonly logger = new Logger(ZeroDowntimeRotationCoordinator.name);

  constructor(
    private readonly keyManager: JwtKeyManager,
    private readonly serviceRegistry: ServiceRegistry
  ) {}

  async performZeroDowntimeRotation(): Promise<void> {
    this.logger.log('Starting zero-downtime key rotation...');

    try {
      // 阶段 1: 生成新密钥对
      const newKeyPair = await this.generateNewKeyPair();
      this.logger.log(`Generated new key pair: ${newKeyPair.keyId}`);

      // 阶段 2: 分发新公钥到所有验证服务
      await this.distributePublicKey(newKeyPair);
      this.logger.log('New public key distributed to all services');

      // 阶段 3: 等待公钥传播完成
      await this.waitForKeyPropagation(newKeyPair.keyId);
      this.logger.log('Key propagation completed');

      // 阶段 4: 切换签名服务到新私钥
      await this.switchSigningKey(newKeyPair);
      this.logger.log('Signing service switched to new key');

      // 阶段 5: 验证新密钥工作正常
      await this.validateRotation(newKeyPair);
      this.logger.log('New key validation successful');

      // 阶段 6: 计划旧密钥退役
      await this.scheduleOldKeyRetirement();
      this.logger.log('Old key retirement scheduled');

      this.logger.log('Zero-downtime key rotation completed successfully');
    } catch (error) {
      this.logger.error('Zero-downtime rotation failed', error);
      await this.rollbackRotation();
      throw error;
    }
  }

  private async waitForKeyPropagation(keyId: string): Promise<void> {
    const maxWaitTime = 300000; // 5分钟
    const checkInterval = 10000; // 10秒
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const allServicesReady = await this.checkAllServicesHaveKey(keyId);
      if (allServicesReady) {
        return;
      }
      
      this.logger.log(`Waiting for key propagation... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Key propagation timeout');
  }

  private async checkAllServicesHaveKey(keyId: string): Promise<boolean> {
    const services = await this.serviceRegistry.getAllVerificationServices();
    
    const checks = services.map(async service => {
      try {
        const response = await axios.get(`${service.url}/health/key/${keyId}`);
        return response.status === 200;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(checks);
    return results.every(result => result === true);
  }
}
```

## 🔒 密钥安全

### 1. 访问控制

#### 基于角色的密钥访问
```typescript
export enum KeyAccessRole {
  SIGNER = 'signer',           // 可以访问私钥进行签名
  VERIFIER = 'verifier',       // 只能访问公钥进行验证
  ADMIN = 'admin',             // 可以管理密钥轮换
  AUDITOR = 'auditor'          // 只读访问，用于审计
}

@Injectable()
export class KeyAccessController {
  private readonly logger = new Logger(KeyAccessController.name);

  constructor(private readonly authService: AuthService) {}

  async getPrivateKey(serviceId: string): Promise<string> {
    // 验证服务身份和权限
    const service = await this.authService.validateService(serviceId);
    if (!service.hasRole(KeyAccessRole.SIGNER)) {
      throw new ForbiddenException('Service not authorized to access private key');
    }

    // 记录访问日志
    this.logger.log(`Private key accessed by service: ${serviceId}`);
    
    return this.keyManager.getPrivateKey();
  }

  async getPublicKey(serviceId: string): Promise<string> {
    // 验证服务身份
    const service = await this.authService.validateService(serviceId);
    if (!service.hasRole(KeyAccessRole.VERIFIER) && !service.hasRole(KeyAccessRole.SIGNER)) {
      throw new ForbiddenException('Service not authorized to access public key');
    }

    return this.keyManager.getPublicKey();
  }
}
```

### 2. 密钥审计

#### 密钥使用审计
```typescript
@Injectable()
export class KeyAuditService {
  private readonly logger = new Logger(KeyAuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async logKeyAccess(event: KeyAccessEvent): Promise<void> {
    const auditEntry = {
      timestamp: new Date(),
      eventType: event.type,
      keyId: event.keyId,
      serviceId: event.serviceId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success,
      errorMessage: event.errorMessage
    };

    await this.auditRepository.save(auditEntry);
    
    // 检测异常访问模式
    await this.detectAnomalousAccess(event);
  }

  async detectAnomalousAccess(event: KeyAccessEvent): Promise<void> {
    // 检查访问频率
    const recentAccess = await this.auditRepository.findRecentAccess(
      event.serviceId,
      new Date(Date.now() - 60000) // 最近1分钟
    );

    if (recentAccess.length > 100) {
      this.logger.warn(`High frequency key access detected from service: ${event.serviceId}`);
      // 触发告警
    }

    // 检查异常IP
    const knownIps = await this.getKnownServiceIps(event.serviceId);
    if (!knownIps.includes(event.ipAddress)) {
      this.logger.warn(`Key access from unknown IP: ${event.ipAddress} for service: ${event.serviceId}`);
      // 触发告警
    }
  }

  async generateAuditReport(startDate: Date, endDate: Date): Promise<KeyAuditReport> {
    const entries = await this.auditRepository.findByDateRange(startDate, endDate);
    
    return {
      period: { start: startDate, end: endDate },
      totalAccess: entries.length,
      successfulAccess: entries.filter(e => e.success).length,
      failedAccess: entries.filter(e => !e.success).length,
      uniqueServices: [...new Set(entries.map(e => e.serviceId))].length,
      topServices: this.getTopAccessingServices(entries),
      anomalies: await this.findAnomalies(entries)
    };
  }
}
```

## 📊 监控和告警

### 1. 密钥健康监控

#### 密钥健康检查
```typescript
@Injectable()
export class KeyHealthMonitor {
  private readonly logger = new Logger(KeyHealthMonitor.name);

  constructor(
    private readonly keyManager: JwtKeyManager,
    private readonly metricsService: MetricsService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck(): Promise<void> {
    try {
      const healthStatus = await this.checkKeyHealth();
      await this.metricsService.recordKeyHealth(healthStatus);
      
      if (!healthStatus.overall) {
        this.logger.error('Key health check failed', healthStatus);
      }
    } catch (error) {
      this.logger.error('Key health check error', error);
    }
  }

  private async checkKeyHealth(): Promise<KeyHealthStatus> {
    const checks = {
      privateKeyAccessible: false,
      publicKeyAccessible: false,
      keyPairValid: false,
      keyNotExpired: false,
      keyRotationScheduled: false
    };

    try {
      // 检查私钥可访问性
      const privateKey = await this.keyManager.getPrivateKey();
      checks.privateKeyAccessible = !!privateKey;

      // 检查公钥可访问性
      const publicKey = await this.keyManager.getPublicKey();
      checks.publicKeyAccessible = !!publicKey;

      // 检查密钥对有效性
      if (checks.privateKeyAccessible && checks.publicKeyAccessible) {
        checks.keyPairValid = await this.validateKeyPair(privateKey, publicKey);
      }

      // 检查密钥是否过期
      const keyMetadata = await this.keyManager.getKeyMetadata();
      checks.keyNotExpired = this.isKeyNotExpired(keyMetadata);

      // 检查轮换计划
      checks.keyRotationScheduled = await this.isRotationScheduled(keyMetadata);

    } catch (error) {
      this.logger.error('Health check error', error);
    }

    return {
      ...checks,
      overall: Object.values(checks).every(check => check === true),
      timestamp: new Date()
    };
  }

  private async validateKeyPair(privateKey: string, publicKey: string): Promise<boolean> {
    try {
      const testData = 'health-check-test-data';
      const signature = crypto.createSign('SHA256')
        .update(testData)
        .sign(privateKey);

      return crypto.createVerify('SHA256')
        .update(testData)
        .verify(publicKey, signature);
    } catch {
      return false;
    }
  }
}
```

### 2. 告警配置

#### 密钥告警规则
```typescript
@Injectable()
export class KeyAlertService {
  private readonly logger = new Logger(KeyAlertService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly metricsService: MetricsService
  ) {}

  async checkAlertConditions(): Promise<void> {
    const alerts = [
      this.checkKeyExpiration(),
      this.checkKeyAccessFailures(),
      this.checkRotationOverdue(),
      this.checkAnomalousAccess()
    ];

    const results = await Promise.allSettled(alerts);
    
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error('Alert check failed', result.reason);
      }
    }
  }

  private async checkKeyExpiration(): Promise<void> {
    const keyMetadata = await this.keyManager.getKeyMetadata();
    const daysUntilExpiration = this.calculateDaysUntilExpiration(keyMetadata);

    if (daysUntilExpiration <= 30) {
      await this.notificationService.sendAlert({
        type: 'KEY_EXPIRATION_WARNING',
        severity: daysUntilExpiration <= 7 ? 'CRITICAL' : 'WARNING',
        message: `JWT key will expire in ${daysUntilExpiration} days`,
        keyId: keyMetadata.keyId,
        expirationDate: keyMetadata.expirationDate
      });
    }
  }

  private async checkKeyAccessFailures(): Promise<void> {
    const failureRate = await this.metricsService.getKeyAccessFailureRate();
    
    if (failureRate > 0.1) { // 10% 失败率
      await this.notificationService.sendAlert({
        type: 'HIGH_KEY_ACCESS_FAILURE_RATE',
        severity: 'WARNING',
        message: `Key access failure rate is ${(failureRate * 100).toFixed(2)}%`,
        failureRate
      });
    }
  }
}
```

## 📋 密钥管理检查清单

### 生成阶段
- [ ] 使用足够的密钥长度（最少 2048 位，推荐 4096 位）
- [ ] 在安全环境中生成密钥
- [ ] 验证密钥对的有效性
- [ ] 为密钥分配唯一标识符
- [ ] 记录密钥生成事件

### 存储阶段
- [ ] 私钥仅存储在认证服务中
- [ ] 使用安全的存储机制（密钥管理服务）
- [ ] 设置适当的访问权限
- [ ] 启用访问审计日志
- [ ] 实施备份和恢复策略

### 分发阶段
- [ ] 公钥安全分发到所有验证服务
- [ ] 实施 JWKS 端点（如适用）
- [ ] 验证密钥分发的完整性
- [ ] 监控密钥传播状态

### 使用阶段
- [ ] 实施基于角色的访问控制
- [ ] 记录所有密钥访问事件
- [ ] 监控密钥使用模式
- [ ] 检测异常访问行为

### 轮换阶段
- [ ] 制定密钥轮换计划
- [ ] 实施自动轮换机制
- [ ] 支持多密钥并存
- [ ] 验证轮换过程的正确性
- [ ] 安全退役旧密钥

### 监控阶段
- [ ] 实施密钥健康检查
- [ ] 配置关键告警
- [ ] 生成定期审计报告
- [ ] 监控密钥性能指标

## 相关文档

- [JWT 迁移指南](./JWT_MIGRATION_GUIDE.md)
- [JWT 最佳实践](./JWT_BEST_PRACTICES.md)
- [JWT 安全配置](./JWT_SECURITY_CONFIG.md)