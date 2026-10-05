// 用途：创建产品数据传输对象
// 依赖文件：product.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:40:00
// P1-4(双盲审 2026-10-05)：服务端 sanity 补齐——原实现仅前端 gates sanityCheck
// 把关（信任边界错位：空名/price=0/stock=1.5/originalPrice<price 全 201 入库）。
// UpdateProductDto 经 PartialType 全量继承（含跨字段约束与各项长度/类型装饰器）。
// R4(二次修复 2026-10-05)：name 整形（trim+全空格拒+换行拒）与 description
// 上限 2000——PATCH 单值倒挂的跨字段缺口由 service 层合并视图补（R1）。

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsOptional,
  Min,
  IsInt,
  IsArray,
  IsObject,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * P1-4：划线原价不得低于现价（跨字段约束——@ValidateIf 只能控执行条件、
 * 无法比对另一字段，故用 class-validator 自定义约束；仅当两值均为数字时生效，
 * originalPrice 本身可选，与前端 gates sanityCheck 的 original_below_price 同判）。
 */
@ValidatorConstraint({ name: 'originalPriceNotBelowPrice', async: false })
class OriginalPriceNotBelowPriceConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const price = (args.object as Record<string, unknown>).price;
    if (typeof price !== 'number' || typeof value !== 'number') return true;
    return value >= price;
  }

  defaultMessage(): string {
    return '划线原价 originalPrice 不能低于现价 price';
  }
}

/**
 * P2-6（三修）→ P1-3（四修，fix3 裁定）：标量字段 null → undefined 归一。
 * 根因：PartialType 继承后标量字段变可选，class-validator 的 @IsOptional 对
 * null 直接跳过校验——PATCH {price:null} 穿透到 TypeORM SET price=NULL，
 * NOT NULL 列在 DB 层炸 500（X1+Y1 实锤"null→500"）。归一为 undefined 后：
 * 校验面按"未提交"处理（必填字段则 400 fail-clean），TypeORM 的 update
 * 值集显式跳过 undefined 键（UpdateQueryBuilder.createUpdateExpression
 * "it doesn't make sense to update undefined properties"），不进写集。
 * 【originalPrice 例外（四修 P1-3）】：显式 null 是合法的"清除划线价"语义
 * （branch2=抬价+清划线的父提交合法请求），不做 null→undefined 归一——
 * @IsOptional 原生容 null（跳过数值校验），service 侧 mergePriceView 按
 * originalPriceExplicitNull 走清除分支。三修"HTTP 面暂无清除通道"的已知
 * 限制声明随之作废（四修恢复语义）。
 * 【四修 P2 扩面】：description/isActive（NOT NULL 列同 500 面）与
 * categoryId/images（关系字段）补同款归一——关系字段的 null 归一为
 * "未提交"而非"解除关联/清空图片"：解除关联/清图片不是本 DTO 的语义面，
 * 显式声明不做（写 NULL 的清除语义只保留给 originalPrice/specifications）。
 */
/** 标量 null→undefined 归一（导出供 UpdateProductDto 重声明字段复用，语义见上方注释） */
export const nullToUndefined = ({ value }: { value: any }) =>
  value === null ? undefined : value;

/**
 * P2-5（三修）→ P1-1（四修）：视觉空名整形（白名单法根治）。
 * 根因：name 只含隐形/非文字字符（Cf 零宽族、纯空白、中点/连字符等标点、
 * Emoji、盲文空白、Hangul 填充符）时 trim 不剥、@IsNotEmpty 放行 → 落库
 * 前台渲染为空的名字（X1 视觉空名 7 姿势）。修法与 js/shared/integrity-rules.js
 * 的 normalizeForMatch 同字符类（白名单折叠：NFKC 后只认 \p{L}\p{N}，Hangul
 * 填充符例外剥除）——白名单视图为空即视觉空名，归一 '' 触发 @IsNotEmpty 400；
 * 非空则只做常规 trim 存原文（存储保真：内部字符与走私拦截由规则引擎/闸负责）。
 * 单源声明：MATCH_VIEW_STRIP_PATTERN 字面量与 js/shared/normalize-pattern.json
 * 的 stripPattern 必须逐字符一致（js/shared/integrity-rules.test.js 一致性用例
 * 守门）。不直接 import JSON：composite 工程 rootDir 锁定 backend/，仓外 JSON
 * 进编译会破坏 dist 输出布局（node dist/src/main.js 启动契约）——取舍见四修汇报。
 */
const MATCH_VIEW_STRIP_PATTERN = '[^\\p{L}\\p{N}]|[\\u115F\\u1160\\u3164]';
const MATCH_VIEW_STRIP = new RegExp(MATCH_VIEW_STRIP_PATTERN, 'gu');
const normalizeNameInput = ({ value }: { value: any }) => {
  if (value === null) return undefined;
  if (typeof value !== 'string') return value;
  const visibleOnly = value.normalize('NFKC').replace(MATCH_VIEW_STRIP, '');
  return visibleOnly.length === 0 ? '' : value.trim();
};

