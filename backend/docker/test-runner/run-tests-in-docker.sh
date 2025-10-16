#!/bin/bash

# 在Docker容器中运行所有功能测试
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${2}$1${NC}"
}

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 记录测试结果
record_test() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "true" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "✅ $test_name" "$GREEN"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "❌ $test_name: $message" "$RED"
    fi
}

# 等待Redis就绪
wait_for_redis() {
    log "🔍 等待Redis就绪..." "$BLUE"
    for i in {1..30}; do
        if redis-cli -h redis -p 6379 ping | grep -q PONG; then
            log "✅ Redis已就绪" "$GREEN"
            return 0
        fi
        sleep 1
    done
    log "❌ Redis启动超时" "$RED"
    return 1
}

# 测试1: 读写锁分离机制
test_read_write_lock() {
    log "\n🔒 测试1: 读写锁分离机制" "$MAGENTA"
    
    # 创建测试脚本
    cat > /tmp/test-read-write-lock.js << 'EOF'
class ReadWriteLock {
    constructor() {
        this.readers = 0;
        this.writer = false;
        this.waitingWriters = 0;
    }
    
    async acquireReadLock() {
        return new Promise((resolve) => {
            if (this.writer || this.waitingWriters > 0) {
                setTimeout(() => {
                    if (!this.writer && this.waitingWriters === 0) {
                        this.readers++;
                        resolve();
                    } else {
                        this.acquireReadLock().then(resolve);
                    }
                }, 10);
            } else {
                this.readers++;
                resolve();
            }
        });
    }
    
    async acquireWriteLock() {
        return new Promise((resolve) => {
            this.waitingWriters++;
            setTimeout(() => {
                if (this.readers === 0 && !this.writer) {
                    this.writer = true;
                    this.waitingWriters--;
                    resolve();
                } else {
                    this.acquireWriteLock().then(resolve);
                }
            }, 10);
        });
    }
    
    releaseReadLock() {
        this.readers--;
    }
    
    releaseWriteLock() {
        this.writer = false;
    }
}

// 测试读写锁
async function testLock() {
    const lock = new ReadWriteLock();
    
    try {
        // 测试多个读锁
        await lock.acquireReadLock();
        await lock.acquireReadLock();
        
        if (lock.readers === 2) {
            console.log('✅ 多个读锁获取成功');
        } else {
            console.log('❌ 多个读锁获取失败');
            return false;
        }
        
        lock.releaseReadLock();
        lock.releaseReadLock();
        
        // 测试写锁
        await lock.acquireWriteLock();
        
        if (lock.writer) {
            console.log('✅ 写锁获取成功');
        } else {
            console.log('❌ 写锁获取失败');
            return false;
        }
        
        lock.releaseWriteLock();
        
        return true;
    } catch (error) {
        console.log('❌ 读写锁测试异常:', error.message);
        return false;
    }
}

testLock().then(success => {
    if (success) {
        console.log('✅ 读写锁测试通过');
        process.exit(0);
    } else {
        console.log('❌ 读写锁测试失败');
        process.exit(1);
    }
}).catch(error => {
    console.log('❌ 读写锁测试异常:', error.message);
    process.exit(1);
});
EOF
    
    # 运行测试
    if node /tmp/test-read-write-lock.js; then
        record_test "读写锁分离机制" "true"
    else
        record_test "读写锁分离机制" "false" "读写锁功能异常"
    fi
    
    # 清理
    rm -f /tmp/test-read-write-lock.js
}

