"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIntegrityRulesPath = resolveIntegrityRulesPath;
exports.loadIntegrityRules = loadIntegrityRules;
exports.hasFactCard = hasFactCard;
exports.enforceProductIntegrityGate = enforceProductIntegrityGate;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const common_1 = require("@nestjs/common");
function resolveIntegrityRulesPath() {
    const backendRoot = path.resolve(__dirname, __dirname.split(path.sep).includes('dist') ? '../../..' : '../..');
    return path.resolve(backendRoot, '..', 'js', 'shared', 'integrity-rules.js');
}
const nativeImport = new Function('specifier', 'return import(specifier);');
function loadViaSourceEval(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    if (!/^export\s+/m.test(source)) {
        throw new Error('规则引擎源文件不含 export 语句，可能已被改动为非 ESM');
    }
    const cjsLike = source.replace(/^export\s+/gm, '');
    const factory = new Function(`${cjsLike}\n;return { lintCopy: typeof lintCopy === 'function' ? lintCopy : undefined,` +
        ` checkNameImage: typeof checkNameImage === 'function' ? checkNameImage : undefined,` +
        ` sanityCheck: typeof sanityCheck === 'function' ? sanityCheck : undefined };`);
    const moduleNamespace = factory();
    if (typeof moduleNamespace.lintCopy !== 'function' ||
        typeof moduleNamespace.checkNameImage !== 'function') {
        throw new Error('规则引擎求值后缺少 lintCopy/checkNameImage 导出');
    }
    return moduleNamespace;
}
let integrityRulesPromise = null;
async function loadIntegrityRules() {
    if (!integrityRulesPromise) {
        const filePath = resolveIntegrityRulesPath();
        integrityRulesPromise = (async () => {
            try {
                return await nativeImport((0, url_1.pathToFileURL)(filePath).href);
            }
            catch {
                try {
                    return require(filePath);
                }
                catch {
                    return loadViaSourceEval(filePath);
                }
            }
        })();
        integrityRulesPromise.catch(() => {
            integrityRulesPromise = null;
        });
    }
    return integrityRulesPromise;
}
function hasFactCard(specifications) {
    if (typeof specifications !== 'object' || specifications === null || Array.isArray(specifications)) {
        return false;
    }
    const fc = specifications.factCard;
    return typeof fc === 'object' && fc !== null && !Array.isArray(fc);
}
const FACT_CARD_FIELD_MAX_LENGTH = 50;
function extractFactCard(specifications) {
    if (typeof specifications !== 'object' ||
        specifications === null ||
        Array.isArray(specifications) ||
        !('factCard' in specifications)) {
        return undefined;
    }
    const fc = specifications.factCard;
    if (typeof fc !== 'object' || fc === null || Array.isArray(fc)) {
        throw new common_1.BadRequestException('specifications.factCard 必须是对象（看图四选结果 {colorGroup,bagType,hardware,occasion}），不接受数组或标量');
    }
    for (const field of ['colorGroup', 'bagType']) {
        const v = fc[field];
        if (v !== undefined && v !== null && typeof v !== 'string') {
            throw new common_1.BadRequestException(`specifications.factCard.${field} 必须是字符串（看图四选结果），不接受 ${Array.isArray(v) ? '数组' : typeof v}`);
        }
        if (typeof v === 'string' && v.length > FACT_CARD_FIELD_MAX_LENGTH) {
            throw new common_1.BadRequestException(`specifications.factCard.${field} 不能超过 ${FACT_CARD_FIELD_MAX_LENGTH} 字符（看图四选是选词，不是自由文本）`);
        }
    }
    return fc;
}
async function enforceProductIntegrityGate(input) {
    let rules;
    try {
        rules = await loadIntegrityRules();
    }
    catch (error) {
        console.error('[M4-复检] 名实相符规则引擎加载失败（fail-closed，阻断本次写入）:', error.message);
        throw new common_1.InternalServerErrorException('名实相符规则引擎不可用，写入已阻断（fail-closed）');
    }
    const name = typeof input.name === 'string' ? input.name : '';
    const description = typeof input.description === 'string' ? input.description : '';
    const violations = [
        ...rules.lintCopy(name).violations,
        ...rules.lintCopy(description).violations,
    ];
    if (Array.isArray(input.tags)) {
        input.tags.forEach((tag, tagIndex) => {
            if (typeof tag !== 'string')
                return;
            for (const v of rules.lintCopy(tag).violations) {
                violations.push({ ...v, field: 'tags', tagIndex, tag });
            }
        });
    }
    const gate = { warnings: [], blockers: [] };
    const fc = extractFactCard(input.specifications);
    if (fc) {
        const mainColor = typeof fc.colorGroup === 'string'
            ? fc.colorGroup
            : typeof fc.mainColor === 'string'
                ? fc.mainColor
                : undefined;
        const bagType = typeof fc.bagType === 'string' ? fc.bagType : undefined;
        const result = rules.checkNameImage({ name, description, factCard: { mainColor, bagType } });
        gate.warnings = result.warnings;
        gate.blockers = result.blockers;
    }
    if (gate.blockers.length > 0 || violations.length > 0) {
        throw new common_1.BadRequestException({
            message: '名实相符复检未通过（第二闸服务端侧）',
            details: {
                integrity: {
                    blockers: gate.blockers,
                    bannedWords: violations,
                },
            },
        });
    }
    return { warnings: gate.warnings };
}
