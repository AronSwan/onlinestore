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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("@nestjs/common");
const product_integrity_gate_1 = require("./product-integrity.gate");
describe('M4 第二闸服务端侧：integrity 同源复检', () => {
    describe('同源加载（src/dist 双布局路径解析）', () => {
        it('resolveIntegrityRulesPath 指向仓库根 js/shared/integrity-rules.js 且文件存在', () => {
            const expected = path.resolve(__dirname, '..', '..', '..', 'js', 'shared', 'integrity-rules.js');
            expect(path.resolve((0, product_integrity_gate_1.resolveIntegrityRulesPath)())).toBe(path.resolve(expected));
            expect(fs.existsSync(expected)).toBe(true);
        });
        it('loadIntegrityRules 能加载并暴露 lintCopy/checkNameImage/sanityCheck', async () => {
            const rules = await (0, product_integrity_gate_1.loadIntegrityRules)();
            expect(typeof rules.lintCopy).toBe('function');
            expect(typeof rules.checkNameImage).toBe('function');
        });
    });
    describe('checkNameImage 三标准用例（上午三事故回归，与 js/shared 测试同判）', () => {
        it('事故 1：黑包名「柠檬黄小圆筒」→ 黄警 COLOR_MISMATCH（黄系），零红拦', async () => {
            const rules = await (0, product_integrity_gate_1.loadIntegrityRules)();
            const r = rules.checkNameImage({
                name: '柠檬黄小圆筒',
                description: '明亮的柠檬黄背景前，黑色小圆筒包非常上镜',
                factCard: { mainColor: '黑', bagType: '小圆筒' },
            });
            expect(r.blockers).toHaveLength(0);
            const hits = r.warnings.filter((w) => w.code === 'COLOR_MISMATCH');
            expect(hits.length).toBeGreaterThanOrEqual(1);
            expect(hits.some((w) => w.family === '黄' && w.field === 'name')).toBe(true);
        });
        it('事故 2：凯莉包名「蓝白织纹托特」→ 红拦 BAG_SILHOUETTE_MISMATCH（word=托特）', async () => {
            const rules = await (0, product_integrity_gate_1.loadIntegrityRules)();
            const r = rules.checkNameImage({
                name: '蓝白织纹托特',
                description: '蓝白织纹托特包，通勤也拿得出手',
                factCard: { mainColor: '蓝白', bagType: '凯莉' },
            });
            const blockers = r.blockers.filter((b) => b.code === 'BAG_SILHOUETTE_MISMATCH');
            expect(blockers).toHaveLength(2);
            expect(blockers.map((b) => b.field).sort()).toEqual(['description', 'name']);
            expect(blockers.every((b) => b.word === '托特')).toBe(true);
        });
        it('事故 3：绿橙紫渐变描述写「粉到金」→ 黄警 COLOR_MISMATCH ×2（粉、金）', async () => {
            const rules = await (0, product_integrity_gate_1.loadIntegrityRules)();
            const r = rules.checkNameImage({
                name: '绿橙紫渐变云朵包',
                description: '色彩从粉到金自然渐变',
                factCard: { mainColor: '绿橙紫渐变', bagType: '云朵' },
            });
            expect(r.blockers).toHaveLength(0);
            const families = r.warnings
                .filter((w) => w.code === 'COLOR_MISMATCH')
                .map((w) => w.family)
                .sort();
            expect(families).toEqual(['粉', '金']);
        });
    });
    describe('复检闸本体 enforceProductIntegrityGate（P1-2 修复后契约）', () => {
        it('无 factCard 但文案干净 → lint-only 放行，返回空 warnings（不再返回 null）', async () => {
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '牛皮手提包',
                description: '头层牛皮，通勤也拿得出手',
                specifications: { 材质: '头层牛皮' },
            });
            expect(r).toEqual({ warnings: [] });
        });
        it('P1-2 主案例：不带 specifications 的禁用词（"限时抢购"）→ 400 带明细，闸不可整体跳过', async () => {
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '限时抢购水桶包',
                    description: '手慢无',
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                expect(e).toBeInstanceOf(common_1.BadRequestException);
                const words = e.getResponse().details.integrity.bannedWords.map((v) => v.word);
                expect(words).toEqual(expect.arrayContaining(['限时', '抢购']));
            }
        });
        it('P3 零宽走私："限␈时"（ZWSP 拆词）→ 400，命中明细为剥离后的词面', async () => {
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '限\u200B时特惠水桶包',
                    description: '',
                    specifications: { factCard: { colorGroup: '黑', bagType: '水桶' } },
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                expect(e).toBeInstanceOf(common_1.BadRequestException);
                const words = e.getResponse().details.integrity.bannedWords.map((v) => v.word);
                expect(words).toEqual(expect.arrayContaining(['限时', '特惠']));
            }
        });
        it('factCard 形状非法（数组/标量）→ 400，不静默跳过词表冲突复检（席X P3）', async () => {
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '蓝白织纹托特',
                description: '',
                specifications: { factCard: ['黑', '水桶'] },
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '随便',
                description: '',
                specifications: { factCard: '黑' },
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
        it('旧拼法 mainColor：与 colorGroup 同效参与颜色比对（旧数据不静默失去复检）', async () => {
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '柠檬黄小圆筒',
                description: '黑色小圆筒包非常上镜',
                specifications: { factCard: { mainColor: '黑', bagType: '小圆筒' } },
            });
            expect(r.warnings.some((w) => w.code === 'COLOR_MISMATCH')).toBe(true);
        });
        it('factCard 缺字段（2/4）不静默：空卡+无包型词 → BAG_TYPE_MISSING 红拦；只有主色+文案有包型词 → 黄警补卡', async () => {
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '牛皮手袋',
                description: '头层牛皮',
                specifications: { factCard: {} },
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '托特包',
                description: '大容量',
                specifications: { factCard: { colorGroup: '黑' } },
            });
            expect(r.warnings.some((w) => w.code === 'FACT_CARD_BAG_MISSING')).toBe(true);
        });
        it('hasFactCard 判定：specifications 缺省/数组/无 factCard 均 false', () => {
            expect((0, product_integrity_gate_1.hasFactCard)(undefined)).toBe(false);
            expect((0, product_integrity_gate_1.hasFactCard)(null)).toBe(false);
            expect((0, product_integrity_gate_1.hasFactCard)(['a'])).toBe(false);
            expect((0, product_integrity_gate_1.hasFactCard)({ 材质: '牛皮' })).toBe(false);
            expect((0, product_integrity_gate_1.hasFactCard)({ factCard: { colorGroup: '黑', bagType: '水桶' } })).toBe(true);
        });
        it('结构冲突（事故 2 形状，factCard 用存储形状 colorGroup）→ 400 带 details.integrity.blockers', async () => {
            const promise = (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '蓝白织纹托特',
                description: '蓝白织纹托特包，通勤也拿得出手',
                specifications: {
                    factCard: { colorGroup: '蓝白', bagType: '凯莉', hardware: '银', occasion: '通勤' },
                },
            });
            await expect(promise).rejects.toBeInstanceOf(common_1.BadRequestException);
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '蓝白织纹托特',
                    description: '蓝白织纹托特包，通勤也拿得出手',
                    specifications: {
                        factCard: { colorGroup: '蓝白', bagType: '凯莉', hardware: '银', occasion: '通勤' },
                    },
                });
            }
            catch (e) {
                const resp = e.getResponse();
                expect(resp.details.integrity.blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH')).toBe(true);
            }
        });
        it('禁用词命中（name 带限时/轻奢）→ 400 带 details.integrity.bannedWords', async () => {
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '限时轻奢水桶包',
                    description: '从容的水桶包',
                    specifications: { factCard: { colorGroup: '黑', bagType: '水桶' } },
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                expect(e).toBeInstanceOf(common_1.BadRequestException);
                const words = e.getResponse().details.integrity.bannedWords.map((v) => v.word);
                expect(words).toEqual(expect.arrayContaining(['限时', '轻奢']));
            }
        });
        it('合规输入（名实相符+无禁用词）→ 放行，返回 warnings 数组（黄警不拦）', async () => {
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '黑色小圆筒包',
                description: '黑色小圆筒，通勤也拿得出手',
                specifications: {
                    factCard: { colorGroup: '黑', bagType: '小圆筒', hardware: '银', occasion: '通勤' },
                },
            });
            expect(r).not.toBeNull();
            expect(Array.isArray(r.warnings)).toBe(true);
        });
        it('黄警（事故 1 形状：勾黑写黄）→ 不 400，warnings 携带 COLOR_MISMATCH', async () => {
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '柠檬黄小圆筒',
                description: '明亮的柠檬黄背景前，黑色小圆筒包非常上镜',
                specifications: { factCard: { colorGroup: '黑', bagType: '小圆筒' } },
            });
            expect(r).not.toBeNull();
            expect(r.warnings.some((w) => w.code === 'COLOR_MISMATCH')).toBe(true);
        });
    });
    describe('三修 P2-4 factCard 字段类型（bagType/colorGroup 非字符串 → 400 带字段名）', () => {
        it('colorGroup 传数字 → 400 报文含 specifications.factCard.colorGroup', async () => {
            let caught;
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '托特包',
                    description: '',
                    specifications: { factCard: { colorGroup: 1, bagType: '托特' } },
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.BadRequestException);
            expect(String(caught.getResponse().message)).toContain('colorGroup');
        });
        it('bagType 传数组 → 400 报文含 specifications.factCard.bagType（不接受数组）', async () => {
            let caught;
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '托特包',
                    description: '',
                    specifications: { factCard: { colorGroup: '黑', bagType: ['托特'] } },
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.BadRequestException);
            const msg = String(caught.getResponse().message);
            expect(msg).toContain('bagType');
            expect(msg).toContain('数组');
        });
        it('字段值为 null 视为未填（合法空四选），不误伤 400', async () => {
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '柠檬黄小圆筒',
                description: '',
                specifications: { factCard: { colorGroup: null, bagType: '小圆筒' } },
            });
            expect(r.warnings.some((w) => w.code === 'FACT_CARD_COLOR_MISSING')).toBe(true);
        });
    });
    describe('三修 P2-8 tags 逐项禁用词 lint（首页徽章渲染面）', () => {
        it('tags 携带禁用词（"限时"）→ 400 带 details.integrity.bannedWords（含 tagIndex 定位）', async () => {
            let caught;
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '黑色小圆筒包',
                    description: '头层牛皮',
                    tags: ['新品', '限时', '热销'],
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.BadRequestException);
            const violations = caught.getResponse().details.integrity.bannedWords;
            const hit = violations.find((v) => v.word === '限时');
            expect(hit).toBeDefined();
            expect(hit.tagIndex).toBe(1);
            expect(hit.tag).toBe('限时');
        });
        it('tags 干净 → 放行（不因新增 lint 面误伤）', async () => {
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '黑色小圆筒包',
                description: '头层牛皮',
                tags: ['新品', '通勤'],
            });
            expect(r).toEqual({ warnings: [] });
        });
        it('tags 缺省/非数组 → 不 lint 不报错（PATCH 未提交 tags 的既有语义）', async () => {
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({ name: '黑色小圆筒包', description: '' })).resolves.toBeDefined();
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({ name: '黑色小圆筒包', description: '', tags: '限时' })).resolves.toBeDefined();
        });
        it('tags 内隐形拆词（Cf/空格）同受规则引擎归一收口', async () => {
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({ name: '牛皮手袋', description: '', tags: ['限 时'] })).rejects.toBeInstanceOf(common_1.BadRequestException);
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({ name: '牛皮手袋', description: '', tags: ['秒\u200B杀'] })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
    });
    describe('四修 P1-1：属性类外拆词走私（闸级）', () => {
        it('主案：「波[U+E000]士顿」+凯莉卡 → 400 BAG_SILHOUETTE_MISMATCH（X1 实锤 201 落库的回归）', async () => {
            let caught;
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '波\uE000士顿',
                    description: '',
                    specifications: { factCard: { colorGroup: '黑', bagType: '凯莉' } },
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.BadRequestException);
            const blockers = caught.getResponse().details.integrity.blockers;
            expect(blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH' && b.word === '波士顿')).toBe(true);
        });
        it('禁用词面同样收口：「限[U+00B7]时」（Po 中点，三修挂账）→ 400', async () => {
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({ name: '限\u00B7时特惠水桶包', description: '' })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
        it('视觉空名姿势不进闸（DTO 层已 400）——含真实文字+走私字符的名不误拦（拦截看词表）', async () => {
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '波\u{1F600}士顿手提包',
                description: '',
                specifications: { factCard: { colorGroup: '黑', bagType: '波士顿' } },
            });
            expect(r).toEqual({ warnings: [] });
        });
    });
    describe('四修 P2：factCard 字段长度上限 50', () => {
        it('colorGroup 51 字 → 400 报文含 colorGroup 与上限说明', async () => {
            let caught;
            try {
                await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                    name: '托特包',
                    description: '',
                    specifications: { factCard: { colorGroup: '黑'.repeat(51), bagType: '托特' } },
                });
                throw new Error('应当被 400 拦下');
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.BadRequestException);
            const msg = String(caught.getResponse().message);
            expect(msg).toContain('colorGroup');
            expect(msg).toContain('50');
        });
        it('bagType 51 字 → 400；恰好 50 字放行（边界）', async () => {
            await expect((0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '托特包',
                description: '',
                specifications: { factCard: { colorGroup: '黑', bagType: '托'.repeat(51) } },
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
            const r = await (0, product_integrity_gate_1.enforceProductIntegrityGate)({
                name: '托特包',
                description: '',
                specifications: { factCard: { colorGroup: '黑', bagType: '托'.repeat(50) } },
            });
            expect(r).toBeDefined();
        });
    });
});
