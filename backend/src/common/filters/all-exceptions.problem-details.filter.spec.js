"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const all_exceptions_problem_details_filter_1 = require("./all-exceptions.problem-details.filter");
const common_1 = require("@nestjs/common");
describe('AllExceptionsProblemDetailsFilter', () => {
    let filter;
    let res;
    let req;
    beforeEach(() => {
        filter = new all_exceptions_problem_details_filter_1.AllExceptionsProblemDetailsFilter();
        res = { status: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), json: jest.fn() };
        req = { method: 'POST', url: '/api/auth/login', originalUrl: '/api/auth/login' };
    });
    const catchIt = (exception) => filter.catch(exception, {
        switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    });
    it('V-A 标准单串：BadRequestException 中文 → problem+json 全字段', () => {
        catchIt(new common_1.BadRequestException('邮箱格式不正确'));
        const body = res.json.mock.calls[0][0];
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': expect.stringContaining('application/problem+json') }));
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
        catchIt(new common_1.HttpException({
            statusCode: 400,
            error: 'Bad Request',
            message: ['请输入有效的邮箱地址', '密码长度至少8位'],
        }, 400));
        const body = res.json.mock.calls[0][0];
        expect(body.detail).toBe('请输入有效的邮箱地址；密码长度至少8位');
        expect(body.errors).toEqual(['请输入有效的邮箱地址', '密码长度至少8位']);
        expect(body.message).toBe(body.detail);
    });
    it('V-C 信封对象体（源头改造前兜底）：{success:false,message} → detail=message', () => {
        catchIt(new common_1.HttpException({ success: false, message: '地理编码服务不可用' }, 400));
        const body = res.json.mock.calls[0][0];
        expect(body.status).toBe(400);
        expect(body.detail).toBe('地理编码服务不可用');
    });
    it('V-D 限流对象体：retryAfter → Retry-After 响应头', () => {
        catchIt(new common_1.HttpException({ statusCode: 429, message: '请求过于频繁，请稍后再试', retryAfter: 60 }, 429));
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Retry-After': '60' }));
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
        catchIt(new common_1.NotFoundException('购物车商品不存在'));
        const body = res.json.mock.calls[0][0];
        expect(body).toMatchObject({ status: 404, title: 'NotFound', detail: '购物车商品不存在' });
    });
    it('401 UnauthorizedException → title Unauthorized', () => {
        catchIt(new common_1.UnauthorizedException('JWT令牌缺失'));
        const body = res.json.mock.calls[0][0];
        expect(body.status).toBe(401);
        expect(body.title).toBe('Unauthorized');
    });
});
