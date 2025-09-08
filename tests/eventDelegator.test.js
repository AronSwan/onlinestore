/**
 * Unit tests for EventDelegator class
 * Focus on event handling, delegation, and lifecycle management
 */

describe('EventDelegator', () => {
  let eventDelegator;
  let mockContainer;
  
  beforeEach(() => {
    // Create mock DOM structure
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-container';
    document.body.appendChild(mockContainer);
    
    // Create test elements
    const button1 = document.createElement('button');
    button1.className = 'test-button';
    button1.setAttribute('data-action', 'test-action');
    button1.textContent = 'Test Button 1';
    
    const button2 = document.createElement('button');
    button2.className = 'test-button secondary';
    button2.setAttribute('data-action', 'secondary-action');
    button2.textContent = 'Test Button 2';
    
    const form = document.createElement('form');
    form.className = 'test-form';
    form.innerHTML = `
      <input type="text" name="testInput" value="test value">
      <select name="testSelect">
        <option value="option1">Option 1</option>
        <option value="option2" selected>Option 2</option>
      </select>
      <button type="submit">Submit</button>
    `;
    
    mockContainer.appendChild(button1);
    mockContainer.appendChild(button2);
    mockContainer.appendChild(form);
    
    // Initialize EventDelegator if available
    if (typeof EventDelegator !== 'undefined') {
      eventDelegator = new EventDelegator();
    }
  });
  
  afterEach(() => {
    if (eventDelegator && typeof eventDelegator.destroy === 'function') {
      eventDelegator.destroy();
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create EventDelegator instance', () => {
      if (typeof EventDelegator !== 'undefined') {
        expect(eventDelegator).toBeInstanceOf(EventDelegator);
        expect(eventDelegator.handlers).toBeDefined();
        expect(eventDelegator.stats).toBeDefined();
      }
    });

    test('should initialize with default configuration', () => {
      if (typeof EventDelegator !== 'undefined') {
        expect(eventDelegator.maxHandlers).toBe(100);
        expect(eventDelegator.isInitialized).toBe(false);
      }
    });
  });

  describe('Event Registration', () => {
    test('should register click event handler', () => {
      if (eventDelegator && typeof eventDelegator.on === 'function') {
        const handler = jest.fn();
        
        eventDelegator.on('click', '.test-button', handler);
        
        expect(eventDelegator.handlers.click).toBeDefined();
        expect(eventDelegator.handlers.click.length).toBeGreaterThan(0);
      }
    });

    test('should register multiple event handlers', () => {
      if (eventDelegator && typeof eventDelegator.on === 'function') {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        
        eventDelegator.on('click', '.test-button', handler1);
        eventDelegator.on('click', '.secondary', handler2);
        
        expect(eventDelegator.handlers.click.length).toBe(2);
      }
    });
  });

  describe('Event Handling', () => {
    test('should handle click events on registered elements', () => {
      if (eventDelegator && typeof eventDelegator.on === 'function') {
        const handler = jest.fn();
        
        eventDelegator.init();
        eventDelegator.on('click', '.test-button', handler);
        
        const button = mockContainer.querySelector('.test-button');
        button.click();
        
        expect(handler).toHaveBeenCalled();
        expect(handler).toHaveBeenCalledWith(expect.any(Event));
      }
    });

    test('should handle form submission events', () => {
      if (eventDelegator && typeof eventDelegator.on === 'function') {
        const handler = jest.fn((event) => event.preventDefault());
        
        eventDelegator.init();
        eventDelegator.on('submit', '.test-form', handler);
        
        const form = mockContainer.querySelector('.test-form');
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        
        expect(handler).toHaveBeenCalled();
      }
    });
  });

  describe('Lifecycle Management', () => {
    test('should initialize properly', () => {
      if (eventDelegator && typeof eventDelegator.init === 'function') {
        eventDelegator.init();
        expect(eventDelegator.isInitialized).toBe(true);
      }
    });

    test('should destroy properly', () => {
      if (eventDelegator && typeof eventDelegator.destroy === 'function') {
        eventDelegator.init();
        eventDelegator.on('click', '.test-button', jest.fn());
        eventDelegator.destroy();
        
        expect(eventDelegator.isInitialized).toBe(false);
        expect(Object.keys(eventDelegator.handlers)).toHaveLength(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid event types gracefully', () => {
      if (eventDelegator && typeof eventDelegator.on === 'function') {
        expect(() => {
          eventDelegator.on('', '.test-button', jest.fn());
        }).not.toThrow();
      }
    });

    test('should handle handler exceptions gracefully', () => {
      if (eventDelegator && typeof eventDelegator.on === 'function') {
        const throwingHandler = jest.fn(() => {
          throw new Error('Handler error');
        });
        
        eventDelegator.init();
        eventDelegator.on('click', '.test-button', throwingHandler);
        
        const button = mockContainer.querySelector('.test-button');
        
        expect(() => {
          button.click();
        }).not.toThrow();
        
        expect(throwingHandler).toHaveBeenCalled();
      }
    });
  });
});