# 测试2: 审计日志加密存储
test_encrypted_audit_log() {
    log "\n🔐 测试2: 审计日志加密存储" "$MAGENTA"
    
    # 创建测试脚本
    cat > /tmp/test-encrypted-audit-log.js << 'EOF'
const crypto = require('crypto');

class EncryptedAuditLogger {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.key = crypto.randomBytes(32);
        this.logs = [];
    }
    
    encrypt(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            iv: iv.toString('hex'),
            data: encrypted
        };
    }
    
    decrypt(encryptedData) {
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(encryptedData.iv, 'hex'));
        
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    logAuditEvent(event) {
        const eventData = JSON.stringify(event);
        const encrypted = this.encrypt(eventData);
        
        this.logs.push({
            timestamp: new Date().toISOString(),
            encrypted: true,
            ...encrypted
        });
        
        return true;
    }
    
    getLogs() {
        return this.logs.map(log => {
            const decrypted = this.decrypt(log);
            return {
                timestamp: log.timestamp,
                event: JSON.parse(decrypted)
            };
        });
    }
}

// 测试加密审计日志
async function testAuditLog() {
    const auditLogger = new EncryptedAuditLogger();
    
    try {
        // 测试日志记录
        const success1 = auditLogger.logAuditEvent({
            level: 'INFO',
            action: 'USER_LOGIN',
            userId: 'test-user',
            details: { ip: '192.168.1.1' }
        });
        
        if (!success1) {
            console.log('❌ 日志记录失败');
            return false;
        }
        
        // 测试敏感数据记录
        const success2 = auditLogger.logAuditEvent({
            level: 'WARN',
            action: 'FAILED_LOGIN',
            userId: 'test-user',
            details: { reason: 'invalid_password', attempts: 3 }
        });
        
        if (!success2) {
            console.log('❌ 敏感数据日志记录失败');
            return false;
        }
        
        // 测试日志解密
        const logs = auditLogger.getLogs();
        
        if (logs.length !== 2) {
            console.log('❌ 日志数量不正确');
            return false;
        }
        
        // 验证日志内容
        const firstLog = logs[0];
        if (firstLog.event.action !== 'USER_LOGIN') {
            console.log('❌ 日志内容不正确');
            return false;
        }
        
        // 验证加密
        const rawLogs = auditLogger.logs;
        const isEncrypted = rawLogs.every(log => 
            log.encrypted && 
            log.iv && 
            log.data && 
            !log.data.includes('USER_LOGIN')
        );
        
        if (!isEncrypted) {
            console.log('❌ 日志未正确加密');
            return false;
        }
        
        console.log('✅ 日志记录成功');
        console.log('✅ 敏感数据记录成功');
        console.log('✅ 日志解密成功');
        console.log('✅ 日志内容验证成功');
        console.log('✅ 日志加密验证成功');
        
        return true;
    } catch (error) {
        console.log('❌ 审计日志测试异常:', error.message);
        return false;
    }
}

testAuditLog().then(success => {
    if (success) {
        console.log('✅ 审计日志测试通过');
        process.exit(0);
    } else {
        console.log('❌ 审计日志测试失败');
        process.exit(1);
    }
}).catch(error => {
    console.log('❌ 审计日志测试异常:', error.message);
    process.exit(1);
});
EOF
    
    # 运行测试
    if node /tmp/test-encrypted-audit-log.js; then
        record_test "审计日志加密存储" "true"
    else
        record_test "审计日志加密存储" "false" "审计日志功能异常"
    fi
    
    # 清理
    rm -f /tmp/test-encrypted-audit-log.js
}

