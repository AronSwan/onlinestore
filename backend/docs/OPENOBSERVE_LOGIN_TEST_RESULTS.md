# OpenObserve 登录测试结果

## 测试环境

- **操作系统**: Windows
- **OpenObserve 版本**: latest (Docker 镜像)
- **访问地址**: http://localhost:5080

## 测试结果

### 服务状态
✅ **OpenObserve 服务正在运行**
- Web 界面可访问 (HTTP 200)
- API 端点响应正常
- 健康检查返回 401 (需要认证)

### 登录测试
❌ **默认凭据测试失败**

尝试的凭据组合：
1. `admin@example.com` / `Complexpass#123` - 失败 (401)
2. `admin@openobserve.com` / `admin` - 失败 (401)
3. `admin` / `admin` - 失败 (401)

### 日志分析
✅ **发现成功登录记录**

从容器日志中发现：
```
2025-10-06T04:05:33.933626796+00:00 INFO actix_web::middleware::logger: 172.17.0.1 "POST /auth/login HTTP/1.1" 200 32 "50" "http://localhost:5080/web/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" 1.121092
2025-10-06T04:05:34.000714913+00:00 INFO actix_web::middleware::logger: 172.17.0.1 "GET /web/ HTTP/1.1" 200 458 "-" "http://localhost:5080/web/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" 0.013825
```

这表明在 04:05:33 有人成功登录并访问了主页。

## 问题分析

### 可能的原因
1. **默认用户可能已被修改** - 有人可能已经更改了默认凭据
2. **需要先注册** - 某些 OpenObserve 版本可能需要先注册用户
3. **环境变量未生效** - Docker 容器可能没有正确读取环境变量
4. **版本差异** - 不同版本的 OpenObserve 可能有不同的默认凭据

### 解决方案

#### 方案 1：重置 OpenObserve (推荐)
```bash
# 停止容器
docker-compose -f docker/openobserve/docker-compose.yml down

# 删除数据卷（注意：这会删除所有数据）
docker volume rm openobserve_data

# 重新启动
docker-compose -f docker/openobserve/docker-compose.yml up -d

# 等待服务启动
sleep 30

# 使用快速修复脚本
./scripts/quick-fix-openobserve.sh
```

#### 方案 2：检查环境变量
确保 Docker Compose 文件中的环境变量正确设置：
```yaml
environment:
  - ZO_ROOT_USER_EMAIL=admin@example.com
  - ZO_ROOT_USER_PASSWORD=Complexpass#123
```

#### 方案 3：尝试其他凭据
根据 OpenObserve 版本不同，尝试以下凭据：
- `root@example.com` / `root`
- `admin` / `admin123`
- `admin` / `password`

#### 方案 4：直接访问 Web 界面
1. 打开浏览器，访问 http://localhost:5080/web/login
2. 查看页面是否有"注册"或"忘记密码"选项
3. 尝试注册新用户

#### 方案 5：使用 Docker exec 直接操作
```bash
# 进入容器
docker exec -it openobserve bash

# 查看配置文件
cat /data/config/*.yaml
```

## 测试命令

以下是在 PowerShell 中使用的测试命令：

```powershell
# 检查服务状态
try { 
    (Invoke-WebRequest -Uri http://localhost:5080/api/_health -UseBasicParsing).StatusCode 
} catch { 
    $_.Exception.Response.StatusCode.Value__ 
}

# 测试登录
$body = '{"email":"admin@example.com","password":"Complexpass#123"}'
try { 
    $response = Invoke-RestMethod -Uri http://localhost:5080/api/default/login -Method POST -Body $body -ContentType "application/json"
    Write-Host "Login successful! Token:" $response.token.Substring(0,20) "..."
} catch { 
    Write-Host "Login failed:" $_.Exception.Message 
}

# 查看容器日志
docker logs openobserve | Select-String -Pattern "login|auth|user|password"
```

## 建议

1. **使用快速修复脚本** - 运行 `./scripts/quick-fix-openobserve.sh reset` 完全重置服务
2. **检查官方文档** - 不同版本的 OpenObserve 可能有不同的默认凭据
3. **考虑使用环境变量** - 确保在 Docker Compose 中正确设置环境变量
4. **查看容器日志** - 使用 `docker logs openobserve` 查看详细的启动信息

## 结论

OpenObserve 服务正在运行，但默认凭据似乎不正确或已被修改。建议使用快速修复脚本重置服务，或者尝试在 Web 界面上注册新用户。如果问题仍然存在，可能需要检查特定版本的 OpenObserve 文档或考虑使用不同的凭据组合。