// 用途：P1-4(双盲审 2026-10-05) 服务端 sanity 的 DTO 层 spec。
// 直接驱动 class-validator 的 validate()——与全局 ValidationPipe 同引擎同装饰器，
// 覆盖：空名/超长名、price=0、stock 非整/负数、originalPrice<price 跨字段约束、
// specifications/images 形状，以及 UpdateProductDto（PartialType）对全部约束的继承。
// （控制器单测绕过管道，故管道语义在此文件锁定。）

import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

/** 合法基线载荷（在其上单字段做破坏） */
const validBody: Record<string, unknown> = {
  name: '黑色小圆筒包',
  description: '头层牛皮，通勤也拿得出手',
  price: 299,
  originalPrice: 399,
  stock: 5,
};

async function errorsOf(cls: new () => any, body: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, { whitelist: false });
  return errors.flatMap((e: ValidationError) => [
    e.property,
    ...Object.keys(e.constraints ?? {}),
    ...Object.values(e.constraints ?? {}),
  ]);
}

describe('P1-4 CreateProductDto 服务端 sanity', () => {
  it('合法载荷零错误（正控，含可选 originalPrice）', async () => {
    const errs = await errorsOf(CreateProductDto, validBody);
    expect(errs).toHaveLength(0);
  });

  it('可选字段缺省合法：不传 originalPrice/categoryId/tags', async () => {
    const { name, description, price, stock } = validBody;
    const errs = await errorsOf(CreateProductDto, { name, description, price, stock });
    expect(errs).toHaveLength(0);
  });

  it('空名 → IsNotEmpty 400（双盲审 P1-2/P2-1 场景：空名+齐事实卡全链路发布）', async () => {
    const errs = await errorsOf(CreateProductDto, { ...validBody, name: '' });
    expect(errs).toContain('name');
    expect(errs.join(' ')).toContain('产品名称不能为空');
  });

  it('超长名（201 字）→ MaxLength', async () => {
    const errs = await errorsOf(CreateProductDto, { ...validBody, name: '长'.repeat(201) });
    expect(errs.join(' ')).toContain('产品名称不能超过 200 字符');
  });

  it('price=0 / 负数 → Min(0.01) 400', async () => {
    expect((await errorsOf(CreateProductDto, { ...validBody, price: 0 })).join(' ')).toContain(
      '产品价格必须大于 0',
    );
    expect((await errorsOf(CreateProductDto, { ...validBody, price: -5 })).join(' ')).toContain(
      '产品价格必须大于 0',
    );
  });

  it('stock=1.5 → IsInt；stock=-1 → Min(0)', async () => {
    expect((await errorsOf(CreateProductDto, { ...validBody, stock: 1.5 })).join(' ')).toContain(
      '库存数量必须是整数',
    );
    expect((await errorsOf(CreateProductDto, { ...validBody, stock: -1 })).join(' ')).toContain(
      '库存数量不能为负数',
    );
  });

  it('originalPrice<price → 跨字段约束 400；=price / >price 合法', async () => {
    expect(
      (await errorsOf(CreateProductDto, { ...validBody, price: 399, originalPrice: 299 })).join(' '),
    ).toContain('划线原价 originalPrice 不能低于现价 price');
    expect(await errorsOf(CreateProductDto, { ...validBody, price: 399, originalPrice: 399 })).toHaveLength(0);
    expect(await errorsOf(CreateProductDto, { ...validBody, price: 299, originalPrice: 399 })).toHaveLength(0);
  });

  it('specifications 传标量 → IsObject；images 传非串数组 → IsString(each)', async () => {
    expect(
      (await errorsOf(CreateProductDto, { ...validBody, specifications: '头层牛皮' })).join(' '),
    ).toContain('产品规格必须是对象');
    expect(
      (await errorsOf(CreateProductDto, { ...validBody, images: ['/a.jpg', 42] })).join(' '),
    ).toContain('each value in images must be a string');
  });
});

