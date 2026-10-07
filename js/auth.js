/**
 * Reich 登录/注册页面的JavaScript逻辑
 * 处理表单切换、表单验证和提交等功能
 */
// 用途：用户认证功能（登录/注册）
// 依赖文件：js/shared/return-url-guard.js（returnUrl 安全校验纯函数，node --test 覆盖）
// 作者：AI Assistant
// 时间：2025-01-26 15:30:00

// returnUrl 安全校验抽到共享纯函数模块（双盲审 P1-1 修复，2026-10-05）：
// 拒绝一切控制字符（C0/DEL/C1，浏览器剥 TAB/LF/CR 可使 /\t//host 变协议相对
// 跨源），并对规范化视图做白名单复检——对抗用例见 js/shared/return-url.test.js
import { isSafeReturnUrl } from './shared/return-url-guard.js';

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

  // B3（流程体验官终版裁决 2026-10-06）：回头官认邮箱——退出不清 last_email，
  // 登录页预填 + "记住我"勾选随 localStorage 复原（勾选留存/不勾即忘在 login() 落笔）
  try {
    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) {
      const loginEmailInput = document.getElementById("login-email");
      if (loginEmailInput) loginEmailInput.value = lastEmail;
    }
    const rememberBox = document.getElementById("remember-me");
    if (rememberBox) rememberBox.checked = localStorage.getItem("remember_me") === "1";
  } catch (storageError) {
    /* 隐私模式：预填是锦上添花，静默跳过 */
  }

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
  // data-submit-bound 标志：告知 login-enhanced.js 本表单已绑定真实提交处理，
  // 避免同一表单被绑定两次 submit 造成双重提交
  loginForm.dataset.submitBound = "auth";
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
  registerForm.dataset.submitBound = "auth";
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
        
    if (validateRegisterForm()) {
        // 作者：AI Assistant
        // 时间：2025-01-26 15:30:00
        // 修复：更新元素ID以匹配login.html中的实际ID
        const username = document.getElementById("register-username").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;

      // 调用注册API
      await register(username, email, password);
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

  // 权益批 A4（隐私 P1③）：DOM 元素打印调试残留删除（含密码输入框引用四行）
  if (loginEmail) {
    loginEmail.addEventListener("input", function() {
      validateEmail(this.value);
    });
  }
  if (loginPassword) {
    loginPassword.addEventListener("input", function() {
      // A1（流程体验官终版裁决）：登录端密码输入期同删四件套校验——只清错误不设新槛
      // （注册政策 M8·C7 已放宽 8 位起步，输入期四件套拦合法密码属同一死亡路径）
      hideError("login-password");
    });
  }
    
  // 注册表单输入验证
  const registerName = document.getElementById("register-username");
    const registerEmail = document.getElementById("register-email");
    const registerPassword = document.getElementById("register-password");
    const registerConfirmPassword = document.getElementById("confirm-password");
  // （权益批 A4：同上——registerPassword/confirmPassword 打印行一并删除）
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
 * A1（流程体验官终版裁决 2026-10-06）：登录端密码删四件套校验只留非空——
 * 凭证交后端裁（401）；旧校验把注册政策（8 位起步）下完全合法的密码拦死在
 * 客户端，构成"注册成功→登录失败"死亡路径（全站最重 P1）
 */
function validateLoginForm() {
  const emailElement = document.getElementById("login-email");
  const passwordElement = document.getElementById("login-password");

  if (!emailElement || !passwordElement) {
    return false;
  }

  const email = emailElement.value.trim();
  const password = passwordElement.value;

  let isValid = true;

  // 验证邮箱
  if (!validateEmail(email)) {
    showError("login-email", "请输入有效的电子邮箱");
    isValid = false;
  } else {
    hideError("login-email");
  }

  // 验证密码：只留非空
  if (!password) {
    showError("login-password", "请输入密码");
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
    
  // 验证用户名
  if (!validateName(name)) {
    showError("register-username", "用户名须为3-20位字母、数字或下划线");
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
    showError("register-password", "密码至少 8 位，需包含大写字母、小写字母和数字，符号可用 @ $ ! % * ? &（其余符号暂不支持）");
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
 * 与后端注册规则对齐（auth.dto.ts @Matches）：至少8位，同时含大小写、数字，
 * 特殊字符限 [@$!%*?&]（七个符号）——旧写 [^A-Za-z0-9] 认任意符号（"Reich2026#" 前端
 * 过后端 400），⑥审批1①+求真席 P2-4 对齐
 */
function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[@$!%*?&]/.test(password)
  );
}

/**
 * 验证用户名
 * 与后端及 login.html pattern 语义对齐：3-20位字母、数字或下划线
 */
function validateName(name) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(name || "");
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
 * A2（流程体验官终版裁决）：错误单一出口——统一写专用槽 #<fieldId>-error 红字
 * （与 login-utils/login-enhanced 同一槽位体系）；不再向父元素 append 第二套
 * p.error-message，提交失败不再叠加双份文案。message 为空串时只亮红边不写文案
 * （原"登录失败二连写法"的密码框高亮语义保留）
 */
function showError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }

  // 错误样式（槽位体系口径：is-invalid 红边，login.css）
  input.classList.add("is-invalid");
  input.classList.remove("is-valid");

  // UI 批修复循环（验收 X1/X2 虚报勘正）：聚焦+滚到首个错误字段——
  // 旧写只红字不聚焦，密码框在表单中部、视线在按钮上根本不知道哪里错了
  try {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center", behavior: "smooth" });
  } catch (e) { /* 老浏览器降级：聚焦本身不失败 */ }

  const errorElement = document.getElementById(inputId + "-error");
  if (!errorElement) {
    return;
  }

  if (message) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  } else {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }
}

