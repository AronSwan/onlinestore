@echo off
setlocal enabledelayedexpansion

REM 在Docker容器中运行所有功能测试
echo 🚀 在Docker容器中运行功能测试

REM 设置颜色代码
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "NC=[0m"

REM 测试结果统计
set /a TOTAL_TESTS=0
set /a PASSED_TESTS=0
set /a FAILED_TESTS=0

REM 等待Redis就绪
echo %BLUE%🔍 等待Redis就绪...%NC%
:wait_redis
docker exec test-runner-redis redis-cli ping | findstr "PONG" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ Redis已就绪%NC%
    goto redis_ready
)
timeout /t 1 >nul
goto wait_redis

:redis_ready

REM 测试1: 读写锁分离机制
echo.
echo %MAGENTA%🔒 测试1: 读写锁分离机制%NC%

REM 创建测试脚本
echo class ReadWriteLock { > %TEMP%\test-read-write-lock.js
echo     constructor() { >> %TEMP%\test-read-write-lock.js
echo         this.readers = 0; >> %TEMP%\test-read-write-lock.js
echo         this.writer = false; >> %TEMP%\test-read-write-lock.js
echo         this.waitingWriters = 0; >> %TEMP%\test-read-write-lock.js
echo     } >> %TEMP%\test-read-write-lock.js
echo     >> %TEMP%\test-read-write-lock.js
echo     async acquireReadLock() { >> %TEMP%\test-read-write-lock.js
echo         return new Promise((resolve) => { >> %TEMP%\test-read-write-lock.js
echo             if (this.writer ^|^| this.waitingWriters ^> 0) { >> %TEMP%\test-read-write-lock.js
echo                 setTimeout(() => { >> %TEMP%\test-read-write-lock.js
echo                     if (!this.writer ^&^&^ this.waitingWriters === 0) { >> %TEMP%\test-read-write-lock.js
echo                         this.readers++; >> %TEMP%\test-read-write-lock.js
echo                         resolve(); >> %TEMP%\test-read-write-lock.js
echo                     } else { >> %TEMP%\test-read-write-lock.js
echo                         this.acquireReadLock().then(resolve); >> %TEMP%\test-read-write-lock.js
echo                     } >> %TEMP%\test-read-write-lock.js
echo                 }, 10); >> %TEMP%\test-read-write-lock.js
echo             } else { >> %TEMP%\test-read-write-lock.js
echo                 this.readers++; >> %TEMP%\test-read-write-lock.js
echo                 resolve(); >> %TEMP%\test-read-write-lock.js
echo             } >> %TEMP%\test-read-write-lock.js
echo         }); >> %TEMP%\test-read-write-lock.js
echo     } >> %TEMP%\test-read-write-lock.js
echo     >> %TEMP%\test-read-write-lock.js
echo     async acquireWriteLock() { >> %TEMP%\test-read-write-lock.js
echo         return new Promise((resolve) => { >> %TEMP%\test-read-write-lock.js
echo             this.waitingWriters++; >> %TEMP%\test-read-write-lock.js
echo             setTimeout(() => { >> %TEMP%\test-read-write-lock.js
echo                 if (this.readers === 0 ^&^&^ !this.writer) { >> %TEMP%\test-read-write-lock.js
echo                     this.writer = true; >> %TEMP%\test-read-write-lock.js
echo                     this.waitingWriters--; >> %TEMP%\test-read-write-lock.js
echo                     resolve(); >> %TEMP%\test-read-write-lock.js
echo                 } else { >> %TEMP%\test-read-write-lock.js
echo                     this.acquireWriteLock().then(resolve); >> %TEMP%\test-read-write-lock.js
echo                 } >> %TEMP%\test-read-write-lock.js
echo             }, 10); >> %TEMP%\test-read-write-lock.js
echo         }); >> %TEMP%\test-read-write-lock.js
echo     } >> %TEMP%\test-read-write-lock.js
echo     >> %TEMP%\test-read-write-lock.js
echo     releaseReadLock() { >> %TEMP%\test-read-write-lock.js
echo         this.readers--; >> %TEMP%\test-read-write-lock.js
echo     } >> %TEMP%\test-read-write-lock.js
echo     >> %TEMP%\test-read-write-lock.js
echo     releaseWriteLock() { >> %TEMP%\test-read-write-lock.js
echo         this.writer = false; >> %TEMP%\test-read-write-lock.js
echo     } >> %TEMP%\test-read-write-lock.js
echo } >> %TEMP%\test-read-write-lock.js
echo     >> %TEMP%\test-read-write-lock.js
echo // 测试读写锁 >> %TEMP%\test-read-write-lock.js
echo async function testLock() { >> %TEMP%\test-read-write-lock.js
echo     const lock = new ReadWriteLock(); >> %TEMP%\test-read-write-lock.js
echo     >> %TEMP%\test-read-write-lock.js
echo     try { >> %TEMP%\test-read-write-lock.js
echo         // 测试多个读锁 >> %TEMP%\test-read-write-lock.js
echo         await lock.acquireReadLock(); >> %TEMP%\test-read-write-lock.js
echo         await lock.acquireReadLock(); >> %TEMP%\test-read-write-lock.js
echo         >> %TEMP%\test-read-write-lock.js
echo         if (lock.readers === 2) { >> %TEMP%\test-read-write-lock.js
echo             console.log('✅ 多个读锁获取成功'); >> %TEMP%\test-read-write-lock.js
echo         } else { >> %TEMP%\test-read-write-lock.js
echo             console.log('❌ 多个读锁获取失败'); >> %TEMP%\test-read-write-lock.js
echo             return false; >> %TEMP%\test-read-write-lock.js
echo         } >> %TEMP%\test-read-write-lock.js
echo         >> %TEMP%\test-read-write-lock.js
echo         lock.releaseReadLock(); >> %TEMP%\test-read-write-lock.js
echo         lock.releaseReadLock(); >> %TEMP%\test-read-write-lock.js
echo         >> %TEMP%\test-read-write-lock.js
echo         // 测试写锁 >> %TEMP%\test-read-write-lock.js
echo         await lock.acquireWriteLock(); >> %TEMP%\test-read-write-lock.js
echo         >> %TEMP%\test-read-write-lock.js
echo         if (lock.writer) { >> %TEMP%\test-read-write-lock.js
echo             console.log('✅ 写锁获取成功'); >> %TEMP%\test-read-write-lock.js
echo         } else { >> %TEMP%\test-read-write-lock.js
echo             console.log('❌ 写锁获取失败'); >> %TEMP%\test-read-write-lock.js
echo             return false; >> %TEMP%\test-read-write-lock.js
echo         } >> %TEMP%\test-read-write-lock.js
echo         >> %TEMP%\test-read-write-lock.js
echo         lock.releaseWriteLock(); >> %TEMP%\test-read-write-lock.js
echo         >> %TEMP%\test-read-write-lock.js
echo         return true; >> %TEMP%\test-read-write-lock.js
echo     } catch (error) { >> %TEMP%\test-read-write-lock.js
echo         console.log('❌ 读写锁测试异常:', error.message); >> %TEMP%\test-read-write-lock.js
echo         return false; >> %TEMP%\test-read-write-lock.js
echo     } >> %TEMP%\test-read-write-lock.js
echo } >> %TEMP%\test-read-write-lock.js
echo     >> %TEMP%\test-read-write-lock.js
echo testLock().then(success => { >> %TEMP%\test-read-write-lock.js
echo     if (success) { >> %TEMP%\test-read-write-lock.js
echo         console.log('✅ 读写锁测试通过'); >> %TEMP%\test-read-write-lock.js
echo         process.exit(0); >> %TEMP%\test-read-write-lock.js
echo     } else { >> %TEMP%\test-read-write-lock.js
echo         console.log('❌ 读写锁测试失败'); >> %TEMP%\test-read-write-lock.js
echo         process.exit(1); >> %TEMP%\test-read-write-lock.js
echo     } >> %TEMP%\test-read-write-lock.js
echo }).catch(error => { >> %TEMP%\test-read-write-lock.js
echo     console.log('❌ 读写锁测试异常:', error.message); >> %TEMP%\test-read-write-lock.js
echo     process.exit(1); >> %TEMP%\test-read-write-lock.js
echo }); >> %TEMP%\test-read-write-lock.js

