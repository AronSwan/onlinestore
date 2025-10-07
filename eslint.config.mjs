import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

// 从prettier.config.js导入配置，确保规则一致性
export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: [
      "js/recommended"
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        // 项目中使用的全局变量
        localStorage: "readonly",
        sessionStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly"
      },
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      // 基础规则
      "no-console": "warn",
      "no-debugger": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-duplicate-imports": "error",
      
      // 风格规则 - 与Prettier配置保持一致
      "semi": ["error", "always"],
      "quotes": ["error", "single"],
      "indent": ["error", 2, { "SwitchCase": 1 }],
      "eol-last": ["error", "always"],
      "comma-dangle": ["error", {
        "arrays": "always-multiline",
        "objects": "always-multiline",
        "imports": "always-multiline",
        "exports": "always-multiline",
        "functions": "never"
      }],
      "arrow-parens": ["error", "always"],
      
      // 代码质量规则
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"]
    }
  }
]);
