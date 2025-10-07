/**
 * Reich 登录/注册页面的JavaScript逻辑
 * 处理表单切换、表单验证和提交等功能
 */
// 用途：用户认证功能（登录/注册）
// 依赖文件：无（通过DOM操作）
// 作者：AI Assistant
// 时间：2025-01-26 15:30:00

// DOM元素引用
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginFormContainer = document.getElementById("login-form-container");
const registerFormContainer = document.getElementById("register-form-container");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// 初始化页面
function initAuthPage() {
  // 设置标签切换事件监听
  setupTabSwitching();
    
  // 设置表单提交事件监听
  setupFormSubmissions();
    
  // 添加表单输入验证
  setupFormValidations();
    
  // 应用页面加载动画
  applyPageAnimations();
}

/**
 * 设置登录/注册标签切换功能
 */
function setupTabSwitching() {
  if (!loginTab || !registerTab || !loginFormContainer || !registerFormContainer) {
    console.warn("Some tab elements are missing, tab switching will not work");
    return;
  }
  
  // 登录标签点击事件
  loginTab.addEventListener("click", () => {
    // 切换激活状态样式
    loginTab.classList.add("text-primary", "border-b-2", "border-primary");
    loginTab.classList.remove("text-gray-500");
    registerTab.classList.remove("text-primary", "border-b-2", "border-primary");
    registerTab.classList.add("text-gray-500");
        
    // 切换表单显示
    loginFormContainer.classList.remove("hidden");
    registerFormContainer.classList.add("hidden");
        
    // 添加切换动画
    loginFormContainer.classList.add("fade-in");
    setTimeout(() => {
      loginFormContainer.classList.remove("fade-in");
    }, 600);
  });
    
  // 注册标签点击事件
  registerTab.addEventListener("click", () => {
    // 切换激活状态样式
    registerTab.classList.add("text-primary", "border-b-2", "border-primary");
    registerTab.classList.remove("text-gray-500");
    loginTab.classList.remove("text-primary", "border-b-2", "border-primary");
    loginTab.classList.add("text-gray-500");
        
    // 切换表单显示
    registerFormContainer.classList.remove("hidden");
    loginFormContainer.classList.add("hidden");
        
    // 添加切换动画
    registerFormContainer.classList.add("fade-in");
    setTimeout(() => {
      registerFormContainer.classList.remove("fade-in");
    }, 600);
  });
}

/**
 * 设置表单提交处理
 */
function setupFormSubmissions() {
  if (!loginForm || !registerForm) {
    console.warn("Some form elements are missing, form submissions will not work");
    return;
  }
  
  // 登录表单提交事件
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
        
    if (validateLoginForm()) {
      // 获取表单数据
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      const rememberMe = document.getElementById("remember-me").checked;
            
      // 调用登录API
      await login(email, password, rememberMe);
    }
  });
    
  // 注册表单提交事件
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
        
    if (validateRegisterForm()) {
        // 作者：AI Assistant
        // 时间：2025-01-26 15:30:00
        // 修复：更新元素ID以匹配login.html中的实际ID
        const name = document.getElementById("register-username").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
            
      // 调用注册API
      await register(name, email, password);
    }
  });
}

/**
 * 设置表单输入验证
 */
function setupFormValidations() {
    // 作者：AI Assistant
    // 时间：2025-01-26 15:30:00
    console.log("Setting up form validations...");
    
    // 登录表单验证
    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");
  
  console.log("loginEmail:", loginEmail);
  console.log("loginPassword:", loginPassword);
  
  if (loginEmail) {
    loginEmail.addEventListener("input", function() {
      validateEmail(this.value);
    });
  }
  if (loginPassword) {
    loginPassword.addEventListener("input", function() {
      validatePassword(this.value);
    });
  }
    
  // 注册表单输入验证
  const registerName = document.getElementById("register-username");
    const registerEmail = document.getElementById("register-email");
    const registerPassword = document.getElementById("register-password");
    const registerConfirmPassword = document.getElementById("confirm-password");
  
  console.log("registerName:", registerName);
  console.log("registerEmail:", registerEmail);
  console.log("registerPassword:", registerPassword);
  console.log("registerConfirmPassword:", registerConfirmPassword);
  
  if (registerName) {
    registerName.addEventListener("input", function() {
      validateName(this.value);
    });
  }
  if (registerEmail) {
    registerEmail.addEventListener("input", function() {
      validateEmail(this.value);
    });
  }
  if (registerPassword) {
    registerPassword.addEventListener("input", function() {
      validatePassword(this.value);
    });
  }
  if (registerConfirmPassword) {
    registerConfirmPassword.addEventListener("input", function() {
      validateConfirmPassword(this.value);
    });
  }
}