/**
 * 隐藏错误信息（A2：槽位清空——校验通过清空，不写绿字）
 */
function hideError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }

  input.classList.remove("is-invalid");

  const errorElement = document.getElementById(inputId + "-error");
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }
}

// 权益批 B11（隐私 P2④）：双份令牌清理——登录/注册成功时清空另一存储，
// 防止"记住我"与未勾选两种登录方式交替后旧令牌残留在另一存储里
// （"记住我"逻辑不变：勾选写 localStorage，不勾写 sessionStorage；切换时旧存储清）
const AUTH_STORAGE_KEYS = ["userLoggedIn", "userEmail", "token", "refreshToken", "userId"];
function clearAuthStorage(store) {
  AUTH_STORAGE_KEYS.forEach((k) => store.removeItem(k));
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
  loginButton.innerHTML = '<svg class="icon-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg> 登录中...';
    
  try {
    // B3（流程体验官终版裁决）："记住我"随 localStorage——勾选留存邮箱供下次预填
    // （退出登录的五键清理不含 last_email，预填跨会话保留）；不勾即忘
    try {
      if (rememberMe) {
        localStorage.setItem("last_email", email);
        localStorage.setItem("remember_me", "1");
      } else {
        localStorage.removeItem("last_email");
        localStorage.setItem("remember_me", "0");
      }
    } catch (storageError) {
      /* 隐私模式：偏好留存是锦上添花，静默跳过 */
    }

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
      // 后端登录响应形状为 { access_token, refresh_token, expires_in, user }
      // （见 backend/src/auth/auth.service.ts 的 LoginResponse / generateTokens）。
      // 兼容读取两种命名，避免把字符串 "undefined" 存进 storage。
      const accessToken = data.access_token || data.token;
      const refreshToken = data.refresh_token || data.refreshToken;

      if (!accessToken || !refreshToken) {
        // 响应缺少有效令牌：不能走"成功"分支，防止存储无效令牌
        showError("login-email", "登录响应异常：未返回有效令牌，请稍后重试");
        return;
      }

      // 存储用户登录状态和令牌（键名保持 'token'/'refreshToken'/'userId'，
      // 下游 orders.js、cart.js 等按同名键读取）
      const user = data.user;
      const userId = user && user.id != null ? String(user.id) : null;
      if (rememberMe) {
        clearAuthStorage(sessionStorage); // B11：勾选写 LS 前清 SS 旧令牌
        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("token", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        if (userId) {
          localStorage.setItem("userId", userId);
        }
      } else {
        clearAuthStorage(localStorage); // B11：不勾写 SS 前清 LS 旧令牌
        sessionStorage.setItem("userLoggedIn", "true");
        sessionStorage.setItem("userEmail", email);
        sessionStorage.setItem("token", accessToken);
        sessionStorage.setItem("refreshToken", refreshToken);
        if (userId) {
          sessionStorage.setItem("userId", userId);
        }
      }
      
      // 登录成功——⑥审移交批1⑪（Y1 P3-6）：400ms 跳转下成功 toast 腰斩不可读
      // （冗余反馈），跳转本身即成功反馈，不再发 toast

      // 确保使用绝对路径跳转，避免相对路径问题。
      // M3(2026-10-04) 管理页登录分流守卫：登录页带 ?returnUrl= 时回到来处
      // （如 admin.html）；仅接受站内相对路径，防开放重定向。默认行为不变（回首页）。
      // 审计P1修复(2026-10-04): 黑名单式过滤可被 javascript:（无//）与单斜杠
      // https:/evil.com（浏览器规范化为 https://）绕过——改为白名单: 必须以单/
      // 开头、第二个字符不是/（防协议相对），且首段（到?/#前）不含冒号（防 scheme）。
      // 双盲审P1-1修复(2026-10-05): 白名单可被控制字符走私（/\t//host 四族——
      // 浏览器 URL 解析剥 TAB/LF/CR 后变 ///host 跨源）。校验抽到
      // js/shared/return-url-guard.js：拒绝一切控制字符（C0/DEL/C1）+
      // 规范化视图白名单复检，双保险；不安全一律回首页。
      const returnParam = new URLSearchParams(window.location.search).get("returnUrl");
      const isSafeReturn = isSafeReturnUrl(returnParam);
      // B2（流程体验官终版裁决）：登录成功跳转 1500→400ms——成功态一闪即走，
      // 不让已通过的用户多等 1.1 秒空窗
      setTimeout(() => {
        window.location.href = isSafeReturn ? returnParam : "/";
      }, 400);
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
async function register(username, email, password) {
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
  registerButton.innerHTML = '<svg class="icon-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg> 注册中...';
    
  try {
    // 调用后端注册API
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // 请求体键名与后端 DTO 对齐：username（后端注册接口要求的字段名），
      // 不是 name；否则后端校验会直接拒绝注册
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // 后端注册响应与登录一致：{ access_token, refresh_token, expires_in, user }
      // （见 backend/src/auth/auth.controller.ts register -> auth.service.ts generateTokens）。
      // 兼容读取并在缺失时不走"成功"分支，避免把 "undefined" 存进 storage。
      const accessToken = data.access_token || data.token;
      const refreshToken = data.refresh_token || data.refreshToken;

      if (!accessToken || !refreshToken) {
        showError("register-email", "注册响应异常：未返回有效令牌，请稍后重试或直接登录");
        return;
      }

      // 注册即返回令牌：直接写入会话（注册表单没有"记住我"，默认 sessionStorage，
      // 与登录未勾选 rememberMe 的分支规则一致）
      clearAuthStorage(localStorage); // B11：注册→登录流转残留清（如此前"记住我"残留的 LS 旧令牌）
      sessionStorage.setItem("userLoggedIn", "true");
      sessionStorage.setItem("userEmail", email);
      sessionStorage.setItem("token", accessToken);
      sessionStorage.setItem("refreshToken", refreshToken);
      if (data.user && data.user.id != null) {
        sessionStorage.setItem("userId", String(data.user.id));
      }

      // B1（流程体验官终版裁决）：注册即登录直进——注册接口已发令牌（上面已随
      // "记住我"同规则写入会话），不再送登录页重输一遍密码；与登录同速（400ms）
      // 跳 returnUrl/首页。⑥审移交批1⑪：同登录侧删腰斩 toast，直进即成功反馈

      const returnParam = new URLSearchParams(window.location.search).get("returnUrl");
      const isSafeReturn = isSafeReturnUrl(returnParam);
      setTimeout(() => {
        window.location.href = isSafeReturn ? returnParam : "/";
      }, 400);
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
    messageElement.innerHTML = '<svg class="mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 5-5"/></svg> <span></span>';
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

// 注意：本文件在 login.html 以 <script type="module"> 引入（vite 构建入口），
// 允许使用 import（如 return-url-guard）；但不要加 export——登录页按副作用脚本执行，
// 没有其他模块 import 本文件的函数。
