/**
 * 登录处理函数 - 分离的处理逻辑
 */

// 登录处理
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = form.querySelector('#login-email').value;
    const password = form.querySelector('#login-password').value;
    const rememberMe = form.querySelector('#remember-me').checked;

    // 表单验证
    if (!validateEmail(email)) {
        showFieldError('login-email', '请输入有效的邮箱地址');
        return;
    }

    if (password.length < 6) {
        showFieldError('login-password', '密码长度至少6位');
        return;
    }

    // 显示加载状态
    setButtonLoading(submitBtn, true);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                rememberMe
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('登录成功！正在跳转...', 'success');
            
            // 保存认证信息
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
            }
            
            // 跳转到目标页面
            setTimeout(() => {
                const returnUrl = new URLSearchParams(window.location.search).get('return') || '/';
                window.location.href = returnUrl;
            }, 1500);
        } else {
            handleLoginError(response, data);
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// 注册处理
async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const username = form.querySelector('#register-username').value;
    const email = form.querySelector('#register-email').value;
    const password = form.querySelector('#register-password').value;
    const confirmPassword = form.querySelector('#confirm-password').value;
    const agreeTerms = form.querySelector('#agree-terms').checked;

    // 表单验证
    if (username.length < 3 || username.length > 20) {
        showFieldError('register-username', '用户名长度为3-20个字符');
        return;
    }

    if (!validateEmail(email)) {
        showFieldError('register-email', '请输入有效的邮箱地址');
        return;
    }

    if (!validatePassword(password)) {
        showFieldError('register-password', '密码长度至少8位，包含字母和数字');
        return;
    }

    if (password !== confirmPassword) {
        showFieldError('confirm-password', '两次输入的密码不一致');
        return;
    }

    if (!agreeTerms) {
        showNotification('请同意服务条款和隐私政策', 'error');
        return;
    }

    // 显示加载状态
    setButtonLoading(submitBtn, true);

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('注册成功！请查收邮箱验证邮件', 'success');
            
            // 切换到登录表单
            setTimeout(() => {
                document.getElementById('login-tab').click();
                document.getElementById('login-email').value = email;
            }, 2000);
        } else {
            handleRegisterError(response, data);
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// 错误处理
function handleLoginError(response, data) {
    const message = data.message || '登录失败';
    
    switch (response.status) {
        case 400:
            showNotification('请求参数错误', 'error');
            break;
        case 401:
            showNotification('邮箱或密码错误', 'error');
            break;
        case 429:
            showNotification('登录尝试过于频繁，请稍后重试', 'error');
            break;
        case 500:
            showNotification('服务器错误，请稍后重试', 'error');
            break;
        default:
            showNotification(message, 'error');
    }
}

function handleRegisterError(response, data) {
    const message = data.message || '注册失败';
    
    switch (response.status) {
        case 400:
            if (data.field) {
                showFieldError(data.field, data.message);
            } else {
                showNotification(message, 'error');
            }
            break;
        case 409:
            showNotification('邮箱或用户名已存在', 'error');
            break;
        case 429:
            showNotification('注册请求过于频繁，请稍后重试', 'error');
            break;
        default:
            showNotification(message, 'error');
    }
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        handleRegister,
        handleLoginError,
        handleRegisterError
    };
}  