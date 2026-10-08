import { Test } from '@nestjs/testing';
import {
  AllExceptionsProblemDetailsFilter,
} from './all-exceptions.problem-details.filter';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * RFC 9457 filter 契约锁（定调会 S1，2026-10-09）
 * 断言面对齐契约席预案五变体映射——本 spec 即错误契约的单一形状源。
 */
describe('AllExceptionsProblemDetailsFilter', () => {
  let filter: AllExceptionsProblemDetailsFilter;
  let res: { status: jest.Mock; set: jest.Mock; json: jest.Mock };
  let req: { method: string; url: string; originalUrl: string };

  beforeEach(() => {
    filter = new AllExceptionsProblemDetailsFilter();
    res = { status: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), json: jest.fn() };
    req = { method: 'POST', url: '/api/auth/login', originalUrl: '/api/auth/login' };
  });

  const catchIt = (exception: unknown) =>
    filter.catch(exception, {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    } as any);

  it('V-A 标准单串：BadRequestException 中文 → problem+json 全字段', () => {
    catchIt(new BadRequestException('邮箱格式不正确'));
    const body = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': expect.stringContaining('application/problem+json') }),
    );
    expect(body).toMatchObject({
      type: 'about:blank',
      title: 'BadRequest',
      status: 400,
      detail: '邮箱格式不正确',
      instance: '/api/auth/login',
      message: '邮箱格式不正确',
    });
  });

  it('V-B 校验数组：ValidationPipe 对象体 message:string[] → detail join(；) + errors 保留', () => {
    // 真实调用面：ValidationPipe 抛的对象体（message 保持数组），
    // 而非 new BadRequestException([...])——后者会被 Nest 构造器 join 成逗号串
    catchIt(
      new HttpException(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: ['请输入有效的邮箱地址', '密码长度至少8位'],
        },
        400,
      ),
    );
    const body = res.json.mock.calls[0][0];
    expect(body.detail).toBe('请输入有效的邮箱地址；密码长度至少8位');
    expect(body.errors).toEqual(['请输入有效的邮箱地址', '密码长度至少8位']);
    expect(body.message).toBe(body.detail);
  });

  it('V-C 信封对象体（源头改造前兜底）：{success:false,message} → detail=message', () => {
    catchIt(
      new HttpException({ success: false, message: '地理编码服务不可用' }, 400),
    );
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe(400);
    expect(body.detail).toBe('地理编码服务不可用');
  });

  it('V-D 限流对象体：retryAfter → Retry-After 响应头', () => {
    catchIt(
      new HttpException(
        { statusCode: 429, message: '请求过于频繁，请稍后再试', retryAfter: 60 },
        429,
      ),
    );
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Retry-After': '60' }),
    );
    const body = res.json.mock.calls[0][0];
    expect(body.detail).toBe('请求过于频繁，请稍后再试');
  });

  it('非 HttpException（裸 Error）→ 500 通用 problem，不泄内部信息', () => {
    const secretError = new Error('数据库连接串 postgres://user:password@host 泄漏测试');
    catchIt(secretError);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.detail).toBe('服务器内部错误');
    expect(JSON.stringify(body)).not.toContain('password');
    expect(JSON.stringify(body)).not.toContain('postgres');
  });

  it('404 NotFoundException → reason phrase title', () => {
    catchIt(new NotFoundException('购物车商品不存在'));
    const body = res.json.mock.calls[0][0];
    expect(body).toMatchObject({ status: 404, title: 'NotFound', detail: '购物车商品不存在' });
  });

  it('401 UnauthorizedException → title Unauthorized', () => {
    catchIt(new UnauthorizedException('JWT令牌缺失'));
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe(401);
    expect(body.title).toBe('Unauthorized');
  });
});
