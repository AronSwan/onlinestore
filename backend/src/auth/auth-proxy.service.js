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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProxyService = void 0;
const user_entity_1 = require("../users/entities/user.entity");
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const jwt_1 = require("@nestjs/jwt");
const unified_master_config_1 = require("../config/unified-master.config");
const users_service_1 = require("../users/users.service");
let AuthProxyService = class AuthProxyService {
    constructor(httpService, jwtService, usersService) {
        this.httpService = httpService;
        this.jwtService = jwtService;
        this.usersService = usersService;
        this.config = (0, unified_master_config_1.createMasterConfiguration)();
    }
    get casdoorConfig() {
        return {
            serverUrl: 'https://door.casdoor.com',
            clientId: 'reich-shopping-site',
            clientSecret: '',
            organizationName: 'built-in',
            applicationName: 'reich-app',
        };
    }
    get appBaseUrl() {
        const protocol = this.config.app.env === 'production' ? 'https' : 'http';
        const host = this.config.app.env === 'production' ? 'example.com' : 'localhost';
        const port = this.config.app.env === 'production' ? '' : `:${this.config.app.port}`;
        return `${protocol}://${host}${port}`;
    }
    async exchangeCodeForToken(code) {
        const { serverUrl, clientId, clientSecret, organizationName, applicationName } = this.casdoorConfig;
        try {
            const redirectUri = `${this.appBaseUrl}/auth/casdoor/callback`;
            const response = await this.httpService
                .post(`${serverUrl}/api/login/oauth/access_token`, {
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
            })
                .toPromise();
            if (!response || !response.data) {
                throw new common_1.UnauthorizedException('获取Casdoor令牌失败');
            }
            return response.data;
        }
        catch (error) {
            console.error('Casdoor令牌交换失败:', error);
            throw new common_1.UnauthorizedException('认证服务暂时不可用，请稍后重试');
        }
    }
    async validateCasdoorToken(token) {
        try {
            const userInfo = await this.httpService
                .get(`${this.casdoorConfig.serverUrl}/api/get-userinfo`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .toPromise();
            if (!userInfo || !userInfo.data) {
                throw new common_1.UnauthorizedException('Casdoor用户信息获取失败');
            }
            await this.ensureUserExists(userInfo.data);
            return userInfo.data;
        }
        catch (error) {
            console.error('Casdoor令牌验证失败:', error);
            throw new common_1.UnauthorizedException('无效的认证令牌');
        }
    }
    async ensureUserExists(casdoorUser) {
        let user = await this.usersService.findByEmail(casdoorUser.email);
        if (!user) {
            user = await this.usersService.create({
                email: casdoorUser.email,
                username: casdoorUser.name || casdoorUser.email.split('@')[0],
                password: 'casdoor_auth_' + Math.random().toString(36).substr(2),
                role: user_entity_1.UserRole.USER,
                avatar: casdoorUser.avatar,
                casdoorId: casdoorUser.id,
            });
        }
        else if (JSON.stringify(user.avatar) !== JSON.stringify(casdoorUser.avatar) ||
            user.username !== casdoorUser.name) {
            user = await this.usersService.update(user.id, {
                username: casdoorUser.name || user.username,
                avatar: casdoorUser.avatar,
                casdoorId: casdoorUser.id,
            });
        }
        return user;
    }
    async refreshCasdoorToken(refreshToken) {
        const { serverUrl, clientId, clientSecret } = this.casdoorConfig;
        try {
            const response = await this.httpService
                .post(`${serverUrl}/api/login/oauth/refresh_token`, {
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
            })
                .toPromise();
            if (!response || !response.data) {
                throw new common_1.UnauthorizedException('刷新Casdoor令牌失败');
            }
            return response.data;
        }
        catch (error) {
            console.error('Casdoor令牌刷新失败:', error);
            throw new common_1.UnauthorizedException('认证令牌已过期，请重新登录');
        }
    }
    generateSystemToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            casdoor_auth: true,
        };
        return this.jwtService.sign(payload);
    }
    async casdoorLogout(token) {
        try {
            await this.httpService
                .post(`${this.casdoorConfig.serverUrl}/api/logout`, {}, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            })
                .toPromise();
        }
        catch (error) {
            console.warn('Casdoor登出失败，但继续处理本地登出:', error);
        }
    }
    async getCasdoorLoginUrl() {
        const { serverUrl, clientId, organizationName, applicationName } = this.casdoorConfig;
        const redirectUri = `${this.appBaseUrl}/auth/casdoor/callback`;
        const state = Math.random().toString(36).substr(2);
        return `${serverUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read&state=${state}&organization_name=${organizationName}&application_name=${applicationName}`;
    }
    async handleCasdoorCallback(code, state) {
        if (!code) {
            throw new common_1.UnauthorizedException('认证失败，缺少授权码');
        }
        try {
            const casdoorToken = (await this.exchangeCodeForToken(code));
            if (!casdoorToken.access_token) {
                throw new common_1.UnauthorizedException('认证失败，无法获取访问令牌');
            }
            const casdoorUser = (await this.validateCasdoorToken(casdoorToken.access_token));
            const user = await this.usersService.findByEmail(casdoorUser.email);
            if (!user) {
                throw new common_1.UnauthorizedException('用户不存在');
            }
            const systemToken = this.generateSystemToken(user);
            return {
                access_token: systemToken,
                refresh_token: casdoorToken.refresh_token,
                token_type: 'bearer',
                expires_in: casdoorToken.expires_in,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    avatar: user.avatar,
                },
                casdoor_user: casdoorUser,
            };
        }
        catch (error) {
            console.error('Casdoor回调处理失败:', error);
            throw new common_1.UnauthorizedException('认证失败，请重试');
        }
    }
    async getCasdoorUserInfo(email) {
        try {
            const user = await this.usersService.findByEmail(email);
            if (!user || !user.casdoorId) {
                throw new common_1.UnauthorizedException('用户未通过Casdoor认证');
            }
            const { serverUrl, clientId, clientSecret } = this.casdoorConfig;
            const response = await this.httpService
                .get(`${serverUrl}/api/get-user?id=${user.casdoorId}`, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                },
            })
                .toPromise();
            if (!response || !response.data || !response.data.data) {
                throw new common_1.UnauthorizedException('获取Casdoor用户信息失败');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('获取Casdoor用户信息失败:', error);
            throw new common_1.UnauthorizedException('获取用户信息失败');
        }
    }
    async getCasdoorLogoutUrl() {
        const { serverUrl } = this.casdoorConfig;
        const redirectUri = `${this.appBaseUrl}`;
        return `${serverUrl}/logout?redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
};
exports.AuthProxyService = AuthProxyService;
exports.AuthProxyService = AuthProxyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        jwt_1.JwtService,
        users_service_1.UsersService])
], AuthProxyService);
