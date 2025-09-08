/**
 * Jest测试环境设置
 * 生成时间: 2025-01-07 19:15:00
 * 用途: 配置Jest测试环境和全局设置
 */

// 模拟浏览器环境
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// 模拟fetch API
global.fetch = jest.fn();

// 模拟console方法以避免测试输出污染
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置测试超时
jest.setTimeout(10000);

// 清理函数
beforeEach(() => {
  // 清理localStorage和sessionStorage模拟
  localStorage.clear.mockClear();
  localStorage.getItem.mockClear();
  localStorage.setItem.mockClear();
  localStorage.removeItem.mockClear();
  
  sessionStorage.clear.mockClear();
  sessionStorage.getItem.mockClear();
  sessionStorage.setItem.mockClear();
  sessionStorage.removeItem.mockClear();
  
  // 清理fetch模拟
  fetch.mockClear();
  
  // 清理console模拟
  console.log.mockClear();
  console.error.mockClear();
  console.warn.mockClear();
});

// 全局测试工具函数
global.createMockElement = (tagName, attributes = {}) => {
  const element = document.createElement(tagName);
  Object.keys(attributes).forEach(key => {
    element.setAttribute(key, attributes[key]);
  });
  return element;
};

global.createMockForm = (fields = {}) => {
  const form = document.createElement('form');
  Object.keys(fields).forEach(name => {
    const input = document.createElement('input');
    input.name = name;
    input.value = fields[name];
    form.appendChild(input);
  });
  return form;
};

// 模拟DOM查询方法
global.mockQuerySelector = (selector, element = null) => {
  const originalQuerySelector = document.querySelector;
  document.querySelector = jest.fn().mockReturnValue(element);
  return () => {
    document.querySelector = originalQuerySelector;
  };
};

// 异步测试工具
global.waitFor = (condition, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};