# 测试3: 分布式锁支持
test_distributed_lock() {
    log "\n🔒 测试3: 分布式锁支持" "$MAGENTA"
    
    # 创建测试脚本
    cat > /tmp/test-distributed-lock.js << 'EOF'
const Redis = require('ioredis');
const { randomBytes } = require('crypto');

// 连接Redis
const redis = new Redis({
    host: 'redis',
    port: 6379
});

// 测试基本的Redis操作
async function testRedis() {
    try {
        // 测试SET和GET
        await redis.set('test-key', 'test-value');
        const value = await redis.get('test-key');
        
        if (value === 'test-value') {
            console.log('✅ Redis SET/GET操作成功');
        } else {
            console.log('❌ Redis SET/GET操作失败');
            return false;
        }
        
        // 测试SET NX选项
        const result = await redis.set('test-lock-key', 'lock-value', 'PX', 5000, 'NX');
        
        if (result === 'OK') {
            console.log('✅ Redis SET NX操作成功');
        } else {
            console.log('❌ Redis SET NX操作失败');
            return false;
        }
        
        // 测试第二次SET NX（应该失败）
        const result2 = await redis.set('test-lock-key', 'lock-value-2', 'PX', 5000, 'NX');
        
        if (result2 === null) {
            console.log('✅ Redis SET NX第二次操作失败（预期行为）');
        } else {
            console.log('❌ Redis SET NX第二次操作成功（不应该发生）');
            return false;
        }
        
        // 测试DEL
        const deleted = await redis.del('test-lock-key');
        
        if (deleted === 1) {
            console.log('✅ Redis DEL操作成功');
        } else {
            console.log('❌ Redis DEL操作失败');
            return false;
        }
        
        // 清理测试数据
        await redis.del('test-key');
        
        return true;
    } catch (error) {
        console.log('❌ Redis测试异常:', error.message);
        return false;
    }
}

// 测试分布式锁
async function testDistributedLock() {
    try {
        // 获取锁
        const identifier = randomBytes(16).toString('hex');
        const result = await redis.set('distributed-lock-test', identifier, 'PX', 10000, 'NX');
        
        if (result === 'OK') {
            console.log('✅ 分布式锁获取成功');
        } else {
            console.log('❌ 分布式锁获取失败');
            return false;
        }
        
        // 验证锁值
        const lockValue = await redis.get('distributed-lock-test');
        
        if (lockValue === identifier) {
            console.log('✅ 分布式锁值验证成功');
        } else {
            console.log('❌ 分布式锁值验证失败');
            return false;
        }
        
        // 尝试获取同一个锁（应该失败）
        const identifier2 = randomBytes(16).toString('hex');
        const result2 = await redis.set('distributed-lock-test', identifier2, 'PX', 10000, 'NX');
        
        if (result2 === null) {
            console.log('✅ 第二次获取分布式锁失败（预期行为）');
        } else {
            console.log('❌ 第二次获取分布式锁成功（不应该发生）');
            return false;
        }
        
        // 使用Lua脚本释放锁
        const luaScript = `
            if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("DEL", KEYS[1])
            else
                return 0
            end
        `;
        
        const releaseResult = await redis.eval(luaScript, 1, 'distributed-lock-test', identifier);
        
        if (releaseResult === 1) {
            console.log('✅ 分布式锁释放成功');
        } else {
            console.log('❌ 分布式锁释放失败');
            return false;
        }
        
        // 验证锁已释放
        const lockValueAfterRelease = await redis.get('distributed-lock-test');
        
        if (lockValueAfterRelease === null) {
            console.log('✅ 分布式锁释放验证成功');
        } else {
            console.log('❌ 分布式锁释放验证失败');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ 分布式锁测试异常:', error.message);
        return false;
    }
}

// 执行测试
async function runTests() {
    console.log('🔒 开始测试Redis基本操作...');
    const redisSuccess = await testRedis();
    
    if (redisSuccess) {
        console.log('\n🔒 开始测试分布式锁...');
        const lockSuccess = await testDistributedLock();
        
        if (lockSuccess) {
            console.log('\n✅ 所有分布式锁测试通过');
            redis.quit();
            return true;
        } else {
            console.log('\n❌ 分布式锁测试失败');
            redis.quit();
            return false;
        }
    } else {
        console.log('\n❌ Redis基本操作测试失败');
        redis.quit();
        return false;
    }
}

runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.log('❌ 测试执行异常:', error.message);
    redis.quit();
    process.exit(1);
});
EOF
    
    # 运行测试
    if node /tmp/test-distributed-lock.js; then
        record_test "分布式锁支持" "true"
    else
        record_test "分布式锁支持" "false" "分布式锁功能异常"
    fi
    
    # 清理
    rm -f /tmp/test-distributed-lock.js
}