describe('P1-4 UpdateProductDto（PartialType 继承）', () => {
  it('空载荷（PATCH 语义）合法', async () => {
    expect(await errorsOf(UpdateProductDto, {})).toHaveLength(0);
  });

  it('只传 price=0 → 继承 Min(0.01) 400', async () => {
    expect((await errorsOf(UpdateProductDto, { price: 0 })).join(' ')).toContain('产品价格必须大于 0');
  });

  it('只传 stock=1.5 → 继承 IsInt 400', async () => {
    expect((await errorsOf(UpdateProductDto, { stock: 1.5 })).join(' ')).toContain('库存数量必须是整数');
  });

  it('只传 name="" → 继承 IsNotEmpty 400', async () => {
    expect((await errorsOf(UpdateProductDto, { name: '' })).join(' ')).toContain('产品名称不能为空');
  });

  it('price+originalPrice 同传且倒挂 → 继承跨字段约束；只传 originalPrice 不比对现价', async () => {
    expect(
      (await errorsOf(UpdateProductDto, { price: 399, originalPrice: 299 })).join(' '),
    ).toContain('划线原价 originalPrice 不能低于现价 price');
    expect(await errorsOf(UpdateProductDto, { originalPrice: 299 })).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // R4（P2·二次修复 2026-10-05）：name/description 服务端整形。
  // name：@Transform trim（全空格→空→IsNotEmpty 拒）+ 换行拒；
  // description：MaxLength(2000)（关 Y1 实测 CPU 放大面：64KB=33.5ms）。
  // 单值 PATCH 的跨字段倒挂由 service 合并视图校验（R1，另见 service spec）。
  // ─────────────────────────────────────────────────────────────
  it('R4：name 全空格（5 空格）trim 后为空 → IsNotEmpty 400', async () => {
    const errs = await errorsOf(CreateProductDto, { ...validBody, name: '     ' });
    expect(errs.join(' ')).toContain('产品名称不能为空');
  });

  it('R4：@Transform 落形——前后空白被剥掉，controller/service 拿到整形后值', async () => {
    const dto = plainToInstance(CreateProductDto, { ...validBody, name: '  黑色小圆筒包  ' });
    expect(dto.name).toBe('黑色小圆筒包');
    const errs = await validate(dto, { whitelist: false });
    expect(errs).toHaveLength(0);
    // 非字符串值不经 trim 原样放行给类型校验器裁决
    const dto2 = plainToInstance(CreateProductDto, { ...validBody, name: 123 });
    expect(dto2.name).toBe(123);
  });

  it('R4：name 含换行（\\n / \\r）→ Matches 400「名称不能包含换行」', async () => {
    const errs = await errorsOf(CreateProductDto, { ...validBody, name: '黑色\n小圆筒包' });
    expect(errs.join(' ')).toContain('名称不能包含换行');
    expect((await errorsOf(CreateProductDto, { ...validBody, name: '黑色\r小圆筒包' })).join(' ')).toContain(
      '名称不能包含换行',
    );
  });

  it('R4：description 2001 字 → MaxLength 400；恰好 2000 字放行（边界）', async () => {
    expect(
      (await errorsOf(CreateProductDto, { ...validBody, description: '好'.repeat(2001) })).join(' '),
    ).toContain('产品描述不能超过 2000 字符');
    expect(
      await errorsOf(CreateProductDto, { ...validBody, description: '好'.repeat(2000) }),
    ).toHaveLength(0);
  });

  it('R4：description 仍必填（缺省 400）——products.description 列 NOT NULL，缺省放行会把失败面挪到 DB 500（@IsOptional 偏差见汇报已知限制段）', async () => {
    const { name, price, stock } = validBody;
    const errs = await errorsOf(CreateProductDto, { name, price, stock });
    expect(errs).toContain('description');
  });

  it('R4：PartialType 继承整形面——PATCH 全空格 name 400 / 超长 description 400 / 带换行 name 400', async () => {
    expect((await errorsOf(UpdateProductDto, { name: '   ' })).join(' ')).toContain('产品名称不能为空');
    expect((await errorsOf(UpdateProductDto, { description: '长'.repeat(2001) })).join(' ')).toContain(
      '产品描述不能超过 2000 字符',
    );
    expect((await errorsOf(UpdateProductDto, { name: '凯莉\n包' })).join(' ')).toContain(
      '名称不能包含换行',
    );
    // PATCH 侧 trim 落形同样继承
    const dto = plainToInstance(UpdateProductDto, { name: '  凯莉包  ' });
    expect(dto.name).toBe('凯莉包');
  });
});
