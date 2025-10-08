@echo off
REM 启动OpenObserve服务的Windows批处理脚本

echo 🚀 启动OpenObserve服务...

REM 检查Docker是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker未运行，请先启动Docker
    pause
    exit /b 1
)

REM 检查docker-compose是否安装
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose未安装，请先安装docker-compose
    pause
    exit /b 1
)

REM 创建必要的目录
if not exist ".\logs" mkdir ".\logs"
if not exist ".\data" mkdir ".\data"
if not exist ".\uploads" mkdir ".\uploads"

REM 复制环境变量文件（如果不存在）
if not exist ".\backend\.env" (
    echo 📝 复制环境变量文件...
    copy ".\backend\.env.example" ".\backend\.env" >nul
    echo ⚠️  请编辑 .\backend\.env 文件，配置OpenObserve相关参数
)

REM 启动服务
echo 🔧 启动OpenObserve和相关服务...
docker-compose -f docker-compose.openobserve.yml up -d

REM 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 10 /nobreak >nul

REM 检查服务状态
echo 🔍 检查服务状态...
docker-compose -f docker-compose.openobserve.yml ps

REM 显示服务URL
echo.
echo ✅ 服务已启动！
echo.
echo 📊 OpenObserve界面: http://localhost:5080
echo 🔑 默认账户: admin@example.com / Complexpass#123
echo.
echo 🏥 应用健康检查: http://localhost:3000/health
echo 📝 应用API文档: http://localhost:3000/api
echo.
echo 📋 查看日志命令:
echo    docker-compose -f docker-compose.openobserve.yml logs -f
echo.
echo 🛑 停止服务命令:
echo    docker-compose -f docker-compose.openobserve.yml down
echo.

pause