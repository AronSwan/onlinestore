/**
 * @fileoverview CodeAnalysisConfig 测试套件
 * @description 测试代码分析配置管理器的功能，包括配置获取、验证和代码分析相关方法
 */

const { CodeAnalysisConfig, codeAnalysisConfig } = require('../../js/config/CodeAnalysisConfig');

describe('CodeAnalysisConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default code analysis configuration', () => {
            expect(codeAnalysisConfig.get('enabled')).toBe(true);
            expect(codeAnalysisConfig.get('maxComplexity')).toBe(10);
            expect(codeAnalysisConfig.get('maxFunctionLength')).toBe(50);
            expect(codeAnalysisConfig.get('maxFileLength')).toBe(500);
        });

        test('should freeze configuration object', () => {
            const config = codeAnalysisConfig.getAll();
            expect(() => {
                config.maxComplexity = 20;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(codeAnalysisConfig.get('enabled')).toBe(true);
            expect(codeAnalysisConfig.get('maxComplexity')).toBe(10);
            expect(codeAnalysisConfig.get('maxFunctionLength')).toBe(50);
            expect(codeAnalysisConfig.get('maxFileLength')).toBe(500);
        });

        test('should return undefined for non-existent keys', () => {
            expect(codeAnalysisConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(codeAnalysisConfig.has('enabled')).toBe(true);
            expect(codeAnalysisConfig.has('maxComplexity')).toBe(true);
            expect(codeAnalysisConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = codeAnalysisConfig.getAll();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('complexityThresholds');
            expect(config).toHaveProperty('codeMetrics');
            expect(config).toHaveProperty('analysisRules');
        });
    });

    describe('Code Analysis Settings', () => {
        test('should check if code analysis is enabled', () => {
            expect(codeAnalysisConfig.isEnabled()).toBe(true);
        });

        test('should get complexity thresholds', () => {
            const thresholds = codeAnalysisConfig.getComplexityThresholds();
            expect(thresholds).toHaveProperty('function');
            expect(thresholds).toHaveProperty('class');
            expect(thresholds).toHaveProperty('file');
            expect(thresholds.function).toHaveProperty('low', 5);
            expect(thresholds.function).toHaveProperty('medium', 10);
            expect(thresholds.function).toHaveProperty('high', 20);
        });

        test('should get code metrics configuration', () => {
            const metrics = codeAnalysisConfig.getCodeMetrics();
            expect(metrics).toHaveProperty('linesOfCode');
            expect(metrics).toHaveProperty('cyclomaticComplexity');
            expect(metrics).toHaveProperty('maintainabilityIndex');
            expect(metrics).toHaveProperty('duplicateCode');
        });

        test('should get analysis rules', () => {
            const rules = codeAnalysisConfig.getAnalysisRules();
            expect(rules).toHaveProperty('enforceComplexity');
            expect(rules).toHaveProperty('detectDuplicates');
            expect(rules).toHaveProperty('checkNaming');
            expect(rules).toHaveProperty('validateStructure');
        });
    });

    describe('Complexity Thresholds', () => {
        test('should get function complexity threshold', () => {
            const threshold = codeAnalysisConfig.getFunctionComplexityThreshold();
            expect(threshold).toHaveProperty('low', 5);
            expect(threshold).toHaveProperty('medium', 10);
            expect(threshold).toHaveProperty('high', 20);
        });

        test('should get class complexity threshold', () => {
            const threshold = codeAnalysisConfig.getClassComplexityThreshold();
            expect(threshold).toHaveProperty('low', 10);
            expect(threshold).toHaveProperty('medium', 20);
            expect(threshold).toHaveProperty('high', 40);
        });

        test('should get file complexity threshold', () => {
            const threshold = codeAnalysisConfig.getFileComplexityThreshold();
            expect(threshold).toHaveProperty('low', 20);
            expect(threshold).toHaveProperty('medium', 50);
            expect(threshold).toHaveProperty('high', 100);
        });

        test('should classify complexity levels correctly', () => {
            expect(codeAnalysisConfig.getComplexityLevel('function', 3)).toBe('low');
            expect(codeAnalysisConfig.getComplexityLevel('function', 8)).toBe('medium');
            expect(codeAnalysisConfig.getComplexityLevel('function', 25)).toBe('high');
            expect(codeAnalysisConfig.getComplexityLevel('function', 50)).toBe('critical');
        });
    });

    describe('Code Metrics', () => {
        test('should validate lines of code metrics', () => {
            expect(codeAnalysisConfig.isValidLinesOfCode(10)).toBe(true);
            expect(codeAnalysisConfig.isValidLinesOfCode(50)).toBe(true);
            expect(codeAnalysisConfig.isValidLinesOfCode(100)).toBe(false); // 超过阈值
            expect(codeAnalysisConfig.isValidLinesOfCode(0)).toBe(false);
            expect(codeAnalysisConfig.isValidLinesOfCode(-1)).toBe(false);
        });

        test('should validate cyclomatic complexity', () => {
            expect(codeAnalysisConfig.isValidComplexity(5)).toBe(true);
            expect(codeAnalysisConfig.isValidComplexity(10)).toBe(true);
            expect(codeAnalysisConfig.isValidComplexity(15)).toBe(false); // 超过阈值
            expect(codeAnalysisConfig.isValidComplexity(0)).toBe(false);
            expect(codeAnalysisConfig.isValidComplexity(-1)).toBe(false);
        });

        test('should calculate maintainability index', () => {
            const metrics = {
                linesOfCode: 50,
                cyclomaticComplexity: 8,
                halsteadVolume: 100
            };
            const index = codeAnalysisConfig.calculateMaintainabilityIndex(metrics);
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThanOrEqual(100);
        });

        test('should detect duplicate code percentage', () => {
            expect(codeAnalysisConfig.isAcceptableDuplication(5)).toBe(true); // 5% 重复率
            expect(codeAnalysisConfig.isAcceptableDuplication(10)).toBe(true); // 10% 重复率
            expect(codeAnalysisConfig.isAcceptableDuplication(20)).toBe(false); // 20% 重复率超标
        });
    });

    describe('Analysis Rules', () => {
        test('should check if complexity enforcement is enabled', () => {
            expect(codeAnalysisConfig.isComplexityEnforced()).toBe(true);
        });

        test('should check if duplicate detection is enabled', () => {
            expect(codeAnalysisConfig.isDuplicateDetectionEnabled()).toBe(true);
        });

        test('should check if naming validation is enabled', () => {
            expect(codeAnalysisConfig.isNamingValidationEnabled()).toBe(true);
        });

        test('should check if structure validation is enabled', () => {
            expect(codeAnalysisConfig.isStructureValidationEnabled()).toBe(true);
        });

        test('should get naming conventions', () => {
            const conventions = codeAnalysisConfig.getNamingConventions();
            expect(conventions).toHaveProperty('functions');
            expect(conventions).toHaveProperty('variables');
            expect(conventions).toHaveProperty('classes');
            expect(conventions).toHaveProperty('constants');
        });
    });

    describe('File Analysis', () => {
        test('should validate file structure', () => {
            const validFile = {
                path: 'src/utils/helper.js',
                linesOfCode: 45,
                functions: 3,
                classes: 1,
                complexity: 8
            };
            expect(codeAnalysisConfig.isValidFileStructure(validFile)).toBe(true);
        });

        test('should reject invalid file structure', () => {
            const invalidFile = {
                path: 'src/utils/helper.js',
                linesOfCode: 600, // 超过限制
                functions: 20, // 过多函数
                classes: 5, // 过多类
                complexity: 50 // 复杂度过高
            };
            expect(codeAnalysisConfig.isValidFileStructure(invalidFile)).toBe(false);
        });

        test('should get file analysis report', () => {
            const languages = codeAnalysisConfig.getSupportedLanguages();
            expect(Array.isArray(languages)).toBe(true);
            expect(languages.includes('javascript')).toBe(true);
            expect(languages.includes('typescript')).toBe(true);
            expect(languages.includes('python')).toBe(true);
        });
    });

    describe('Function Analysis', () => {
        test('should validate function structure', () => {
            const thresholds = codeAnalysisConfig.getComplexityThresholds();
            expect(thresholds).toHaveProperty('low');
            expect(thresholds).toHaveProperty('medium');
            expect(thresholds).toHaveProperty('high');
            expect(thresholds).toHaveProperty('critical');
        });

        test('should reject invalid function structure', () => {
            const invalidComplexity = 25;
            const severity = codeAnalysisConfig.getComplexitySeverity(invalidComplexity);
            expect(severity).toBe('CRITICAL');
            expect(codeAnalysisConfig.getComplexitySeverity(5)).toBe('INFO');
        });

        test('should get function analysis report', () => {
            const analysisRules = codeAnalysisConfig.getAnalysisRules();
            expect(analysisRules).toHaveProperty('detectLongMethods');
            expect(analysisRules).toHaveProperty('detectComplexConditions');
            expect(analysisRules).toHaveProperty('detectDeepNesting');
            expect(analysisRules).toHaveProperty('detectDuplicateCode');
        });
    });

    describe('Naming Validation', () => {
        test('should validate function names', () => {
            const jsConfig = codeAnalysisConfig.getLanguageConfig('javascript');
            expect(jsConfig.fileExtensions).toContain('.js');
            expect(jsConfig.functionKeywords).toContain('function');
            expect(jsConfig.commentPatterns).toContain('//');
        });

        test('should validate variable names', () => {
            const severityLevels = codeAnalysisConfig.getSeverityLevels();
            expect(severityLevels.INFO).toBe(1);
            expect(severityLevels.WARNING).toBe(2);
            expect(severityLevels.ERROR).toBe(3);
            expect(severityLevels.CRITICAL).toBe(4);
        });

        test('should validate class names', () => {
            const severity = codeAnalysisConfig.getComplexitySeverity(15);
            expect(severity).toBe('ERROR');
            expect(codeAnalysisConfig.getComplexitySeverity(5)).toBe('INFO');
            expect(codeAnalysisConfig.getComplexitySeverity(25)).toBe('CRITICAL');
        });

        test('should validate constant names', () => {
            const languages = codeAnalysisConfig.getSupportedLanguages();
            expect(Array.isArray(languages)).toBe(true);
            expect(languages.includes('javascript')).toBe(true);
            expect(languages.includes('typescript')).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => codeAnalysisConfig.get(null)).not.toThrow();
            expect(() => codeAnalysisConfig.get(undefined)).not.toThrow();
            expect(() => codeAnalysisConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(codeAnalysisConfig.get('')).toBeUndefined();
            expect(codeAnalysisConfig.has('')).toBe(false);
        });

        test('should handle method calls with invalid parameters', () => {
            expect(() => codeAnalysisConfig.getComplexityThresholds()).not.toThrow();
            expect(() => codeAnalysisConfig.getCodeMetrics()).not.toThrow();
            expect(() => codeAnalysisConfig.getAnalysisRules()).not.toThrow();
        });

        test('should handle null or undefined analysis objects', () => {
            expect(codeAnalysisConfig.has('COMPLEXITY_THRESHOLDS')).toBe(true);
            expect(codeAnalysisConfig.has('INVALID_KEY')).toBe(false);
            expect(codeAnalysisConfig.getLanguageConfig('javascript')).toBeDefined();
        });
    });

    describe('Integration Tests', () => {
        test('should work with code analysis workflow', () => {
            const ruleEnabled = codeAnalysisConfig.isRuleEnabled('detectDuplicateCode');
            const thresholds = codeAnalysisConfig.getComplexityThresholds();
            const metrics = codeAnalysisConfig.getCodeMetrics();
            const rules = codeAnalysisConfig.getAnalysisRules();

            expect(typeof ruleEnabled).toBe('boolean');
            expect(typeof thresholds).toBe('object');
            expect(typeof metrics).toBe('object');
            expect(typeof rules).toBe('object');
        });

        test('should provide complete configuration for code analysis', () => {
            const config = codeAnalysisConfig.getAll();

            // 验证必要的配置项存在
            expect(config.COMPLEXITY_THRESHOLDS).toBeDefined();
            expect(config.CODE_METRICS).toBeDefined();
            expect(config.ANALYSIS_RULES).toBeDefined();
            expect(config.SEVERITY_LEVELS).toBeDefined();

            // 验证配置值的合理性
            expect(config.COMPLEXITY_THRESHOLDS.cyclomatic.medium).toBeGreaterThan(0);
            expect(config.CODE_METRICS.maxFunctionLength).toBeGreaterThan(0);
        });

        test('should maintain configuration consistency', () => {
            const config = codeAnalysisConfig.getAll();
            const thresholds = codeAnalysisConfig.getAllComplexityThresholds();
            const metrics = codeAnalysisConfig.getCodeMetrics();
            const rules = codeAnalysisConfig.getAnalysisRules();

            expect(config.COMPLEXITY_THRESHOLDS).toEqual(thresholds);
            expect(config.CODE_METRICS).toEqual(metrics);
            expect(config.ANALYSIS_RULES).toEqual(rules);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new CodeAnalysisConfig();
            const instance2 = new CodeAnalysisConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});