module.exports = jest.fn((fn, options = {}) => {
  const { retries = 5, factor = 2, minTimeout = 1000, maxTimeout = Infinity } = options;
  
  return async (...args) => {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt === retries) {
          throw lastError;
        }
        
        // 计算延迟时间
        const delay = Math.min(minTimeout * Math.pow(factor, attempt), maxTimeout);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
});