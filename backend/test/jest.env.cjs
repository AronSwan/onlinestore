/**
 * Jest环境变量设置
 * 在所有测试运行前加载.env.test文件
 */

const path = require('path');
const dotenv = require('dotenv');

// 加载测试环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// 设置测试环境
process.env.NODE_ENV = 'test';
