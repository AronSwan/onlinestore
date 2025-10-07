/**
 * 表单处理脚本
 * 处理新闻订阅、联系表单等交互
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：处理网站表单交互，包括新闻订阅和联系表单的提交、验证和反馈
// 依赖文件：无

class FormHandler {
  constructor() {
    this.bindFormEvents();
  }

  bindFormEvents() {
    // 新闻订阅表单
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleNewsletterSubmit(newsletterForm);
      });
    }

    // 联系表单等其他表单可以在这里添加
  }

  handleNewsletterSubmit(form) {
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput.value.trim();

    if (!this.validateEmail(email)) {
      this.showFormError(form, '请输入有效的电子邮件地址');
      return;
    }

    // 模拟AJAX提交
    this.showFormLoading(form);
    
    setTimeout(() => {
      this.saveSubscriber(email);
      this.showFormSuccess(form, '订阅成功！感谢您订阅我们的新闻通讯。');
      form.reset();
    }, 1000);
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  saveSubscriber(email) {
    let subscribers = JSON.parse(localStorage.getItem('reich_subscribers')) || [];
    if (!subscribers.includes(email)) {
      subscribers.push(email);
      localStorage.setItem('reich_subscribers', JSON.stringify(subscribers));
    }
  }

  showFormLoading(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
    
    // 移除之前的消息状态
    this.removeFormStatus(form);
  }

  showFormSuccess(form, message) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = '订阅';
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'form-status success';
    statusDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    form.appendChild(statusDiv);
    
    setTimeout(() => {
      statusDiv.classList.add('show');
    }, 10);
  }

  showFormError(form, message) {
    this.removeFormStatus(form);
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'form-status error';
    statusDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    form.appendChild(statusDiv);
    
    setTimeout(() => {
      statusDiv.classList.add('show');
    }, 10);
    
    // 重新启用提交按钮
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = '订阅';
    }
  }

  removeFormStatus(form) {
    const existingStatus = form.querySelector('.form-status');
    if (existingStatus) {
      existingStatus.classList.remove('show');
      setTimeout(() => existingStatus.remove(), 300);
    }
  }
}

// 初始化表单处理器
document.addEventListener('DOMContentLoaded', () => {
  new FormHandler();
});