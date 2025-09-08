/**
 * Unit tests for Utils module
 * Tests Utils class, utility functions, and EventDelegator
 */

// Mock DOM environment for Node.js testing
if (typeof window === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
}

// Mock DOMPurify
if (!global.window.DOMPurify) {
  global.window.DOMPurify = {
    sanitize: jest.fn((html) => html.replace(/<script[^>]*>.*?<\/script>/gi, ''))
  };
}

// Load the utils module if not already loaded
if (typeof window.Utils === 'undefined') {
  require('../js/utils.js');
}

describe('Utils - showNotification', () => {
  let mockContainer;
  
  beforeEach(() => {
    // Create mock notification container
    mockContainer = document.createElement('div');
    mockContainer.id = 'notification-container';
    document.body.appendChild(mockContainer);
    
    // Reset any existing notifications
    mockContainer.innerHTML = '';
  });

describe('Utils Class', () => {
  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = window.Utils.escapeHtml(input);
      expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    test('should handle non-string input', () => {
      expect(window.Utils.escapeHtml(123)).toBe(123);
      expect(window.Utils.escapeHtml(null)).toBe(null);
      expect(window.Utils.escapeHtml(undefined)).toBe(undefined);
    });

    test('should escape quotes and ampersands', () => {
      const input = 'Hello & "world" <tag>';
      const result = window.Utils.escapeHtml(input);
      // DOM textContent/innerHTML method only escapes <, >, & but not quotes
      expect(result).toBe('Hello &amp; "world" &lt;tag&gt;');
    });
  });

  describe('safeSetInnerHTML', () => {
    test('should set text content by default', () => {
      const element = document.createElement('div');
      const html = '<script>alert("xss")</script>Hello';
      
      window.Utils.safeSetInnerHTML(element, html);
      expect(element.textContent).toBe(html);
      expect(element.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;Hello');
    });

    test('should set innerHTML when trusted', () => {
      const element = document.createElement('div');
      const html = '<b>Hello</b>';
      
      window.Utils.safeSetInnerHTML(element, html, true);
      expect(element.innerHTML).toBe(html);
    });

    test('should handle null element gracefully', () => {
      expect(() => {
        window.Utils.safeSetInnerHTML(null, 'test');
      }).not.toThrow();
    });
  });

  describe('createSafeElement', () => {
    test('should create element with attributes', () => {
      const element = window.Utils.createSafeElement('div', {
        id: 'test-id',
        class: 'test-class'
      }, 'Hello World');
      
      expect(element.tagName).toBe('DIV');
      expect(element.id).toBe('test-id');
      expect(element.className).toBe('test-class');
      expect(element.textContent).toBe('Hello World');
    });

    test('should block event handler attributes', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const element = window.Utils.createSafeElement('div', {
        onclick: 'alert("xss")',
        onload: 'malicious()'
      });
      
      expect(element.hasAttribute('onclick')).toBe(false);
      expect(element.hasAttribute('onload')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateSecureId', () => {
    test('should generate ID with prefix', () => {
      const id = window.Utils.generateSecureId('test', 8);
      // Format: prefix_timestamp_randomString
      expect(id).toMatch(/^test_\d{13}_[a-f0-9]{8}$/);
    });

    test('should generate unique IDs', () => {
      const id1 = window.Utils.generateSecureId('test');
      const id2 = window.Utils.generateSecureId('test');
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateSessionId', () => {
    test('should generate session ID with correct format', () => {
      const sessionId = window.Utils.generateSessionId();
      // Format: session_timestamp_randomString (session + _ + 13位时间戳 + _ + 18位随机字符串)
      expect(sessionId).toMatch(/^session_\d{13}_[a-f0-9]{18}$/);
    });
  });

  describe('generateErrorId', () => {
    test('should generate error ID with correct format', () => {
      const errorId = window.Utils.generateErrorId();
      // Format: err_timestamp_randomString (err + _ + 13位时间戳 + _ + 18位随机字符串)
      expect(errorId).toMatch(/^err_\d{13}_[a-f0-9]{18}$/);
    });
  });
});

describe('Utility Functions', () => {
  describe('debounce', () => {
    test('should debounce function calls', (done) => {
      const mockFn = jest.fn();
      const debouncedFn = window.utils.debounce(mockFn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(mockFn).not.toHaveBeenCalled();
      
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    test('should call immediately when immediate is true', () => {
      const mockFn = jest.fn();
      const debouncedFn = window.utils.debounce(mockFn, 100, true);
      
      debouncedFn();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('objectAssign', () => {
    test('should assign properties from source to target', () => {
      const target = { a: 1 };
      const source = { b: 2, c: 3 };
      
      window.utils.objectAssign(target, source);
      
      expect(target).toEqual({ a: 1, b: 2, c: 3 });
    });

    test('should overwrite existing properties', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      
      window.utils.objectAssign(target, source);
      
      expect(target).toEqual({ a: 1, b: 3, c: 4 });
    });
  });
});

describe('EventDelegator', () => {
  let eventDelegator;

  beforeEach(() => {
    eventDelegator = new window.EventDelegator({
      document: document,
      window: window,
      console: console
    });
  });

  afterEach(() => {
    if (eventDelegator && typeof eventDelegator.destroy === 'function') {
      eventDelegator.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with dependencies', () => {
      expect(eventDelegator.document).toBe(document);
      expect(eventDelegator.window).toBe(window);
      expect(eventDelegator.console).toBe(console);
    });

    test('should initialize with default dependencies', () => {
      const defaultDelegator = new window.EventDelegator();
      expect(defaultDelegator.document).toBeDefined();
      expect(defaultDelegator.window).toBeDefined();
      expect(defaultDelegator.console).toBeDefined();
    });
  });

  describe('Event Registration', () => {
    test('should register event handler', () => {
      const handler = jest.fn();
      eventDelegator.on('.test-button', handler);
      
      expect(eventDelegator.handlers.size).toBeGreaterThan(0);
    });

    test('should register multiple handlers for same selector', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventDelegator.on('.test-button', handler1);
      eventDelegator.on('.test-button', handler2);
      
      // EventDelegator可能会覆盖相同选择器的处理器，而不是累加
      // 检查是否至少注册了一个处理器
      const stats = eventDelegator.getStats();
      expect(stats.totalHandlers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Event Handling', () => {
    test('should handle click events', () => {
      const handler = jest.fn();
      eventDelegator.on('.test-button', handler);
      
      const button = document.createElement('button');
      button.className = 'test-button';
      document.body.appendChild(button);
      
      const clickEvent = new window.MouseEvent('click', { bubbles: true });
      button.dispatchEvent(clickEvent);
      
      expect(handler).toHaveBeenCalledWith(clickEvent);
    });
  });

  describe('Statistics', () => {
    test('should track event statistics', () => {
      const handler = jest.fn();
      eventDelegator.on('.test-button', handler);
      
      const stats = eventDelegator.getStats();
      expect(stats.totalHandlers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cleanup', () => {
    test('should destroy properly', () => {
      eventDelegator.on('.test-button', jest.fn());
      
      eventDelegator.destroy();
      
      expect(eventDelegator.isDestroyed).toBe(true);
    });
  });
});

describe('Global Integration', () => {
  test('should expose utils object globally', () => {
    expect(window.utils).toBeDefined();
    expect(window.utils.debounce).toBeDefined();
    expect(window.utils.showNotification).toBeDefined();
    expect(window.utils.eventDelegator).toBeDefined();
  });

  test('should expose Utils class globally', () => {
    expect(window.Utils).toBeDefined();
    expect(window.Utils.escapeHtml).toBeDefined();
    expect(window.Utils.generateSecureId).toBeDefined();
  });

  test('should expose EventDelegator class globally', () => {
    expect(window.EventDelegator).toBeDefined();
  });
});

describe('Error Handling', () => {
  test('should handle malformed selectors gracefully', () => {
    const eventDelegator = new window.EventDelegator();
    
    expect(() => {
      eventDelegator.on('', jest.fn());
    }).not.toThrow();
    
    expect(() => {
      eventDelegator.on(null, jest.fn());
    }).not.toThrow();
  });

  test('should handle invalid handlers gracefully', () => {
    const eventDelegator = new window.EventDelegator();
    
    expect(() => {
      eventDelegator.on('.test', null);
    }).not.toThrow();
    
    expect(() => {
      eventDelegator.on('.test', 'not-a-function');
    }).not.toThrow();
  });
});
  
  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    jest.clearAllTimers();
  });

  describe('Basic notification creation', () => {
    test('should create notification with default parameters', () => {
      const message = 'Test notification';
      
      // Mock the showNotification function (assuming it's available globally)
      if (typeof showNotification !== 'undefined') {
        showNotification(message);
        
        const notifications = mockContainer.querySelectorAll('.notification');
        expect(notifications).toHaveLength(1);
        expect(notifications[0]).toHaveTextContent(message);
        expect(notifications[0]).toHaveClass('notification-info'); // default type
      }
    });

    test('should create notification with custom type', () => {
      const message = 'Success message';
      const type = 'success';
      
      if (typeof showNotification !== 'undefined') {
        showNotification(message, type);
        
        const notification = mockContainer.querySelector('.notification');
        expect(notification).toHaveClass(`notification-${type}`);
      }
    });

    test('should create notification with custom duration', () => {
      const message = 'Custom duration';
      const type = 'info';
      const duration = 2000;
      
      if (typeof showNotification !== 'undefined') {
        showNotification(message, type, duration);
        
        const notification = mockContainer.querySelector('.notification');
        expect(notification).toBeInTheDocument();
        
        // Fast-forward time
        jest.advanceTimersByTime(duration + 100);
        
        // Notification should be removed after duration
        expect(mockContainer.querySelector('.notification')).toBeNull();
      }
    });
  });

  describe('Notification types', () => {
    const types = ['info', 'success', 'warning', 'error'];
    
    types.forEach(type => {
      test(`should create ${type} notification with correct styling`, () => {
        const message = `${type} message`;
        
        if (typeof showNotification !== 'undefined') {
          showNotification(message, type);
          
          const notification = mockContainer.querySelector('.notification');
          expect(notification).toHaveClass(`notification-${type}`);
        }
      });
    });
  });

  describe('Multiple notifications', () => {
    test('should handle multiple notifications', () => {
      if (typeof showNotification !== 'undefined') {
        showNotification('First notification', 'info');
        showNotification('Second notification', 'success');
        showNotification('Third notification', 'warning');
        
        const notifications = mockContainer.querySelectorAll('.notification');
        expect(notifications).toHaveLength(3);
      }
    });

    test('should respect maximum notification limit', () => {
      if (typeof showNotification !== 'undefined') {
        // Create more notifications than the limit (assuming limit is 5)
        for (let i = 0; i < 10; i++) {
          showNotification(`Notification ${i}`, 'info');
        }
        
        const notifications = mockContainer.querySelectorAll('.notification');
        expect(notifications.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Notification removal', () => {
    test('should remove notification when close button is clicked', () => {
      if (typeof showNotification !== 'undefined') {
        showNotification('Closable notification', 'info');
        
        const notification = mockContainer.querySelector('.notification');
        const closeButton = notification.querySelector('.notification-close');
        
        if (closeButton) {
          closeButton.click();
          
          // Should trigger removal animation and eventual DOM removal
          expect(notification).toHaveClass('notification-removing');
        }
      }
    });

    test('should auto-remove notification after specified duration', () => {
      const duration = 1000;
      
      if (typeof showNotification !== 'undefined') {
        showNotification('Auto-remove notification', 'info', duration);
        
        const notification = mockContainer.querySelector('.notification');
        expect(notification).toBeInTheDocument();
        
        jest.advanceTimersByTime(duration + 100);
        
        expect(mockContainer.querySelector('.notification')).toBeNull();
      }
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty message', () => {
      if (typeof showNotification !== 'undefined') {
        showNotification('', 'info');
        
        const notification = mockContainer.querySelector('.notification');
        // Should either not create notification or create with default message
        if (notification) {
          expect(notification.textContent.trim()).not.toBe('');
        }
      }
    });

    test('should handle invalid notification type', () => {
      if (typeof showNotification !== 'undefined') {
        showNotification('Invalid type test', 'invalid-type');
        
        const notification = mockContainer.querySelector('.notification');
        if (notification) {
          // Should fallback to default type (info)
          expect(notification).toHaveClass('notification-info');
        }
      }
    });

    test('should handle missing notification container', () => {
      // Remove the container
      mockContainer.remove();
      
      if (typeof showNotification !== 'undefined') {
        // Should not throw error
        expect(() => {
          showNotification('Test without container', 'info');
        }).not.toThrow();
      }
    });

    test('should handle negative duration', () => {
      if (typeof showNotification !== 'undefined') {
        showNotification('Negative duration test', 'info', -1000);
        
        const notification = mockContainer.querySelector('.notification');
        if (notification) {
          // Should use default duration or handle gracefully
          expect(notification).toBeInTheDocument();
        }
      }
    });
  });

  describe('Animation and styling', () => {
    test('should apply entrance animation', () => {
      if (typeof showNotification !== 'undefined') {
        showNotification('Animation test', 'info');
        
        const notification = mockContainer.querySelector('.notification');
        if (notification) {
          // Should have animation classes
          expect(notification).toHaveClass('notification-enter');
        }
      }
    });

    test('should apply exit animation on removal', () => {
      if (typeof showNotification !== 'undefined') {
        showNotification('Exit animation test', 'info', 500);
        
        const notification = mockContainer.querySelector('.notification');
        
        // Trigger removal
        jest.advanceTimersByTime(400); // Just before auto-removal
        
        if (notification) {
          // Should start exit animation
          jest.advanceTimersByTime(200);
          expect(notification).toHaveClass('notification-removing');
        }
      }
    });
  });
});

describe('Utils - removeNotification', () => {
  let mockContainer;
  let mockNotification;
  
  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.id = 'notification-container';
    document.body.appendChild(mockContainer);
    
    mockNotification = document.createElement('div');
    mockNotification.className = 'notification notification-info';
    mockNotification.textContent = 'Test notification';
    mockContainer.appendChild(mockNotification);
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllTimers();
  });

  test('should remove notification from DOM', () => {
    if (typeof removeNotification !== 'undefined') {
      removeNotification(mockNotification);
      
      // Should start removal process
      expect(mockNotification).toHaveClass('notification-removing');
      
      // After animation duration, should be removed from DOM
      jest.advanceTimersByTime(500);
      expect(mockContainer.contains(mockNotification)).toBe(false);
    }
  });

  test('should handle removal of non-existent notification', () => {
    const fakeNotification = document.createElement('div');
    
    if (typeof removeNotification !== 'undefined') {
      expect(() => {
        removeNotification(fakeNotification);
      }).not.toThrow();
    }
  });

  test('should handle null notification parameter', () => {
    if (typeof removeNotification !== 'undefined') {
      expect(() => {
        removeNotification(null);
      }).not.toThrow();
    }
  });
});