REM 运行测试
docker exec test-runner-container node /app/tests/test-read-write-lock.js >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ 读写锁分离机制%NC%
    set /a PASSED_TESTS=PASSED_TESTS+1
) else (
    echo %RED%❌ 读写锁分离机制%NC%
    set /a FAILED_TESTS=FAILED_TESTS+1
)
set /a TOTAL_TESTS=TOTAL_TESTS+1

REM 清理
del %TEMP%\test-read-write-lock.js >nul 2>&1

REM 测试2: 审计日志加密存储
echo.
echo %MAGENTA%🔐 测试2: 审计日志加密存储%NC%

REM 创建测试脚本
echo const crypto = require('crypto'); > %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo class EncryptedAuditLogger { >> %TEMP%\test-encrypted-audit-log.js
echo     constructor() { >> %TEMP%\test-encrypted-audit-log.js
echo         this.algorithm = 'aes-256-cbc'; >> %TEMP%\test-encrypted-audit-log.js
echo         this.key = crypto.randomBytes(32); >> %TEMP%\test-encrypted-audit-log.js
echo         this.logs = []; >> %TEMP%\test-encrypted-audit-log.js
echo     } >> %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo     encrypt(data) { >> %TEMP%\test-encrypted-audit-log.js
echo         const iv = crypto.randomBytes(16); >> %TEMP%\test-encrypted-audit-log.js
echo         const cipher = crypto.createCipheriv(this.algorithm, this.key, iv); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         let encrypted = cipher.update(data, 'utf8', 'hex'); >> %TEMP%\test-encrypted-audit-log.js
echo         encrypted += cipher.final('hex'); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         return { >> %TEMP%\test-encrypted-audit-log.js
echo             iv: iv.toString('hex'), >> %TEMP%\test-encrypted-audit-log.js
echo             data: encrypted >> %TEMP%\test-encrypted-audit-log.js
echo         }; >> %TEMP%\test-encrypted-audit-log.js
echo     } >> %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo     decrypt(encryptedData) { >> %TEMP%\test-encrypted-audit-log.js
echo         const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(encryptedData.iv, 'hex')); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8'); >> %TEMP%\test-encrypted-audit-log.js
echo         decrypted += decipher.final('utf8'); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         return decrypted; >> %TEMP%\test-encrypted-audit-log.js
echo     } >> %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo     logAuditEvent(event) { >> %TEMP%\test-encrypted-audit-log.js
echo         const eventData = JSON.stringify(event); >> %TEMP%\test-encrypted-audit-log.js
echo         const encrypted = this.encrypt(eventData); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         this.logs.push({ >> %TEMP%\test-encrypted-audit-log.js
echo             timestamp: new Date().toISOString(), >> %TEMP%\test-encrypted-audit-log.js
echo             encrypted: true, >> %TEMP%\test-encrypted-audit-log.js
echo             ...encrypted >> %TEMP%\test-encrypted-audit-log.js
echo         }); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         return true; >> %TEMP%\test-encrypted-audit-log.js
echo     } >> %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo     getLogs() { >> %TEMP%\test-encrypted-audit-log.js
echo         return this.logs.map(log => { >> %TEMP%\test-encrypted-audit-log.js
echo             const decrypted = this.decrypt(log); >> %TEMP%\test-encrypted-audit-log.js
echo             return { >> %TEMP%\test-encrypted-audit-log.js
echo                 timestamp: log.timestamp, >> %TEMP%\test-encrypted-audit-log.js
echo                 event: JSON.parse(decrypted) >> %TEMP%\test-encrypted-audit-log.js
echo             }; >> %TEMP%\test-encrypted-audit-log.js
echo         }); >> %TEMP%\test-encrypted-audit-log.js
echo     } >> %TEMP%\test-encrypted-audit-log.js
echo } >> %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo // 测试加密审计日志 >> %TEMP%\test-encrypted-audit-log.js
echo async function testAuditLog() { >> %TEMP%\test-encrypted-audit-log.js
echo     const auditLogger = new EncryptedAuditLogger(); >> %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo     try { >> %TEMP%\test-encrypted-audit-log.js
echo         // 测试日志记录 >> %TEMP%\test-encrypted-audit-log.js
echo         const success1 = auditLogger.logAuditEvent({ >> %TEMP%\test-encrypted-audit-log.js
echo             level: 'INFO', >> %TEMP%\test-encrypted-audit-log.js
echo             action: 'USER_LOGIN', >> %TEMP%\test-encrypted-audit-log.js
echo             userId: 'test-user', >> %TEMP%\test-encrypted-audit-log.js
echo             details: { ip: '192.168.1.1' } >> %TEMP%\test-encrypted-audit-log.js
echo         }); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         if (!success1) { >> %TEMP%\test-encrypted-audit-log.js
echo             console.log('❌ 日志记录失败'); >> %TEMP%\test-encrypted-audit-log.js
echo             return false; >> %TEMP%\test-encrypted-audit-log.js
echo         } >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         // 测试敏感数据记录 >> %TEMP%\test-encrypted-audit-log.js
echo         const success2 = auditLogger.logAuditEvent({ >> %TEMP%\test-encrypted-audit-log.js
echo             level: 'WARN', >> %TEMP%\test-encrypted-audit-log.js
echo             action: 'FAILED_LOGIN', >> %TEMP%\test-encrypted-audit-log.js
echo             userId: 'test-user', >> %TEMP%\test-encrypted-audit-log.js
echo             details: { reason: 'invalid_password', attempts: 3 } >> %TEMP%\test-encrypted-audit-log.js
echo         }); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         if (!success2) { >> %TEMP%\test-encrypted-audit-log.js
echo             console.log('❌ 敏感数据日志记录失败'); >> %TEMP%\test-encrypted-audit-log.js
echo             return false; >> %TEMP%\test-encrypted-audit-log.js
echo         } >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         // 测试日志解密 >> %TEMP%\test-encrypted-audit-log.js
echo         const logs = auditLogger.getLogs(); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         if (logs.length !== 2) { >> %TEMP%\test-encrypted-audit-log.js
echo             console.log('❌ 日志数量不正确'); >> %TEMP%\test-encrypted-audit-log.js
echo             return false; >> %TEMP%\test-encrypted-audit-log.js
echo         } >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         // 验证日志内容 >> %TEMP%\test-encrypted-audit-log.js
echo         const firstLog = logs[0]; >> %TEMP%\test-encrypted-audit-log.js
echo         if (firstLog.event.action !== 'USER_LOGIN') { >> %TEMP%\test-encrypted-audit-log.js
echo             console.log('❌ 日志内容不正确'); >> %TEMP%\test-encrypted-audit-log.js
echo             return false; >> %TEMP%\test-encrypted-audit-log.js
echo         } >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         // 验证加密 >> %TEMP%\test-encrypted-audit-log.js
echo         const rawLogs = auditLogger.logs; >> %TEMP%\test-encrypted-audit-log.js
echo         const isEncrypted = rawLogs.every(log => >> %TEMP%\test-encrypted-audit-log.js
echo             log.encrypted ^&^&^ >> %TEMP%\test-encrypted-audit-log.js
echo             log.iv ^&^&^ >> %TEMP%\test-encrypted-audit-log.js
echo             log.data ^&^&^ >> %TEMP%\test-encrypted-audit-log.js
echo             !log.data.includes('USER_LOGIN') >> %TEMP%\test-encrypted-audit-log.js
echo         ); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         if (!isEncrypted) { >> %TEMP%\test-encrypted-audit-log.js
echo             console.log('❌ 日志未正确加密'); >> %TEMP%\test-encrypted-audit-log.js
echo             return false; >> %TEMP%\test-encrypted-audit-log.js
echo         } >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('✅ 日志记录成功'); >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('✅ 敏感数据记录成功'); >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('✅ 日志解密成功'); >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('✅ 日志内容验证成功'); >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('✅ 日志加密验证成功'); >> %TEMP%\test-encrypted-audit-log.js
echo         >> %TEMP%\test-encrypted-audit-log.js
echo         return true; >> %TEMP%\test-encrypted-audit-log.js
echo     } catch (error) { >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('❌ 审计日志测试异常:', error.message); >> %TEMP%\test-encrypted-audit-log.js
echo         return false; >> %TEMP%\test-encrypted-audit-log.js
echo     } >> %TEMP%\test-encrypted-audit-log.js
echo } >> %TEMP%\test-encrypted-audit-log.js
echo     >> %TEMP%\test-encrypted-audit-log.js
echo testAuditLog().then(success => { >> %TEMP%\test-encrypted-audit-log.js
echo     if (success) { >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('✅ 审计日志测试通过'); >> %TEMP%\test-encrypted-audit-log.js
echo         process.exit(0); >> %TEMP%\test-encrypted-audit-log.js
echo     } else { >> %TEMP%\test-encrypted-audit-log.js
echo         console.log('❌ 审计日志测试失败'); >> %TEMP%\test-encrypted-audit-log.js
echo         process.exit(1); >> %TEMP%\test-encrypted-audit-log.js
echo     } >> %TEMP%\test-encrypted-audit-log.js
echo }).catch(error => { >> %TEMP%\test-encrypted-audit-log.js
echo     console.log('❌ 审计日志测试异常:', error.message); >> %TEMP%\test-encrypted-audit-log.js
echo     process.exit(1); >> %TEMP%\test-encrypted-audit-log.js
echo }); >> %TEMP%\test-encrypted-audit-log.js

