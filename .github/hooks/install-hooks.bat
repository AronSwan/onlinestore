@echo off
REM Install Git hooks for security checks (Windows version)
REM 安装 Git 钩子以进行安全检查（Windows 版本）

echo 🔧 Installing Git security hooks...
echo.

REM Get the project root directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%\..\..\"
set PROJECT_ROOT=%CD%
set GIT_HOOKS_DIR=%PROJECT_ROOT%\.git\hooks
set SOURCE_HOOKS_DIR=%PROJECT_ROOT%\.github\hooks

REM Check if .git directory exists
if not exist "%PROJECT_ROOT%\.git" (
    echo ❌ Error: Not a Git repository
    exit /b 1
)

REM Create hooks directory if it doesn't exist
if not exist "%GIT_HOOKS_DIR%" mkdir "%GIT_HOOKS_DIR%"

REM Copy pre-commit hook (remove .sh extension for Git Bash compatibility)
if exist "%SOURCE_HOOKS_DIR%\pre-commit" (
    copy /Y "%SOURCE_HOOKS_DIR%\pre-commit" "%GIT_HOOKS_DIR%\pre-commit" >nul
    echo ✅ Pre-commit hook installed
) else (
    echo ⚠️  Warning: pre-commit hook source file not found
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ Git hooks installation complete!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo The following hooks are now active:
echo   - pre-commit: Prevents committing sensitive files
echo.
echo These hooks will automatically check for:
echo   • SSH private keys
echo   • .env files with secrets
echo   • Certificates and tokens
echo   • Credentials in file contents
echo.
echo To bypass these checks (NOT RECOMMENDED):
echo   git commit --no-verify
echo.

pause