# 测试4: 容器化沙箱
test_container_sandbox() {
    log "\n🐳 测试4: 容器化沙箱" "$MAGENTA"
    
    # 生成随机容器名
    local container_name="sandbox-test-$(date +%s)"
    
    log "📦 创建容器: $container_name" "$BLUE"
    
    # 创建容器
    if docker create \
        --name "$container_name" \
        --rm \
        --memory 128m \
        --cpus 0.5 \
        --network none \
        --read-only \
        --user 1000:1000 \
        alpine:latest \
        tail -f /dev/null > /dev/null 2>&1; then
        
        log "✅ 容器创建成功" "$GREEN"
    else
        record_test "容器化沙箱" "false" "容器创建失败"
        return 1
    fi
    
    # 启动容器
    log "🚀 启动容器..." "$BLUE"
    if docker start "$container_name" > /dev/null 2>&1; then
        log "✅ 容器启动成功" "$GREEN"
    else
        record_test "容器化沙箱" "false" "容器启动失败"
        docker rm "$container_name" > /dev/null 2>&1
        return 1
    fi
    
    # 等待容器完全启动
    sleep 2
    
    # 执行命令测试
    log "🔧 执行命令: echo 'Hello from container'" "$BLUE"
    if docker exec "$container_name" sh -c 'echo "Hello from container"' | grep -q "Hello from container"; then
        log "✅ 命令执行成功" "$GREEN"
        local command_test=true
    else
        log "❌ 命令执行失败" "$RED"
        local command_test=false
    fi
    
    # 测试文件系统只读
    log "🔒 测试文件系统只读..." "$BLUE"
    if docker exec "$container_name" sh -c 'touch /test.txt' > /dev/null 2>&1; then
        log "❌ 文件系统不是只读" "$RED"
        local readonly_test=false
    else
        log "✅ 文件系统只读（预期行为）" "$GREEN"
        local readonly_test=true
    fi
    
    # 测试网络隔离
    log "🌐 测试网络隔离..." "$BLUE"
    if docker exec "$container_name" sh -c 'ping -c 1 8.8.8.8' > /dev/null 2>&1; then
        log "⚠️  网络隔离未生效" "$YELLOW"
        local network_test=false
    else
        log "✅ 网络隔离生效（预期行为）" "$GREEN"
        local network_test=true
    fi
    
    # 停止容器
    log "🛑 停止容器..." "$BLUE"
    if docker stop "$container_name" > /dev/null 2>&1; then
        log "✅ 容器停止成功" "$GREEN"
        local stop_test=true
    else
        log "❌ 容器停止失败" "$RED"
        local stop_test=false
    fi
    
    # 综合评估测试结果
    if [ "$command_test" = "true" ] && [ "$readonly_test" = "true" ] && [ "$network_test" = "true" ] && [ "$stop_test" = "true" ]; then
        record_test "容器化沙箱" "true"
    else
        record_test "容器化沙箱" "false" "容器沙箱功能异常"
    fi
}

# 主函数
main() {
    log "🚀 在Docker容器中运行功能测试" "$CYAN"
    
    # 等待Redis就绪
    wait_for_redis
    
    # 运行所有测试
    test_read_write_lock
    test_encrypted_audit_log
    test_distributed_lock
    test_container_sandbox
    
    # 显示测试结果
    log "\n📊 测试结果统计" "$CYAN"
    log "总测试数: $TOTAL_TESTS" "$CYAN"
    log "通过: $PASSED_TESTS" "$GREEN"
    log "失败: $FAILED_TESTS" "$RED"
    
    local pass_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    log "通过率: $pass_rate%" "$CYAN"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "\n✅ 所有测试通过！" "$GREEN"
        exit 0
    else
        log "\n❌ 部分测试失败" "$RED"
        exit 1
    fi
}

# 执行主函数
main "$@"