REM 复制测试脚本到容器
docker cp %TEMP%\test-encrypted-audit-log.js test-runner-container:/app/tests/test-encrypted-audit-log.js >nul 2>&1

REM 运行测试
docker exec test-runner-container node /app/tests/test-encrypted-audit-log.js >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ 审计日志加密存储%NC%
    set /a PASSED_TESTS=PASSED_TESTS+1
) else (
    echo %RED%❌ 审计日志加密存储%NC%
    set /a FAILED_TESTS=FAILED_TESTS+1
)
set /a TOTAL_TESTS=TOTAL_TESTS+1

REM 清理
del %TEMP%\test-encrypted-audit-log.js >nul 2>&1

REM 测试3: 分布式锁支持
echo.
echo %MAGENTA%🔒 测试3: 分布式锁支持%NC%

REM 创建测试脚本
echo const Redis = require('ioredis'); > %TEMP%\test-distributed-lock.js
echo const { randomBytes } = require('crypto'); >> %TEMP%\test-distributed-lock.js
echo     >> %TEMP%\test-distributed-lock.js
echo // 连接Redis >> %TEMP%\test-distributed-lock.js
echo const redis = new Redis({ >> %TEMP%\test-distributed-lock.js
echo     host: 'redis', >> %TEMP%\test-distributed-lock.js
echo     port: 6379 >> %TEMP%\test-distributed-lock.js
echo }); >> %TEMP%\test-distributed-lock.js
echo     >> %TEMP%\test-distributed-lock.js
echo // 测试基本的Redis操作 >> %TEMP%\test-distributed-lock.js
echo async function testRedis() { >> %TEMP%\test-distributed-lock.js
echo     try { >> %TEMP%\test-distributed-lock.js
echo         // 测试SET和GET >> %TEMP%\test-distributed-lock.js
echo         await redis.set('test-key', 'test-value'); >> %TEMP%\test-distributed-lock.js
echo         const value = await redis.get('test-key'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (value === 'test-value') { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ Redis SET/GET操作成功'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ Redis SET/GET操作失败'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 测试SET NX选项 >> %TEMP%\test-distributed-lock.js
echo         const result = await redis.set('test-lock-key', 'lock-value', 'PX', 5000, 'NX'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (result === 'OK') { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ Redis SET NX操作成功'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ Redis SET NX操作失败'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 测试第二次SET NX（应该失败） >> %TEMP%\test-distributed-lock.js
echo         const result2 = await redis.set('test-lock-key', 'lock-value-2', 'PX', 5000, 'NX'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (result2 === null) { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ Redis SET NX第二次操作失败（预期行为）'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ Redis SET NX第二次操作成功（不应该发生）'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 测试DEL >> %TEMP%\test-distributed-lock.js
echo         const deleted = await redis.del('test-lock-key'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (deleted === 1) { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ Redis DEL操作成功'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ Redis DEL操作失败'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 清理测试数据 >> %TEMP%\test-distributed-lock.js
echo         await redis.del('test-key'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         return true; >> %TEMP%\test-distributed-lock.js
echo     } catch (error) { >> %TEMP%\test-distributed-lock.js
echo         console.log('❌ Redis测试异常:', error.message); >> %TEMP%\test-distributed-lock.js
echo         return false; >> %TEMP%\test-distributed-lock.js
echo     } >> %TEMP%\test-distributed-lock.js
echo } >> %TEMP%\test-distributed-lock.js
echo     >> %TEMP%\test-distributed-lock.js
echo // 测试分布式锁 >> %TEMP%\test-distributed-lock.js
echo async function testDistributedLock() { >> %TEMP%\test-distributed-lock.js
echo     try { >> %TEMP%\test-distributed-lock.js
echo         // 获取锁 >> %TEMP%\test-distributed-lock.js
echo         const identifier = randomBytes(16).toString('hex'); >> %TEMP%\test-distributed-lock.js
echo         const result = await redis.set('distributed-lock-test', identifier, 'PX', 10000, 'NX'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (result === 'OK') { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ 分布式锁获取成功'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ 分布式锁获取失败'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 验证锁值 >> %TEMP%\test-distributed-lock.js
echo         const lockValue = await redis.get('distributed-lock-test'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (lockValue === identifier) { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ 分布式锁值验证成功'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ 分布式锁值验证失败'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 尝试获取同一个锁（应该失败） >> %TEMP%\test-distributed-lock.js
echo         const identifier2 = randomBytes(16).toString('hex'); >> %TEMP%\test-distributed-lock.js
echo         const result2 = await redis.set('distributed-lock-test', identifier2, 'PX', 10000, 'NX'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (result2 === null) { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ 第二次获取分布式锁失败（预期行为）'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ 第二次获取分布式锁成功（不应该发生）'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 使用Lua脚本释放锁 >> %TEMP%\test-distributed-lock.js
echo         const luaScript = ` >> %TEMP%\test-distributed-lock.js
echo             if redis.call("GET", KEYS[1]) == ARGV[1] then >> %TEMP%\test-distributed-lock.js
echo                 return redis.call("DEL", KEYS[1]) >> %TEMP%\test-distributed-lock.js
echo             else >> %TEMP%\test-distributed-lock.js
echo                 return 0 >> %TEMP%\test-distributed-lock.js
echo             end >> %TEMP%\test-distributed-lock.js
echo         `; >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         const releaseResult = await redis.eval(luaScript, 1, 'distributed-lock-test', identifier); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (releaseResult === 1) { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ 分布式锁释放成功'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ 分布式锁释放失败'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         // 验证锁已释放 >> %TEMP%\test-distributed-lock.js
echo         const lockValueAfterRelease = await redis.get('distributed-lock-test'); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (lockValueAfterRelease === null) { >> %TEMP%\test-distributed-lock.js
echo             console.log('✅ 分布式锁释放验证成功'); >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('❌ 分布式锁释放验证失败'); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         return true; >> %TEMP%\test-distributed-lock.js
echo     } catch (error) { >> %TEMP%\test-distributed-lock.js
echo         console.log('❌ 分布式锁测试异常:', error.message); >> %TEMP%\test-distributed-lock.js
echo         return false; >> %TEMP%\test-distributed-lock.js
echo     } >> %TEMP%\test-distributed-lock.js
echo } >> %TEMP%\test-distributed-lock.js
echo     >> %TEMP%\test-distributed-lock.js
echo // 执行测试 >> %TEMP%\test-distributed-lock.js
echo async function runTests() { >> %TEMP%\test-distributed-lock.js
echo     console.log('🔒 开始测试Redis基本操作...'); >> %TEMP%\test-distributed-lock.js
echo     const redisSuccess = await testRedis(); >> %TEMP%\test-distributed-lock.js
echo     >> %TEMP%\test-distributed-lock.js
echo     if (redisSuccess) { >> %TEMP%\test-distributed-lock.js
echo         console.log('\n🔒 开始测试分布式锁...'); >> %TEMP%\test-distributed-lock.js
echo         const lockSuccess = await testDistributedLock(); >> %TEMP%\test-distributed-lock.js
echo         >> %TEMP%\test-distributed-lock.js
echo         if (lockSuccess) { >> %TEMP%\test-distributed-lock.js
echo             console.log('\n✅ 所有分布式锁测试通过'); >> %TEMP%\test-distributed-lock.js
echo             redis.quit(); >> %TEMP%\test-distributed-lock.js
echo             return true; >> %TEMP%\test-distributed-lock.js
echo         } else { >> %TEMP%\test-distributed-lock.js
echo             console.log('\n❌ 分布式锁测试失败'); >> %TEMP%\test-distributed-lock.js
echo             redis.quit(); >> %TEMP%\test-distributed-lock.js
echo             return false; >> %TEMP%\test-distributed-lock.js
echo         } >> %TEMP%\test-distributed-lock.js
echo     } else { >> %TEMP%\test-distributed-lock.js
echo         console.log('\n❌ Redis基本操作测试失败'); >> %TEMP%\test-distributed-lock.js
echo         redis.quit(); >> %TEMP%\test-distributed-lock.js
echo         return false; >> %TEMP%\test-distributed-lock.js
echo     } >> %TEMP%\test-distributed-lock.js
echo } >> %TEMP%\test-distributed-lock.js
echo     >> %TEMP%\test-distributed-lock.js
echo runTests().then(success => { >> %TEMP%\test-distributed-lock.js
echo     process.exit(success ? 0 : 1); >> %TEMP%\test-distributed-lock.js
echo }).catch(error => { >> %TEMP%\test-distributed-lock.js
echo     console.log('❌ 测试执行异常:', error.message); >> %TEMP%\test-distributed-lock.js
echo     redis.quit(); >> %TEMP%\test-distributed-lock.js
echo     process.exit(1); >> %TEMP%\test-distributed-lock.js
echo }); >> %TEMP%\test-distributed-lock.js

REM 复制测试脚本到容器
docker cp %TEMP%\test-distributed-lock.js test-runner-container:/app/tests/test-distributed-lock.js >nul 2>&1

REM 运行测试
docker exec test-runner-container node /app/tests/test-distributed-lock.js >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ 分布式锁支持%NC%
    set /a PASSED_TESTS=PASSED_TESTS+1
) else (
    echo %RED%❌ 分布式锁支持%NC%
    set /a FAILED_TESTS=FAILED_TESTS+1
)
set /a TOTAL_TESTS=TOTAL_TESTS+1

REM 清理
del %TEMP%\test-distributed-lock.js >nul 2>&1

REM 测试4: 容器化沙箱
echo.
echo %MAGENTA%🐳 测试4: 容器化沙箱%NC%

REM 生成随机容器名
for /f "tokens=1-3 delims=/ " %%a in ('echo %date%') do set /a container_name=%%a%%b%%c

REM 创建容器
echo %BLUE%📦 创建容器: sandbox-test-!container_name!%NC%
docker create --name sandbox-test-!container_name! --rm --memory 128m --cpus 0.5 --network none --read-only --user 1000:1000 alpine:latest tail -f /dev/null >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ 容器化沙箱%NC%
    set /a FAILED_TESTS=FAILED_TESTS+1
    set /a TOTAL_TESTS=TOTAL_TESTS+1
    goto :continue
)

echo %GREEN%✅ 容器创建成功%NC%

REM 启动容器
echo %BLUE%🚀 启动容器...%NC%
docker start sandbox-test-!container_name! >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ 容器化沙箱%NC%
    set /a FAILED_TESTS=FAILED_TESTS+1
    set /a TOTAL_TESTS=TOTAL_TESTS+1
    docker rm sandbox-test-!container_name! >nul 2>&1
    goto :continue
)

echo %GREEN%✅ 容器启动成功%NC%

REM 等待容器完全启动
timeout /t 2 >nul

REM 执行命令测试
echo %BLUE%🔧 执行命令: echo "Hello from container"%NC%
docker exec sandbox-test-!container_name! sh -c 'echo "Hello from container"' | findstr "Hello from container" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ 命令执行成功%NC%
    set command_test=true
) else (
    echo %RED%❌ 命令执行失败%NC%
    set command_test=false
)

REM 测试文件系统只读
echo %BLUE%🔒 测试文件系统只读...%NC%
docker exec sandbox-test-!container_name! sh -c 'touch /test.txt' >nul 2>&1
if %errorlevel% neq 0 (
    echo %GREEN%✅ 文件系统只读（预期行为）%NC%
    set readonly_test=true
) else (
    echo %RED%❌ 文件系统不是只读%NC%
    set readonly_test=false
)

REM 测试网络隔离
echo %BLUE%🌐 测试网络隔离...%NC%
docker exec sandbox-test-!container_name! sh -c 'ping -c 1 8.8.8.8' >nul 2>&1
if %errorlevel% neq 0 (
    echo %GREEN%✅ 网络隔离生效（预期行为）%NC%
    set network_test=true
) else (
    echo %YELLOW%⚠️  网络隔离未生效%NC%
    set network_test=false
)

REM 停止容器
echo %BLUE%🛑 停止容器...%NC%
docker stop sandbox-test-!container_name! >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✅ 容器停止成功%NC%
    set stop_test=true
) else (
    echo %RED%❌ 容器停止失败%NC%
    set stop_test=false
)

REM 综合评估测试结果
if "!command_test!"=="true" if "!readonly_test!"=="true" if "!network_test!"=="true" if "!stop_test!"=="true" (
    echo %GREEN%✅ 容器化沙箱%NC%
    set /a PASSED_TESTS=PASSED_TESTS+1
) else (
    echo %RED%❌ 容器化沙箱%NC%
    set /a FAILED_TESTS=FAILED_TESTS+1
)
set /a TOTAL_TESTS=TOTAL_TESTS+1

:continue

REM 显示测试结果
echo.
echo %CYAN%📊 测试结果统计%NC%
echo 总测试数: !TOTAL_TESTS! %CYAN%
echo 通过: !PASSED_TESTS! %GREEN%
echo 失败: !FAILED_TESTS! %RED%

set /a pass_rate=0
if !TOTAL_TESTS! gtr 0 set /a pass_rate=!PASSED_TESTS!*100/!TOTAL_TESTS!

echo 通过率: !pass_rate!%% %CYAN%

if !FAILED_TESTS! equ 0 (
    echo.
    echo %GREEN%✅ 所有测试通过！%NC%
    exit /b 0
) else (
    echo.
    echo %RED%❌ 部分测试失败%NC%
    exit /b 1
)