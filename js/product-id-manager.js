/**
 * 产品ID管理器
 * 提供灵活的产品ID编码规则，便于定制和维护
 * 支持多种编码格式和自定义规则
 */

// 用途：产品ID编码规则管理，支持多种编码格式和自定义规则
// 依赖文件：无
// 作者：AI助手
// 时间：2025-09-24 23:10:00

class ProductIdManager {
  constructor(config = {}) {
    // 默认配置
    this.config = {
      // 编码格式：'numeric'（纯数字）、'alphanumeric'（字母数字）、'custom'（自定义）
      format: config.format || 'numeric',
      
      // 编码长度（默认8位）
      length: config.length || 8,
      
      // 前缀（可选）
      prefix: config.prefix || '',
      
      // 后缀（可选）
      suffix: config.suffix || '',
      
      // 分隔符（可选）
      separator: config.separator || '',
      
      // 是否允许自定义ID
      allowCustom: config.allowCustom !== false,
      
      // 产品类型映射（可选）
      productTypes: config.productTypes || {},
      
      // 验证规则
      validation: config.validation || {
        required: true,
        minLength: 1,
        maxLength: 50
      }
    };
    
    // 初始化产品类型映射
    this.initProductTypes();
  }
  
  /**
   * 初始化产品类型映射
   */
  initProductTypes() {
    // 默认产品类型映射
    const defaultTypes = {
      'clothing': 'CL',
      'electronics': 'EL',
      'accessories': 'AC',
      'home': 'HM',
      'sports': 'SP',
      'books': 'BK',
      'food': 'FD',
      'beauty': 'BT',
      'toys': 'TY',
      'other': 'OT'
    };
    
    // 合并自定义类型映射
    this.config.productTypes = { ...defaultTypes, ...this.config.productTypes };
  }
  
  /**
   * 生成产品ID
   * @param {Object} options - 生成选项
   * @returns {string} 产品ID
   */
  generate(options = {}) {
    const {
      type = 'other',
      sequence = Date.now(),
      customId = null
    } = options;
    
    // 如果允许自定义ID且提供了自定义ID，则使用自定义ID
    if (this.config.allowCustom && customId) {
      return this.formatCustomId(customId);
    }
    
    // 根据配置格式生成ID
    let baseId;
    
    switch (this.config.format) {
      case 'numeric':
        baseId = this.generateNumericId(sequence);
        break;
        
      case 'alphanumeric':
        baseId = this.generateAlphanumericId(sequence);
        break;
        
      case 'custom':
        baseId = this.generateCustomId(sequence, type);
        break;
        
      default:
        baseId = this.generateNumericId(sequence);
    }
    
    // 应用前缀、后缀和分隔符
    return this.applyFormatting(baseId, type);
  }
  
  /**
   * 生成数字ID
   * @param {number} sequence - 序列号
   * @returns {string} 数字ID
   */
  generateNumericId(sequence) {
    // 将序列号转换为字符串并填充到指定长度
    const seqStr = sequence.toString();
    const paddingLength = Math.max(0, this.config.length - seqStr.length);
    
    return '0'.repeat(paddingLength) + seqStr;
  }
  
  /**
   * 生成字母数字ID
   * @param {number} sequence - 序列号
   * @returns {string} 字母数字ID
   */
  generateAlphanumericId(sequence) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // 使用序列号作为随机种子
    let seed = sequence;
    
    for (let i = 0; i < this.config.length; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const randomIndex = Math.floor(seed / 233280 * chars.length);
      result += chars[randomIndex];
    }
    
