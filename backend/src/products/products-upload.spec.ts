// 用途：商品图上传端点（M2-B5）行为测试
// 安全纪律（docs/safety.md「上传只收真图片」行）：
//   ① magic bytes 校验（不信 mimetype/扩展名）②扩展名白名单 ③≤5MB 双闸
//   ④文件名服务端生成，绝不用客户端文件名 ⑤落盘锁定仓库根 images/products/
//   ⑥R5 结构完整性复查（攻击席 P2）：polyglot/截断图 400（2026-10-04 补强）
// 授权面（无 token 401 / user 403 / admin 放行）由 common/guards/authorization-wiring.spec.ts
// 元数据锁兜底（直调式 controller spec 不经过守卫管道，无法在此覆盖 401/403）。
// 时间：2026-10-04

import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  ProductsController,
  detectImageExt,
  isImageStructurallyComplete,
  resolveUploadDir,
} from './products.controller';

// R5：自造的最小合法真图——1×1 透明 PNG（70 字节，含 IHDR/IDAT/IEND 完整骨架）
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
// 只有签名头的截断 PNG（12 字节）——magic bytes 可过、结构完整性不可过
const PNG_HEADER_ONLY = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const WEBP_BYTES = Buffer.from('RIFF....WEBP', 'ascii');
const TEXT_BYTES = Buffer.from('this is definitely not an image', 'utf8');
// polyglot 载荷占位：非图片脚本体（不含 JPEG EOI）。刻意用无语义纯文本，
// 避免真实 shell 样本特征串进仓触发 AV 实时防护锁文件（本仓已踩过一次坑）。
const SCRIPT_BODY = Buffer.from('SCRIPT-BODY-PLACEHOLDER-NOT-JPEG-DATA-NO-EOI-HERE', 'utf8');

