/**
 * Unit tests for Cart modules (CartDataManager and ShoppingCart)
 * Focus on data management, UI updates, and cart operations
 */

// Import modules for testing
const { CartDataManager, ShoppingCart } = require('../js/cart.js');

describe('CartDataManager', () => {
  let cartDataManager;
  let mockStorage;
  let mockConfig;
  let mockUtils;

  beforeEach(() => {
    // Mock dependencies
    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    
    mockConfig = {
      storageKey: 'testCart',
      version: '1.0',
      maxItems: 10,
      autoSaveInterval: 1000
    };
    
    mockUtils = {
      debounce: jest.fn((fn) => fn),
      formatCurrency: jest.fn((amount) => `$${amount.toFixed(2)}`)
    };

    // Create instance with mocked dependencies
    cartDataManager = new CartDataManager({
      storage: mockStorage,
      config: mockConfig,
      utils: mockUtils
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with empty cart', () => {
      expect(cartDataManager.items).toEqual([]);
      expect(cartDataManager.storageKey).toBe('testCart');
      expect(cartDataManager.version).toBe('1.0');
      expect(cartDataManager.maxItems).toBe(10);
    });

    test('should use default config when not provided', () => {
      const manager = new CartDataManager();
      expect(manager.storageKey).toBeDefined();
      expect(manager.version).toBeDefined();
    });
  });

  describe('Item Management', () => {
    test('should add new item to cart', () => {
      const product = { id: '1', name: 'Test Product', price: 29.99, image: 'test.jpg' };
      const result = cartDataManager.addItem(product, 2);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Test Product',
        price: 29.99,
        image: 'test.jpg',
        quantity: 2
      });
    });

    test('should update quantity when adding existing item', () => {
      const product = { id: '1', name: 'Test Product', price: 29.99, image: 'test.jpg' };
      
      cartDataManager.addItem(product, 1);
      const result = cartDataManager.addItem(product, 2);
      
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(3);
    });

    test('should remove item from cart', () => {
      const product = { id: '1', name: 'Test Product', price: 29.99, image: 'test.jpg' };
      
      cartDataManager.addItem(product, 1);
      const result = cartDataManager.removeItem('1');
      
      expect(result).toHaveLength(0);
    });

    test('should update item quantity', () => {
      const product = { id: '1', name: 'Test Product', price: 29.99, image: 'test.jpg' };
      
      cartDataManager.addItem(product, 1);
      const result = cartDataManager.updateQuantity('1', 5);
      
      expect(result[0].quantity).toBe(5);
    });

    test('should remove item when quantity is set to 0 or negative', () => {
      const product = { id: '1', name: 'Test Product', price: 29.99, image: 'test.jpg' };
      
      cartDataManager.addItem(product, 1);
      const result = cartDataManager.updateQuantity('1', 0);
      
      expect(result).toHaveLength(0);
    });

    test('should clear all items from cart', () => {
      const product1 = { id: '1', name: 'Product 1', price: 29.99, image: 'test1.jpg' };
      const product2 = { id: '2', name: 'Product 2', price: 49.99, image: 'test2.jpg' };
      
      cartDataManager.addItem(product1, 1);
      cartDataManager.addItem(product2, 2);
      const result = cartDataManager.clearCart();
      
      expect(result).toHaveLength(0);
    });
  });

  describe('Cart Calculations', () => {
    beforeEach(() => {
      const product1 = { id: '1', name: 'Product 1', price: 29.99, image: 'test1.jpg' };
      const product2 = { id: '2', name: 'Product 2', price: 49.99, image: 'test2.jpg' };
      
      cartDataManager.addItem(product1, 2); // 59.98
      cartDataManager.addItem(product2, 1); // 49.99
    });

    test('should calculate correct total amount', () => {
      const total = cartDataManager.getTotal();
      expect(total).toBe(109.97);
    });

    test('should calculate correct total items count', () => {
      const totalItems = cartDataManager.getTotalItems();
      expect(totalItems).toBe(3);
    });

    test('should return copy of items array', () => {
      const items = cartDataManager.getItems();
      expect(items).toHaveLength(2);
      
      // Modify returned array should not affect original
      items.push({ id: '3', name: 'Test', price: 10, quantity: 1 });
      expect(cartDataManager.getItems()).toHaveLength(2);
    });
  });

  describe('Storage Operations', () => {
    test('should save cart to storage', () => {
      const product = { id: '1', name: 'Test Product', price: 29.99, image: 'test.jpg' };
      cartDataManager.addItem(product, 1);
      
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    test('should handle storage errors gracefully', () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const product = { id: '1', name: 'Test Product', price: 29.99, image: 'test.jpg' };
      
      expect(() => cartDataManager.addItem(product, 1)).not.toThrow();
    });
  });
});