/**
 * 验证登录表单
 */
function validateLoginForm() {
  const emailElement = document.getElementById("login-email");
  const passwordElement = document.getElementById("login-password");
  
  if (!emailElement || !passwordElement) {
    return false;
  }
  
  const email = emailElement.value;
  const password = passwordElement.value;
    
  let isValid = true;
    
  // 验证邮箱
  if (!validateEmail(email)) {
    showError("login-email", "请输入有效的电子邮箱");
    isValid = false;
  } else {
    hideError("login-email");
  }
    
  // 验证密码
  if (!validatePassword(password)) {
    showError("login-password", "密码不能为空且长度至少为6个字符");
    isValid = false;
  } else {
    hideError("login-password");
  }
    
  return isValid;
}

/**
 * 验证注册表单
 */
function validateRegisterForm() {
    // 作者：AI Assistant
    // 时间：2025-01-26 15:30:00
    // 修复：更新元素ID以匹配login.html中的实际ID（register-name -> register-username, register-confirm-password -> confirm-password）
    const nameElement = document.getElementById("register-username");
    const emailElement = document.getElementById("register-email");
    const passwordElement = document.getElementById("register-password");
    const confirmPasswordElement = document.getElementById("confirm-password");
  const agreeTermsElement = document.getElementById("agree-terms");
  
  if (!nameElement || !emailElement || !passwordElement || !confirmPasswordElement || !agreeTermsElement) {
    return false;
  }
  
  const name = nameElement.value;
  const email = emailElement.value;
  const password = passwordElement.value;
  const confirmPassword = confirmPasswordElement.value;
  const agreeTerms = agreeTermsElement.checked;
    
  let isValid = true;
    
  // 验证姓名
  if (!validateName(name)) {
    showError("register-username", "请输入您的姓名");
            isValid = false;
        } else {
            hideError("register-username");
  }
    
  // 验证邮箱
  if (!validateEmail(email)) {
    showError("register-email", "请输入有效的电子邮箱");
    isValid = false;
  } else {
    hideError("register-email");
  }
    
  // 验证密码
  if (!validatePassword(password)) {
    showError("register-password", "密码不能为空且长度至少为8个字符");
    isValid = false;
  } else {
    hideError("register-password");
  }
    
  // 验证确认密码
  if (!validateConfirmPassword(confirmPassword)) {
    showError("confirm-password", "两次输入的密码不一致");
            isValid = false;
        } else {
            hideError("confirm-password");
  }
    
  // 验证是否同意条款
  if (!agreeTerms) {
    alert("请阅读并同意服务条款和隐私政策");
    isValid = false;
  }
    
  return isValid;
}

/**
 * 验证邮箱格式
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码
 */
function validatePassword(password) {
  return password && password.length >= 6;
}

/**
 * 验证姓名
 */
function validateName(name) {
  return name && name.trim().length > 0;
}

/**
 * 验证确认密码
 */
function validateConfirmPassword(confirmPassword) {
  const password = document.getElementById("register-password").value;
  return confirmPassword === password;
}

/**
 * 显示错误信息
 */
function showError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }
  
  // 移除原有的错误提示
  const existingError = input.parentElement.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }
    
  // 添加错误样式
  input.classList.add("border-red-500");
    
  // 创建错误提示元素
  const errorElement = document.createElement("p");
  errorElement.className = "error-message text-red-500 text-xs mt-1";
  errorElement.textContent = message;
    
  // 添加到父元素
  input.parentElement.appendChild(errorElement);
}

/**
 * 隐藏错误信息
 */
function hideError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }
  
  input.classList.remove("border-red-500");
    
  // 移除错误提示
  const errorElement = input.parentElement.querySelector(".error-message");
  if (errorElement) {
    errorElement.remove();
  }
}

/**
 * 登录API调用
 */
