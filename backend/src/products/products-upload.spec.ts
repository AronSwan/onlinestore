// 用途：商品图上传端点（M2-B5）行为测试
// 安全纪律（docs/safety.md「上传只收真图片」行）：
//   ① magic bytes 校验（不信 mimetype/扩展名）②扩展名白名单 ③≤5MB 双闸
//   ④文件名服务端生成，绝不用客户端文件名 ⑤落盘锁定仓库根 images/products/
// 授权面（无 token 401 / user 403 / admin 放行）由 common/guards/authorization-wiring.spec.ts
// 元数据锁兜底（直调式 controller spec 不经过守卫管道，无法在此覆盖 401/403）。
// 时间：2026-10-04

import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { ProductsController, detectImageExt, resolveUploadDir } from './products.controller';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const WEBP_BYTES = Buffer.from('RIFF....WEBP', 'ascii');
const TEXT_BYTES = Buffer.from('this is definitely not an image', 'utf8');

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