export class CreateProductDto {
  // R4（P2·二次修复 2026-10-05，清单 4）：name/description 服务端整形。
  // name：@Transform 先 trim 再校验——全空格名在 IsNotEmpty 处拒绝（此前
  // "     " 非空串直通入库）；trim 由全局 ValidationPipe(transform:true)
  // 的 plainToInstance 落形，controller/service 拿到的即整形后值。
  // 换行评估结论=拒绝：商品名含换行不合理（列表/卡片渲染错位、搜索串污染），
  // trim 不除内部 \n，故加 @Matches 排除 \n/\r。UpdateProductDto 经
  // PartialType 全量继承（含 @Transform 与全部校验器）。
  // 三修 P2-5/P3（fix2 §三 5/9）：@Transform 升级 normalizeNameInput
  // （视觉空名归一 ''）；@Matches 补 U+2028/2029 行终止符（JS 字符串合法
  // 换行符但 [^\n\r] 不拦，渲染/日志注入面与 \n 同源）。
  @Transform(normalizeNameInput)
  @ApiProperty({ description: '产品名称', example: '高端智能手机' })
  @IsString()
  @IsNotEmpty({ message: '产品名称不能为空' })
  @MaxLength(200, { message: '产品名称不能超过 200 字符' })
  @Matches(/^[^\n\r\u2028\u2029]*$/, { message: '名称不能包含换行' })
  name: string;

  // R4：description 上限 2000——关掉 Y1 实测的 CPU 放大面（64KB 描述使闸的
  // 词表匹配耗时 33.5ms，超长载荷线性放大）。仍必填：products.description
  // 列 NOT NULL 无默认值，缺省放行会把失败面从 400 挪到 DB 500（与
  // @IsOptional 的任务书字面写法有偏差，见二次修复汇报的已知限制段）。
  // 四修 P2：null→undefined 归一（NOT NULL 列的 500 面同 price/stock）。
  @Transform(nullToUndefined)
  @ApiProperty({ description: '产品描述', example: '最新款高端智能手机' })
  @IsString()
  @MaxLength(2000, { message: '产品描述不能超过 2000 字符' })
  description: string;

  @ApiProperty({ description: '产品价格', example: 2999.99 })
  @Transform(nullToUndefined)
  @IsNumber()
  @Min(0.01, { message: '产品价格必须大于 0' })
  price: number;

  // P1-3（四修，fix3 裁定）：originalPrice 无 nullToUndefined——显式 null 保留
  // 为"清除划线价"合法语义（@IsOptional 原生容 null：跳过数值校验不报错），
  // branch2（抬价+清划线：PATCH {price:500, originalPrice:null}）HTTP 面恢复
  // 可达；service.mergePriceView 按 originalPriceExplicitNull 分流。类型面
  // 如实收窄为 number | null。
  @ApiProperty({ description: '原价（null=清除划线价）', required: false, example: 3499.99 })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: '原价必须大于 0' })
  @Validate(OriginalPriceNotBelowPriceConstraint)
  originalPrice?: number | null;

  @ApiProperty({ description: '库存数量', example: 100 })
  @Transform(nullToUndefined)
  @IsInt({ message: '库存数量必须是整数' })
  @Min(0, { message: '库存数量不能为负数' })
  stock: number;

  // M1-B2(2026-10-04)：categoryId 改可选——分类种子已灌库（scripts/seed-categories.sql），
  // 但不应再让"未传分类"成为创建商品的硬阻塞；传了但不存在仍由 service 抛 404。
  // 四修 P2：null→undefined 归一——关系字段不做"解除关联"清除语义（显式声明）。
  @Transform(nullToUndefined)
  @ApiProperty({ description: '产品分类ID', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  // M1-B1(2026-10-04)：对齐实体——brand 字段已删除（products 表无此列，grep 全仓无消费方）；
  // 补上实体已有但 DTO 缺失的 mainImage/tags（forbidNonWhitelisted 下传了即 400）。
  @ApiProperty({ description: '主图URL', required: false, example: '/images/products/p1.jpg' })
  @IsOptional()
  @IsString()
  mainImage?: string;

  // tags 实体为 simple-array（逗号串存储），TypeORM 自动完成 string[] ↔ 逗号串转换，直接收数组
  // 四修 P2：元素上限 50——徽章渲染面防超长注入（词表面长度缺口，X2）。
  @ApiProperty({ description: '产品标签', type: [String], required: false, example: ['新品', '热销'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: '每个标签不能超过 50 字符' })
  tags?: string[];

  // 四修 P2：null→undefined 归一——images 是 OneToMany 关系字段，null 穿透
  // repository.update 会把关系键当列写（500/怪异行为面）；"清空图片"不是
  // null 的语义（走图片子资源），显式声明不做。
  @Transform(nullToUndefined)
  @ApiProperty({ description: '产品图片URL数组', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: '产品规格', type: Object, required: false })
  @IsOptional()
  @IsObject({ message: '产品规格必须是对象' })
  specifications?: Record<string, any>;

  // 四修 P2：null→undefined 归一——isActive 列 NOT NULL（default true），
  // null 穿透 SET isActive=NULL 同为 500 面。
  @Transform(nullToUndefined)
  @ApiProperty({ description: '是否上架', default: true })
  @IsOptional()
  isActive?: boolean;
}