async function login(email, password, rememberMe) {
  // 显示加载状态
  const loginForm = document.getElementById("login-form");
  if (!loginForm) {
    console.error("Login form not found");
    return;
  }
  
  const loginButton = loginForm.querySelector("button[type=\"submit\"]");
  if (!loginButton) {
    console.error("Login button not found");
    return;
  }
  
  const originalButtonText = loginButton.innerHTML;
  loginButton.disabled = true;
  loginButton.innerHTML = "<i class=\"fas fa-circle-notch fa-spin mr-2\"></i> 登录中...";
    
  try {
    // 调用后端登录API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // 存储用户登录状态和令牌
      if (rememberMe) {
        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("token", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
      } else {
        sessionStorage.setItem("userLoggedIn", "true");
        sessionStorage.setItem("userEmail", email);
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("refreshToken", data.refreshToken);
      }
      
      // 登录成功
      showSuccessMessage("登录成功，即将跳转...");
      
      // 确保使用绝对路径跳转，避免相对路径问题
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } else {
      // 登录失败
      showError("login-email", data.message || "登录失败，请检查您的邮箱和密码");
      showError("login-password", "");
    }
  } catch (error) {
    // 捕获可能的错误并显示
    console.error("登录过程中发生错误:", error);  
    showError("login-email", "登录过程中发生错误，请稍后重试");
  } finally {
    // 恢复按钮状态
    loginButton.disabled = false;
    loginButton.innerHTML = originalButtonText;
  }
}

/**
 * 注册API调用
 */
async function register(name, email, password) {
  // 显示加载状态
  const registerForm = document.getElementById("register-form");
  if (!registerForm) {
    console.error("Register form not found");
    return;
  }
  
  const registerButton = registerForm.querySelector("button[type=\"submit\"]");
  if (!registerButton) {
    console.error("Register button not found");
    return;
  }
  
  const originalButtonText = registerButton.innerHTML;
  registerButton.disabled = true;
  registerButton.innerHTML = "<i class=\"fas fa-circle-notch fa-spin mr-2\"></i> 注册中...";
    
  try {
    // 调用后端注册API
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // 注册成功
      showSuccessMessage("注册成功，即将登录...");
      
      // 切换到登录表单
      setTimeout(() => {
        const loginTab = document.getElementById("login-tab");
        const loginEmail = document.getElementById("login-email");
        if (loginTab) {
          loginTab.click();
        }
        if (loginEmail) {
          loginEmail.value = email;
        }
      }, 1500);
    } else {
      // 注册失败
      showError("register-email", data.message || "注册失败，请稍后重试");
    }
  } catch (error) {
    // 捕获可能的错误并显示
    console.error("注册过程中发生错误:", error);  
    showError("register-email", "注册过程中发生错误，请稍后重试");
  } finally {
    // 恢复按钮状态
    registerButton.disabled = false;
    registerButton.innerHTML = originalButtonText;
  }
}

/**
 * 显示成功消息
 */
function showSuccessMessage(message) {
  // 检查是否已存在消息元素
  let messageElement = document.querySelector(".success-message");
    
  if (!messageElement) {
    // 创建成功消息元素
    messageElement = document.createElement("div");
    messageElement.className = "success-message fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-50 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50 fade-in flex items-center";
    messageElement.innerHTML = "<i class=\"fas fa-circle-check mr-2\"></i> <span></span>";
    document.body.appendChild(messageElement);
  }
    
  // 设置消息内容
  const spanElement = messageElement.querySelector("span");
  if (spanElement) {
    spanElement.textContent = message;
  }
  messageElement.classList.remove("hidden");
    
  // 3秒后隐藏消息
  setTimeout(() => {
    messageElement.classList.add("opacity-0");
    setTimeout(() => {
      messageElement.classList.add("hidden");
      messageElement.classList.remove("opacity-0");
    }, 600);
  }, 3000);
}

/**
 * 应用页面加载动画
 */
function applyPageAnimations() {
  // 为页面元素添加动画效果
  const formElements = document.querySelectorAll("input, button");
  formElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add("fade-in");
    }, 100 * index);
  });
}

// DOM加载完成后初始化页面
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthPage);
} else {
  // 如果DOM已经加载完成，则直接初始化
  initAuthPage();
}

// 注意：不要使用export语句，因为这个文件是作为普通脚本引入的
// 如果需要在其他地方复用这些函数，请考虑使用模块化方案如webpack或Rollup
