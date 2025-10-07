const hard = require('./jest.config.cjs');
const soft = { ...hard };
delete soft.coverageThreshold;
/** 软配置：不设覆盖率阈值，其他保持一致 */
module.exports = soft;