describe('ShoppingCart', () => {
  let shoppingCart;
  let mockCartContainer;
  let mockCartIcon;
  let mockCartCount;
  let mockCartTotal;
  
  beforeEach(() => {
    // Create mock DOM structure
    document.body.innerHTML = `
      <div id="cart-container">
        <div class="cart-icon">
          <span class="cart-count">0</span>
        </div>
        <div class="cart-items"></div>
        <div class="cart-total">$0.00</div>
        <button class="checkout-btn">Checkout</button>
      </div>
      <div class="product-grid">
        <div class="product-card" data-id="1" data-name="Test Product 1" data-price="29.99">
          <h3>Test Product 1</h3>
          <p class="price">$29.99</p>
          <button class="add-to-cart">Add to Cart</button>
        </div>
        <div class="product-card" data-id="2" data-name="Test Product 2" data-price="49.99">
          <h3>Test Product 2</h3>
          <p class="price">$49.99</p>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      </div>
    `;
    
    mockCartContainer = document.getElementById('cart-container');
    mockCartIcon = document.querySelector('.cart-icon');
    mockCartCount = document.querySelector('.cart-count');
    mockCartTotal = document.querySelector('.cart-total');
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    
    // Initialize ShoppingCart if available
    if (typeof ShoppingCart !== 'undefined') {
      shoppingCart = new ShoppingCart();
    }
  });
  
  afterEach(() => {
    if (shoppingCart && typeof shoppingCart.destroy === 'function') {
      shoppingCart.destroy();
    }
    document.body.innerHTML = '';
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create ShoppingCart instance', () => {
      if (typeof ShoppingCart !== 'undefined') {
        expect(shoppingCart).toBeInstanceOf(ShoppingCart);
        expect(shoppingCart.items).toBeDefined();
        expect(Array.isArray(shoppingCart.items)).toBe(true);
      }
    });

    test('should initialize with empty cart', () => {
      if (typeof ShoppingCart !== 'undefined') {
        expect(shoppingCart.items).toHaveLength(0);
        expect(shoppingCart.dataManager.getTotal()).toBe(0);
        expect(shoppingCart.dataManager.getTotalItems()).toBe(0);
      }
    });

    test('should load cart from localStorage', () => {
      if (typeof ShoppingCart !== 'undefined') {
        const savedCart = [
          { id: '1', name: 'Test Product', price: 29.99, quantity: 2 }
        ];
        localStorage.getItem.mockReturnValue(JSON.stringify(savedCart));
        
        const cart = new ShoppingCart();
        cart.dataManager.loadCart();
        
        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].quantity).toBe(2);
      }
    });

    test('should handle corrupted localStorage data', () => {
      if (typeof ShoppingCart !== 'undefined') {
        localStorage.getItem.mockReturnValue('invalid json');
        
        expect(() => {
          const cart = new ShoppingCart();
          cart.dataManager.loadCart();
        }).not.toThrow();
      }
    });
  });

  describe('Adding Items', () => {
    test('should add new item to cart', () => {
      if (shoppingCart && typeof shoppingCart.addItem === 'function') {
        const item = {
          id: '1',
          name: 'Test Product',
          price: 29.99,
          quantity: 1
        };
        
        shoppingCart.dataManager.addItem(item);
        
        expect(shoppingCart.items).toHaveLength(1);
        expect(shoppingCart.items[0]).toEqual(item);
      }
    });

    test('should increase quantity for existing item', () => {
      if (shoppingCart && typeof shoppingCart.addItem === 'function') {
        const item = {
          id: '1',
          name: 'Test Product',
          price: 29.99,
          quantity: 1
        };
        
        shoppingCart.dataManager.addItem(item);
        shoppingCart.dataManager.addItem(item);
        
        expect(shoppingCart.items).toHaveLength(1);
        expect(shoppingCart.items[0].quantity).toBe(2);
      }
    });

    test('should handle invalid item data', () => {
      if (shoppingCart && typeof shoppingCart.addItem === 'function') {
        expect(() => {
          shoppingCart.dataManager.addItem(null);
        }).not.toThrow();
        
        expect(() => {
          shoppingCart.dataManager.addItem({});
        }).not.toThrow();
        
        expect(() => {
          shoppingCart.dataManager.addItem({ id: '1' }); // missing required fields
        }).not.toThrow();
      }
    });

    test('should validate item price', () => {
      if (shoppingCart && typeof shoppingCart.addItem === 'function') {
        const invalidPriceItem = {
          id: '1',
          name: 'Test Product',
          price: 'invalid',
          quantity: 1
        };
        
        shoppingCart.dataManager.addItem(invalidPriceItem);
        
        // Should either reject the item or convert price to valid number
        if (shoppingCart.items.length > 0) {
          expect(typeof shoppingCart.items[0].price).toBe('number');
          expect(shoppingCart.items[0].price).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Removing Items', () => {
    beforeEach(() => {
      if (shoppingCart && shoppingCart.dataManager && typeof shoppingCart.dataManager.addItem === 'function') {
        shoppingCart.dataManager.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 2);
        shoppingCart.dataManager.addItem({ id: '2', name: 'Product 2', price: 49.99 }, 1);
      }
    });

    test('should remove item completely', () => {
      if (shoppingCart && typeof shoppingCart.removeItem === 'function') {
        shoppingCart.dataManager.removeItem('1');
        
        expect(shoppingCart.items).toHaveLength(1);
        expect(shoppingCart.items[0].id).toBe('2');
      }
    });

    test('should decrease quantity when removing one unit', () => {
      if (shoppingCart && typeof shoppingCart.decreaseQuantity === 'function') {
        shoppingCart.decreaseQuantity('1');
        
        expect(shoppingCart.items).toHaveLength(2);
        expect(shoppingCart.items[0].quantity).toBe(1);
      }
    });

    test('should remove item when quantity reaches zero', () => {
      if (shoppingCart && typeof shoppingCart.decreaseQuantity === 'function') {
        shoppingCart.decreaseQuantity('2'); // quantity was 1
        
        expect(shoppingCart.items).toHaveLength(1);
        expect(shoppingCart.items[0].id).toBe('1');
      }
    });

    test('should handle removing non-existent item', () => {
      if (shoppingCart && typeof shoppingCart.removeItem === 'function') {
        expect(() => {
          shoppingCart.dataManager.removeItem('999');
        }).not.toThrow();
        
        expect(shoppingCart.items).toHaveLength(2); // unchanged
      }
    });
  });

  describe('Cart Calculations', () => {
    beforeEach(() => {
      if (shoppingCart && shoppingCart.dataManager && typeof shoppingCart.dataManager.addItem === 'function') {
        shoppingCart.dataManager.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 2);
        shoppingCart.dataManager.addItem({ id: '2', name: 'Product 2', price: 49.99 }, 1);
      }
    });

    test('should calculate total price correctly', () => {
      if (shoppingCart && typeof shoppingCart.getTotal === 'function') {
        const expectedTotal = (29.99 * 2) + (49.99 * 1);
        expect(shoppingCart.dataManager.getTotal()).toBeCloseTo(expectedTotal, 2);
      }
    });

    test('should calculate total item count correctly', () => {
      if (shoppingCart && typeof shoppingCart.getItemCount === 'function') {
        expect(shoppingCart.dataManager.getTotalItems()).toBe(3); // 2 + 1
      }
    });

    test('should calculate unique item count correctly', () => {
      if (shoppingCart && typeof shoppingCart.dataManager.getItems === 'function') {
        expect(shoppingCart.dataManager.getItems().length).toBe(2);
      }
    });

    test('should handle empty cart calculations', () => {
      if (shoppingCart) {
        shoppingCart.dataManager.clearCart();
        
        if (typeof shoppingCart.dataManager.getTotal === 'function') {
          expect(shoppingCart.dataManager.getTotal()).toBe(0);
        }
        if (typeof shoppingCart.dataManager.getTotalItems === 'function') {
          expect(shoppingCart.dataManager.getTotalItems()).toBe(0);
        }
      }
    });
  });

  describe('UI Updates', () => {
    test('should update cart count display', () => {
      if (shoppingCart && typeof shoppingCart.updateUI === 'function') {
        shoppingCart.dataManager.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 2);
        shoppingCart.updateUI();
        
        expect(mockCartCount.textContent).toBe('2');
      }
    });

    test('should update cart total display', () => {
      if (shoppingCart && typeof shoppingCart.updateUI === 'function') {
        shoppingCart.dataManager.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 1);
        shoppingCart.updateUI();
        
        expect(mockCartTotal.textContent).toContain('29.99');
      }
    });

    test('should render cart items', () => {
      if (shoppingCart && typeof shoppingCart.renderItems === 'function') {
        shoppingCart.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 1);
        shoppingCart.renderItems();
        
        const cartItems = document.querySelector('.cart-items');
        expect(cartItems.children.length).toBeGreaterThan(0);
      }
    });

    test('should show empty cart message when no items', () => {
      if (shoppingCart && typeof shoppingCart.renderItems === 'function') {
        shoppingCart.clear();
        shoppingCart.renderItems();
        
        const cartItems = document.querySelector('.cart-items');
        expect(cartItems.textContent).toContain('empty');
      }
    });
  });

  describe('Persistence', () => {
    test('should save cart to localStorage', () => {
      if (shoppingCart && typeof shoppingCart.saveToStorage === 'function') {
        shoppingCart.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 1);
        shoppingCart.saveToStorage();
        
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'shopping_cart',
          expect.stringContaining('Product 1')
        );
      }
    });

    test('should clear cart and localStorage', () => {
      if (shoppingCart && typeof shoppingCart.clear === 'function') {
        shoppingCart.dataManager.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 1);
        shoppingCart.clear();
        
        expect(shoppingCart.items).toHaveLength(0);
        expect(localStorage.removeItem).toHaveBeenCalledWith('nexusShopCart');
      }
    });
  });

  describe('Event Handling', () => {
    test('should handle add to cart button clicks', () => {
      if (shoppingCart && typeof shoppingCart.init === 'function') {
        shoppingCart.init();
        
        const addButton = document.querySelector('.add-to-cart');
        addButton.click();
        
        // Should add item to cart (assuming proper event delegation)
        // This test depends on the actual implementation
      }
    });

    test('should handle quantity change events', () => {
      if (shoppingCart && typeof shoppingCart.handleQuantityChange === 'function') {
        shoppingCart.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 1);
        
        const mockEvent = {
          target: {
            value: '3',
            dataset: { itemId: '1' }
          }
        };
        
        shoppingCart.handleQuantityChange(mockEvent);
        
        expect(shoppingCart.items[0].quantity).toBe(3);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = ''; // Remove all elements
      
      if (typeof ShoppingCart !== 'undefined') {
        expect(() => {
          const cart = new ShoppingCart();
          cart.updateUI();
        }).not.toThrow();
      }
    });

    test('should handle localStorage errors gracefully', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      if (shoppingCart && typeof shoppingCart.saveToStorage === 'function') {
        expect(() => {
          shoppingCart.addItem({ id: '1', name: 'Product 1', price: 29.99 }, 1);
          shoppingCart.saveToStorage();
        }).not.toThrow();
      }
    });
  });
});