    return result;
  }
  
  /**
   * 生成自定义格式ID
   * @param {number} sequence - 序列号
   * @param {string} type - 产品类型
   * @returns {string} 自定义格式ID
   */
  generateCustomId(sequence, type) {
    const typeCode = this.config.productTypes[type] || 'OT';
    const numericPart = this.generateNumericId(sequence).slice(-6); // 取后6位
    
    return `${typeCode}${numericPart}`;
  }
  
  /**
   * 格式化自定义ID
   * @param {string} customId - 自定义ID
   * @returns {string} 格式化后的ID
   */
  formatCustomId(customId) {
    // 验证自定义ID
    if (!this.validate(customId)) {
      throw new Error(`自定义ID "${customId}" 不符合验证规则`);
    }
    
    return customId;
  }
  
  /**
   * 应用格式化（前缀、后缀、分隔符）
   * @param {string} baseId - 基础ID
   * @param {string} type - 产品类型
   * @returns {string} 格式化后的ID
   */
  applyFormatting(baseId, type) {
    let result = baseId;
    
    // 添加前缀
    if (this.config.prefix) {
      result = this.config.prefix + result;
    }
    
    // 添加分隔符
    if (this.config.separator && this.config.prefix) {
      result = result.replace(this.config.prefix, this.config.prefix + this.config.separator);
    }
    
    // 添加后缀
    if (this.config.suffix) {
      result = result + this.config.suffix;
    }
    
    return result;
  }
  
  /**
   * 验证产品ID
   * @param {string} productId - 产品ID
   * @returns {boolean} 是否有效
   */
  validate(productId) {
    const { required, minLength, maxLength } = this.config.validation;
    
    // 检查是否为空
    if (required && (!productId || productId.trim() === '')) {
      return false;
    }
    
    // 检查长度
    if (productId.length < minLength || productId.length > maxLength) {
      return false;
    }
    
    // 根据格式进行验证
    switch (this.config.format) {
      case 'numeric':
        return /^\d+$/.test(productId.replace(this.config.prefix, '').replace(this.config.suffix, ''));
        
      case 'alphanumeric':
        return /^[A-Z0-9]+$/i.test(productId.replace(this.config.prefix, '').replace(this.config.suffix, ''));
        
      case 'custom':
        // 自定义格式验证
        return this.validateCustomFormat(productId);
        
      default:
        return true; // 其他格式不进行严格验证
    }
  }
  
  /**
   * 验证自定义格式
   * @param {string} productId - 产品ID
   * @returns {boolean} 是否符合自定义格式
   */
  validateCustomFormat(productId) {
    // 移除前缀和后缀
    let cleanId = productId;
    if (this.config.prefix) {
      cleanId = cleanId.replace(new RegExp(`^${this.config.prefix}`), '');
    }
    if (this.config.suffix) {
      cleanId = cleanId.replace(new RegExp(`${this.config.suffix}$`), '');
    }
    
    // 检查是否包含有效的产品类型代码
    const typeCodes = Object.values(this.config.productTypes);
    const hasValidType = typeCodes.some(code => cleanId.startsWith(code));
    
    return hasValidType && /^[A-Z0-9]{8}$/.test(cleanId);
  }
  
  /**
   * 解析产品ID
   * @param {string} productId - 产品ID
   * @returns {Object} 解析结果
   */
  parse(productId) {
    if (!this.validate(productId)) {
      return { valid: false, error: '无效的产品ID格式' };
    }
    
    let cleanId = productId;
    
    // 移除前缀和后缀
    if (this.config.prefix) {
      cleanId = cleanId.replace(new RegExp(`^${this.config.prefix}`), '');
    }
    if (this.config.suffix) {
      cleanId = cleanId.replace(new RegExp(`${this.config.suffix}$`), '');
    }
    
    // 根据格式解析
    switch (this.config.format) {
      case 'custom':
        return this.parseCustomFormat(cleanId);
        
      default:
        return {
          valid: true,
          baseId: cleanId,
          type: this.detectType(cleanId),
          sequence: this.extractSequence(cleanId)
        };
    }
  }
  
  /**
   * 解析自定义格式
   * @param {string} cleanId - 清理后的ID
   * @returns {Object} 解析结果
   */
  parseCustomFormat(cleanId) {
    // 提取类型代码（前2位）
    const typeCode = cleanId.substring(0, 2);
    const numericPart = cleanId.substring(2);
    
    // 查找对应的产品类型
    const type = Object.keys(this.config.productTypes).find(
      key => this.config.productTypes[key] === typeCode
    ) || 'other';
    
    return {
      valid: true,
      baseId: cleanId,
      typeCode,
      type,
      sequence: parseInt(numericPart, 10),
      numericPart
    };
  }
  
  /**
   * 检测产品类型
   * @param {string} productId - 产品ID
   * @returns {string} 产品类型
   */
  detectType(productId) {
    if (this.config.format === 'custom') {
      const typeCode = productId.substring(0, 2);
      return Object.keys(this.config.productTypes).find(
        key => this.config.productTypes[key] === typeCode
      ) || 'other';
    }
    
    return 'other';
  }
  
  /**
   * 提取序列号
   * @param {string} productId - 产品ID
   * @returns {number} 序列号
   */
  extractSequence(productId) {
    if (this.config.format === 'custom') {
      return parseInt(productId.substring(2), 10);
    }
    
    // 对于数字格式，直接解析
    const numericStr = productId.replace(/[^0-9]/g, '');
    return numericStr ? parseInt(numericStr, 10) : 0;
  }
  
  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.initProductTypes();
  }
  
  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * 重置为默认配置
   */
  resetConfig() {
    this.config = {
      format: 'numeric',
      length: 8,
      prefix: '',
      suffix: '',
      separator: '',
      allowCustom: true,
      productTypes: {},
      validation: {
        required: true,
        minLength: 1,
        maxLength: 50
      }
    };
    this.initProductTypes();
  }
}

// 创建默认实例
const globalProductIdManager = new ProductIdManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductIdManager;
} else {
  // 浏览器环境
  window.ProductIdManager = ProductIdManager;
  window.globalProductIdManager = globalProductIdManager;
}