describe('ProductsController 上传端点（M2-B5）', () => {
  let controller: ProductsController;

  beforeEach(() => {
    // 直构控制器——上传 handler 不触达任何下游服务，依赖全部空 stub
    controller = new ProductsController(
      {} as any, // productsService
      {} as any, // searchManagerService
      {} as any, // searchSuggestionService
      {} as any, // popularSearchService
      { log: jest.fn() } as any, // auditService
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('未携带文件 → 400 BadRequestException', async () => {
    await expect(controller.uploadImage(undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('伪装图片：.png 文件名 + 文本内容（magic bytes 不符）→ 400', async () => {
    await expect(
      controller.uploadImage({
        originalname: 'fake.png',
        buffer: TEXT_BYTES,
        size: TEXT_BYTES.length,
        mimetype: 'image/png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mimetype 伪造：自称 image/png 的 exe 内容 → 400（不信 mimetype）', async () => {
    const mzBytes = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    await expect(
      controller.uploadImage({
        originalname: 'evil.jpg',
        buffer: mzBytes,
        size: mzBytes.length,
        mimetype: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('扩展名不在白名单（.gif，即使内容合法）→ 400', async () => {
    const gifBytes = Buffer.from('GIF89a........', 'ascii');
    await expect(
      controller.uploadImage({
        originalname: 'anim.gif',
        buffer: gifBytes,
        size: gifBytes.length,
        mimetype: 'image/gif',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('超过 5MB → 413 PayloadTooLargeException（handler 第二闸）', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    PNG_BYTES.copy(big, 0); // 内容是真 PNG，纯粹超限
    await expect(
      controller.uploadImage({
        originalname: 'big.png',
        buffer: big,
        size: big.length,
        mimetype: 'image/png',
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('合法 PNG → 返回 /images/products/<服务端生成名>，落盘在锁定目录内且不用客户端文件名', async () => {
    // 真写真删（fs 命名空间在 ESM 下冻结无法 spy；往返验证反而更强）——
    // 文件落进仓库根 images/products/ 后本用例负责清场。
    const result = await controller.uploadImage({
      originalname: '../../../etc/passwd.png', // 客户端文件名恶意也不应被采用
      buffer: PNG_BYTES,
      size: PNG_BYTES.length,
      mimetype: 'image/png',
    });

    expect(result.path).toMatch(/^\/images\/products\/\d+-[0-9a-f]{16}\.png$/);
    expect(result.path).not.toContain('passwd');

    const written = path.join(resolveUploadDir(), path.basename(result.path));
    try {
      expect(path.dirname(written)).toBe(resolveUploadDir());
      expect(fs.existsSync(written)).toBe(true);
      expect(fs.readFileSync(written).equals(PNG_BYTES)).toBe(true);
    } finally {
      if (fs.existsSync(written)) fs.unlinkSync(written); // 测试数据用完必清
    }
    expect(fs.existsSync(written)).toBe(false);
  });

  // ─────────────────────────────────────────────
  // M2-B5 补强（攻击席 P2 / R5）：结构完整性复查
  // ─────────────────────────────────────────────
  it('polyglot：JPEG 头 + 纯脚本体（无 FFD9 收尾）→ 400 文件结构不完整', async () => {
    const polyglot = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      SCRIPT_BODY, // 此前可 201 入库，现在结构闸拦截
    ]);
    await expect(
      controller.uploadImage({
        originalname: 'shell.jpg',
        buffer: polyglot,
        size: polyglot.length,
        mimetype: 'image/jpeg',
      }),
    ).rejects.toMatchObject({ message: '文件结构不完整' });
  });

  it('截断 PNG（只有签名头无 IEND）→ 400 文件结构不完整', async () => {
    await expect(
      controller.uploadImage({
        originalname: 'trunc.png',
        buffer: PNG_HEADER_ONLY,
        size: PNG_HEADER_ONLY.length,
        mimetype: 'image/png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('RIFF 头 + 短垃圾（长度字段与实际不符）→ 400 文件结构不完整', async () => {
    const junk = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0xff, 0x00, 0x00, 0x00]), // 声明 255 字节
      Buffer.from('WEBP', 'ascii'),
      Buffer.from('short garbage', 'ascii'), // 实际只有 12 字节载荷
    ]);
    await expect(
      controller.uploadImage({
        originalname: 'junk.webp',
        buffer: junk,
        size: junk.length,
        mimetype: 'image/webp',
      }),
    ).rejects.toMatchObject({ message: '文件结构不完整' });
  });

  it('resolveUploadDir 锁定到仓库根 images/products（含 images 段且不以 backend 结尾）', () => {
    const dir = resolveUploadDir();
    expect(dir.endsWith(`images${path.sep}products`)).toBe(true);
    expect(dir.split(path.sep)).not.toContain('dist');
  });
});

describe('detectImageExt（magic bytes 识别）', () => {
  it('jpeg / png / webp 各自命中', () => {
    expect(detectImageExt(JPEG_BYTES)).toBe('.jpg');
    expect(detectImageExt(PNG_BYTES)).toBe('.png');
    expect(detectImageExt(WEBP_BYTES)).toBe('.webp');
  });

  it('非图片内容与过短 buffer → null', () => {
    expect(detectImageExt(TEXT_BYTES)).toBeNull();
    expect(detectImageExt(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageExt(Buffer.alloc(0))).toBeNull();
  });
});

describe('isImageStructurallyComplete（R5 结构完整性复查）', () => {
  it('JPEG：头 + 体 + 尾部 4 字节内 FFD9 → true；体无 FFD9 → false', () => {
    const goodJpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(64, 0xab), // 压缩数据占位
      Buffer.from([0xff, 0xd9]), // EOI 收尾
    ]);
    expect(isImageStructurallyComplete(goodJpeg, '.jpg')).toBe(true);

    const padJpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(64, 0xab),
      Buffer.from([0xff, 0xd9, 0x00, 0x00]), // EOI 后 ≤2 字节填充，仍在尾部 4 字节窗口内
    ]);
    expect(isImageStructurallyComplete(padJpeg, '.jpg')).toBe(true);

    const scriptJpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      SCRIPT_BODY, // 无 EOI 的 polyglot
    ]);
    expect(isImageStructurallyComplete(scriptJpeg, '.jpg')).toBe(false);
  });

  it('PNG：尾部 12 字节含 IEND → true；只有签名头 → false', () => {
    expect(isImageStructurallyComplete(PNG_BYTES, '.png')).toBe(true);
    expect(isImageStructurallyComplete(PNG_HEADER_ONLY, '.png')).toBe(false);
  });

  it('WebP：RIFF 长度字段与 buffer 一致 → true；声明长度不符（容差 0）→ false', () => {
    const payload = Buffer.from('WEBPVP8 sample', 'ascii');
    const lenField = Buffer.alloc(4);
    lenField.writeUInt32LE(payload.length, 0); // 长度字段 = 8 字节 RIFF 头之后的载荷长度 = 总长 - 8
    const goodWebp = Buffer.concat([Buffer.from('RIFF', 'ascii'), lenField, payload]);
    expect(isImageStructurallyComplete(goodWebp, '.webp')).toBe(true);

    const junk = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0xff, 0x00, 0x00, 0x00]), // 声明 255
      Buffer.from('WEBP', 'ascii'),
      Buffer.from('short', 'ascii'), // 实际 9 字节
    ]);
    expect(isImageStructurallyComplete(junk, '.webp')).toBe(false);
  });

  it('过短 buffer 一律 false', () => {
    expect(isImageStructurallyComplete(Buffer.alloc(8), '.jpg')).toBe(false);
    expect(isImageStructurallyComplete(Buffer.alloc(0), '.png')).toBe(false);
  });
});
