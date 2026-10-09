"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const api_docs_decorator_1 = require("../common/decorators/api-docs.decorator");
const passport_1 = require("@nestjs/passport");
const auth_service_1 = require("./auth.service");
const auth_proxy_service_1 = require("./auth-proxy.service");
const auth_dto_1 = require("./dto/auth.dto");
let AuthController = class AuthController {
    constructor(authService, authProxyService) {
        this.authService = authService;
        this.authProxyService = authProxyService;
    }
    async register(registerData) {
        return this.authService.register(registerData);
    }
    async login(loginData) {
        return this.authService.login(loginData);
    }
    async refreshToken(refreshData) {
        return this.authService.refreshToken(refreshData.refresh_token);
    }
    async getProfile(req) {
        return {
            user: req.user,
        };
    }
    async changePassword(req, changePasswordData) {
        await this.authService.changePassword({
            userId: req.user.sub,
            oldPassword: changePasswordData.oldPassword,
            newPassword: changePasswordData.newPassword,
        });
        return { message: '密码修改成功' };
    }
    async logout(req) {
        return { message: '登出成功' };
    }
    async casdoorLogin() {
        const loginUrl = await this.authProxyService.getCasdoorLoginUrl();
        return { url: loginUrl };
    }
    async casdoorCallback(code, state) {
        return this.authProxyService.handleCasdoorCallback(code, state);
    }
    async getCasdoorUserInfo(req) {
        return this.authProxyService.getCasdoorUserInfo(req.user.email);
    }
    async casdoorLogout() {
        const logoutUrl = await this.authProxyService.getCasdoorLogoutUrl();
        return { url: logoutUrl };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '用户注册'),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '用户登录'),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '刷新令牌'),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: '获取用户信息' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '成功获取用户信息', type: auth_dto_1.ProfileResponseDto }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '修改密码'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, auth_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '用户登出'),
    (0, swagger_1.ApiOperation)({ summary: '用户登出' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: '登出成功', type: auth_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('casdoor/login'),
    (0, common_1.Redirect)(),
    (0, api_docs_decorator_1.ApiGetResource)(Object, '重定向到Casdoor登录'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "casdoorLogin", null);
__decorate([
    (0, common_1.Get)('casdoor/callback'),
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'Casdoor登录回调'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "casdoorCallback", null);
__decorate([
    (0, common_1.Get)('casdoor/userinfo'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, api_docs_decorator_1.ApiGetResource)(Object, '获取Casdoor用户信息'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getCasdoorUserInfo", null);
__decorate([
    (0, common_1.Post)('casdoor/logout'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Redirect)(),
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, 'Casdoor登出'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "casdoorLogout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('认证'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        auth_proxy_service_1.AuthProxyService])
], AuthController);
