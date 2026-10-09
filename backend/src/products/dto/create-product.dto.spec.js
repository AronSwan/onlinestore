"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_product_dto_1 = require("./create-product.dto");
const update_product_dto_1 = require("./update-product.dto");
const validBody = {
    name: '黑色小圆筒包',
    description: '头层牛皮，通勤也拿得出手',
    price: 299,
    originalPrice: 399,
    stock: 5,
};
async function errorsOf(cls, body) {
    const dto = (0, class_transformer_1.plainToInstance)(cls, body);
    const errors = await (0, class_validator_1.validate)(dto, { whitelist: false });
    return errors.flatMap((e) => [
        e.property,
        ...Object.keys(e.constraints ?? {}),
        ...Object.values(e.constraints ?? {}),
    ]);
}
describe('P1-4 CreateProductDto 服务端 sanity', () => {
    it('合法载荷零错误（正控，含可选 originalPrice）', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, validBody);
        expect(errs).toHaveLength(0);
    });
    it('可选字段缺省合法：不传 originalPrice/categoryId/tags', async () => {
        const { name, description, price, stock } = validBody;
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { name, description, price, stock });
        expect(errs).toHaveLength(0);
    });
    it('空名 → IsNotEmpty 400（双盲审 P1-2/P2-1 场景：空名+齐事实卡全链路发布）', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '' });
        expect(errs).toContain('name');
        expect(errs.join(' ')).toContain('产品名称不能为空');
    });
    it('超长名（201 字）→ MaxLength', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '长'.repeat(201) });
        expect(errs.join(' ')).toContain('产品名称不能超过 200 字符');
    });
    it('price=0 / 负数 → Min(0.01) 400', async () => {
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, price: 0 })).join(' ')).toContain('产品价格必须大于 0');
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, price: -5 })).join(' ')).toContain('产品价格必须大于 0');
    });
    it('stock=1.5 → IsInt；stock=-1 → Min(0)', async () => {
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, stock: 1.5 })).join(' ')).toContain('库存数量必须是整数');
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, stock: -1 })).join(' ')).toContain('库存数量不能为负数');
    });
    it('originalPrice<price → 跨字段约束 400；=price / >price 合法', async () => {
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, price: 399, originalPrice: 299 })).join(' ')).toContain('划线原价 originalPrice 不能低于现价 price');
        expect(await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, price: 399, originalPrice: 399 })).toHaveLength(0);
        expect(await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, price: 299, originalPrice: 399 })).toHaveLength(0);
    });
    it('specifications 传标量 → IsObject；images 传非串数组 → IsString(each)', async () => {
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, specifications: '头层牛皮' })).join(' ')).toContain('产品规格必须是对象');
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, images: ['/a.jpg', 42] })).join(' ')).toContain('each value in images must be a string');
    });
});
describe('P1-4 UpdateProductDto（PartialType 继承）', () => {
    it('空载荷（PATCH 语义）合法', async () => {
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, {})).toHaveLength(0);
    });
    it('只传 price=0 → 继承 Min(0.01) 400', async () => {
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { price: 0 })).join(' ')).toContain('产品价格必须大于 0');
    });
    it('只传 stock=1.5 → 继承 IsInt 400', async () => {
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { stock: 1.5 })).join(' ')).toContain('库存数量必须是整数');
    });
    it('只传 name="" → 继承 IsNotEmpty 400', async () => {
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { name: '' })).join(' ')).toContain('产品名称不能为空');
    });
    it('price+originalPrice 同传且倒挂 → 继承跨字段约束；只传 originalPrice 不比对现价', async () => {
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { price: 399, originalPrice: 299 })).join(' ')).toContain('划线原价 originalPrice 不能低于现价 price');
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { originalPrice: 299 })).toHaveLength(0);
    });
    it('R4：name 全空格（5 空格）trim 后为空 → IsNotEmpty 400', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '     ' });
        expect(errs.join(' ')).toContain('产品名称不能为空');
    });
    it('R4：@Transform 落形——前后空白被剥掉，controller/service 拿到整形后值', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, name: '  黑色小圆筒包  ' });
        expect(dto.name).toBe('黑色小圆筒包');
        const errs = await (0, class_validator_1.validate)(dto, { whitelist: false });
        expect(errs).toHaveLength(0);
        const dto2 = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, name: 123 });
        expect(dto2.name).toBe(123);
    });
    it('R4：name 含换行（\\n / \\r）→ Matches 400「名称不能包含换行」', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '黑色\n小圆筒包' });
        expect(errs.join(' ')).toContain('名称不能包含换行');
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '黑色\r小圆筒包' })).join(' ')).toContain('名称不能包含换行');
    });
    it('R4：description 2001 字 → MaxLength 400；恰好 2000 字放行（边界）', async () => {
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, description: '好'.repeat(2001) })).join(' ')).toContain('产品描述不能超过 2000 字符');
        expect(await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, description: '好'.repeat(2000) })).toHaveLength(0);
    });
    it('R4：description 仍必填（缺省 400）——products.description 列 NOT NULL，缺省放行会把失败面挪到 DB 500（@IsOptional 偏差见汇报已知限制段）', async () => {
        const { name, price, stock } = validBody;
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { name, price, stock });
        expect(errs).toContain('description');
    });
    it('R4：PartialType 继承整形面——PATCH 全空格 name 400 / 超长 description 400 / 带换行 name 400', async () => {
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { name: '   ' })).join(' ')).toContain('产品名称不能为空');
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { description: '长'.repeat(2001) })).join(' ')).toContain('产品描述不能超过 2000 字符');
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { name: '凯莉\n包' })).join(' ')).toContain('名称不能包含换行');
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, { name: '  凯莉包  ' });
        expect(dto.name).toBe('凯莉包');
    });
});
describe('三修 P2-5：视觉空名（Cf+White_Space 剥离后空 → IsNotEmpty 400）', () => {
    it('纯零宽字符名（U+200B×3）→ 400（trim 不剥 Cf，旧实现放行落库空名）', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '\u200B\u200B\u200B' });
        expect(errs.join(' ')).toContain('产品名称不能为空');
    });
    it('Cf+空格混合名（BOM+空格+软连字符）→ 400', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '\uFEFF \u00AD' });
        expect(errs.join(' ')).toContain('产品名称不能为空');
    });
    it('含可见内容的名字不被误伤：内部空格保留、仅剥首尾空白', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, name: ' 托 特包 ' });
        expect(dto.name).toBe('托 特包');
        expect(await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: ' 托 特包 ' })).toHaveLength(0);
    });
    it('PartialType 继承：PATCH 纯 Cf 名同样 400', async () => {
        const errs = await errorsOf(update_product_dto_1.UpdateProductDto, { name: '\u200B' });
        expect(errs.join(' ')).toContain('产品名称不能为空');
    });
});
describe('三修 P2-6：标量 null → undefined 归一（不再穿透到 DB NOT NULL 500）', () => {
    it('PATCH {price:null} → 归一为 undefined（@IsOptional 放行，值不进 update 集）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, { price: null, name: 'x' });
        expect(dto.price).toBeUndefined();
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { price: null, name: 'x' })).toHaveLength(0);
    });
    it('PATCH {stock:null} 归一 undefined；{originalPrice:null} 显式保留（P1-3·四修：清除划线价合法语义）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, { stock: null, originalPrice: null });
        expect(dto.stock).toBeUndefined();
        expect(dto.originalPrice).toBeNull();
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { stock: null, originalPrice: null })).toHaveLength(0);
    });
    it('CREATE {name:null} → undefined → 必填校验 400（fail-clean，非 500）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, name: null });
        expect(dto.name).toBeUndefined();
        const errs = await (0, class_validator_1.validate)(dto, { whitelist: false });
        expect(errs.some((e) => e.property === 'name')).toBe(true);
    });
    it('CREATE {price:null} → undefined → @IsNumber 400（fail-clean）', async () => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, price: null });
        expect(errs.join(' ')).toContain('price');
    });
});
describe('三修 P3：@Matches 补 U+2028/2029 行终止符', () => {
    it('name 含 U+2028 / U+2029 → 400「名称不能包含换行」（[^n r] 不拦的 JS 合法换行符）', async () => {
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '黑\u2028色' })).join(' ')).toContain('名称不能包含换行');
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: '黑\u2029色' })).join(' ')).toContain('名称不能包含换行');
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { name: '黑\u2028色' })).join(' ')).toContain('名称不能包含换行');
    });
});
describe('四修 P1-3：originalPrice null 例外（branch2=抬价+清划线 HTTP 可达）', () => {
    it('PATCH {price:500, originalPrice:null} → 双值零错误落形（branch2 父提交合法请求恢复 200 通道）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, { price: 500, originalPrice: null });
        expect(dto.price).toBe(500);
        expect(dto.originalPrice).toBeNull();
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { price: 500, originalPrice: null })).toHaveLength(0);
    });
    it('PATCH {originalPrice:null} 单发 → null 保留零错误（清除划线价语义，三修前行为恢复）', async () => {
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { originalPrice: null })).toHaveLength(0);
    });
    it('CREATE {originalPrice:null} → null 透传零错误（无划线价，落库 NULL——列 nullable）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, originalPrice: null });
        expect(dto.originalPrice).toBeNull();
        expect(await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, originalPrice: null })).toHaveLength(0);
    });
    it('originalPrice 数值校验仍生效：0 → Min(0.01) 400；跨字段倒挂 → 400（null 例外不放宽数值面）', async () => {
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { originalPrice: 0 })).join(' ')).toContain('原价必须大于 0');
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { price: 399, originalPrice: 299 })).join(' ')).toContain('划线原价 originalPrice 不能低于现价 price');
    });
});
describe('四修 P2：null→undefined 归一扩面（NOT NULL 列与关系字段）', () => {
    it('PATCH {description:null} → undefined（NOT NULL 列 500 面收口）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, { description: null });
        expect(dto.description).toBeUndefined();
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { description: null })).toHaveLength(0);
    });
    it('CREATE {description:null} → undefined → 必填校验 400 fail-clean（非 DB 500）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, description: null });
        expect(dto.description).toBeUndefined();
        expect(errsOfProp(await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, description: null }), 'description')).toBe(true);
    });
    it('PATCH {isActive:null} / {categoryId:null} / {images:null} → 各自 undefined（关系字段不做清除语义）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, {
            isActive: null,
            categoryId: null,
            images: null,
        });
        expect(dto.isActive).toBeUndefined();
        expect(dto.categoryId).toBeUndefined();
        expect(dto.images).toBeUndefined();
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { isActive: null, categoryId: null, images: null })).toHaveLength(0);
        const dto2 = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, isActive: null });
        expect(dto2.isActive).toBeUndefined();
    });
    function errsOfProp(errs, prop) {
        return errs.includes(prop);
    }
    it('mainImage/tags/specifications 的 null 不归一（tags/specifications 列 nullable，null=清空为既有语义；mainImage 同）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_product_dto_1.UpdateProductDto, { mainImage: null, tags: null });
        expect(dto.mainImage).toBeNull();
        expect(dto.tags).toBeNull();
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { mainImage: null, tags: null })).toHaveLength(0);
    });
});
describe('四修 P2：tags 元素 @MaxLength(50)', () => {
    it('51 字标签 → 400「每个标签不能超过 50 字符」；恰好 50 字放行（边界）', async () => {
        expect((await errorsOf(update_product_dto_1.UpdateProductDto, { tags: ['新'.repeat(51)] })).join(' ')).toContain('每个标签不能超过 50 字符');
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { tags: ['新'.repeat(50)] })).toHaveLength(0);
        expect((await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, tags: ['a'.repeat(51)] })).join(' ')).toContain('每个标签不能超过 50 字符');
    });
});
describe('四修 P1-1：视觉空名全姿势（白名单折叠——非 \\p{L}\\p{N} 全剥后空 → 400）', () => {
    const blankNames = [
        ['\u200B\u200B\u200B', '纯零宽 Cf（三修已收）'],
        ['\uFEFF \u00AD', 'BOM+空格+软连字符（三修已收）'],
        ['\u00B7\u00B7\u00B7', '中点 Po（三修盲区→四修收口）'],
        ['\u3001\u2010\u2019', '顿号 Po/连字符 Pd/右引号 Pf（X2 姿势）'],
        ['\u2800\u2800', '盲文空白 So（X1 视觉空名姿势）'],
        ['\uE000\u0378', '私有区 Co+未赋码位 Cn（X1 主案家族）'],
        ['\u3164\u3164\u3164', 'Hangul 填充符 Lo（白名单例外集）'],
        ['\u{1F600}\u{1F604}', 'Emoji So（X1/X2 共中）'],
        ['\u0301\u034F\uFE0F', '组合记号 Mn 家族'],
        [' \u3000\u00A0\t', '空白家族 Zs/制表（三修已收）'],
    ];
    it.each(blankNames)('name=%j（%s）→ IsNotEmpty 400', async (name) => {
        const errs = await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name });
        expect(errs.join(' ')).toContain('产品名称不能为空');
    });
    it('PartialType 继承：PATCH 侧全姿势同样 400', async () => {
        for (const [name] of blankNames) {
            const errs = await errorsOf(update_product_dto_1.UpdateProductDto, { name });
            expect(errs.join(' ')).toContain('产品名称不能为空');
        }
    });
    it('含真实文字的名字不误伤：走私字符夹在词中间 → 存原文 trim（拦截交由闸/引擎）', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_product_dto_1.CreateProductDto, { ...validBody, name: ' 波\uE000士顿包 ' });
        expect(dto.name).toBe('波\uE000士顿包');
        expect(await errorsOf(create_product_dto_1.CreateProductDto, { ...validBody, name: ' 波\uE000士顿包 ' })).toHaveLength(0);
    });
    it('数字名（\\p{N}）不算空名：「2025」放行', async () => {
        expect(await errorsOf(update_product_dto_1.UpdateProductDto, { name: '2025' })).toHaveLength(0);
    });
});
