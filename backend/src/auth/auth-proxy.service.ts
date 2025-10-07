// 用途：认证代理服务，将所有认证请求转发给Casdoor认证平台
// 依赖文件：unified-master.config.ts, http.module, users.service.ts
// 作者：后端开发团队
// 时间：2025-06-17 12:35:00

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { createMasterConfiguration } from '../config/unified-master.config';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthProxyService {
  private readonly config;

  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {
    this.config = createMasterConfiguration();
  }

  /**
   * 配置Casdoor认证参数
   */
  private get casdoorConfig() {
    return {
      serverUrl: 'https://door.casdoor.com', // 默认值，因为新配置系统中没有casdoor配置
      clientId: 'reich-shopping-site',
      clientSecret: '',
      organizationName: 'built-in',
      applicationName: 'reich-app',
    };
  }

  /**
   * 获取应用基础URL
   */
  private get appBaseUrl() {
    const protocol = this.config.app.env === 'production' ? 'https' : 'http';
    const host = this.config.app.env === 'production' ? 'example.com' : 'localhost';
    const port = this.config.app.env === 'production' ? '' : `:${this.config.app.port}`;
    return `${protocol}://${host}${port}`;
  }

  /**
   * 交换授权码获取Casdoor令牌
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    const { serverUrl, clientId, clientSecret, organizationName, applicationName } =
      this.casdoorConfig;

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
        throw new UnauthorizedException('获取Casdoor令牌失败');
      }

      return response.data;
    } catch (error) {
      console.error('Casdoor令牌交换失败:', error);
      throw new UnauthorizedException('认证服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 验证Casdoor令牌并获取用户信息
   */
  async validateCasdoorToken(token: string): Promise<any> {
    try {
      // 调用Casdoor API验证令牌并获取用户信息
      const userInfo = await this.httpService
        .get(`${this.casdoorConfig.serverUrl}/api/get-userinfo`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .toPromise();

      if (!userInfo || !userInfo.data) {
        throw new UnauthorizedException('Casdoor用户信息获取失败');
      }

      // 确保系统中存在该用户
      await this.ensureUserExists(userInfo.data);

      return userInfo.data;
    } catch (error) {
      console.error('Casdoor令牌验证失败:', error);
      throw new UnauthorizedException('无效的认证令牌');
    }
  }

  /**
   * 确保系统中存在该用户，如果不存在则创建
   */
  private async ensureUserExists(casdoorUser: any): Promise<User> {
    // 检查用户是否已存在
    let user = await this.usersService.findByEmail(casdoorUser.email);

    if (!user) {
      // 创建新用户
      user = await this.usersService.create({
        email: casdoorUser.email,
        username: casdoorUser.name || casdoorUser.email.split('@')[0],
        password: 'casdoor_auth_' + Math.random().toString(36).substr(2), // 随机密码，不实际使用
        role: casdoorUser.role || 'user',
        avatar: casdoorUser.avatar,
        casdoorId: casdoorUser.id,
      });
    } else if (
      JSON.stringify(user.avatar) !== JSON.stringify(casdoorUser.avatar) ||
      user.username !== casdoorUser.name
    ) {
      // 更新用户信息
      user = await this.usersService.update(user.id, {
        username: casdoorUser.name || user.username,
        avatar: casdoorUser.avatar,
        casdoorId: casdoorUser.id,
      });
    }

    return user;
  }

  /**
   * 刷新Casdoor令牌
   */
  async refreshCasdoorToken(refreshToken: string): Promise<any> {
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
        throw new UnauthorizedException('刷新Casdoor令牌失败');
      }

      return response.data;
    } catch (error) {
      console.error('Casdoor令牌刷新失败:', error);
      throw new UnauthorizedException('认证令牌已过期，请重新登录');
    }
  }

  /**
   * 生成系统内部JWT令牌
   */
  generateSystemToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      casdoor_auth: true, // 标记为Casdoor认证
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 登出Casdoor用户
   */
  async casdoorLogout(token: string): Promise<void> {
    try {
      await this.httpService
        .post(
          `${this.casdoorConfig.serverUrl}/api/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        )
        .toPromise();
    } catch (error) {
      console.warn('Casdoor登出失败，但继续处理本地登出:', error);
      // 即使Casdoor登出失败，也继续处理本地登出
    }
  }

  /**
   * 获取Casdoor登录URL
   */
  async getCasdoorLoginUrl(): Promise<string> {
    const { serverUrl, clientId, organizationName, applicationName } = this.casdoorConfig;
    const redirectUri = `${this.appBaseUrl}/auth/casdoor/callback`;
    const state = Math.random().toString(36).substr(2); // 简单的CSRF保护

    return `${serverUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read&state=${state}&organization_name=${organizationName}&application_name=${applicationName}`;
  }

  /**
   * 处理Casdoor登录回调
   */
  async handleCasdoorCallback(code: string, state: string): Promise<any> {
    if (!code) {
      throw new UnauthorizedException('认证失败，缺少授权码');
    }

    try {
      // 交换授权码获取Casdoor令牌
      const casdoorToken = await this.exchangeCodeForToken(code);

      if (!casdoorToken.access_token) {
        throw new UnauthorizedException('认证失败，无法获取访问令牌');
      }

      // 验证令牌并获取用户信息
      const casdoorUser = await this.validateCasdoorToken(casdoorToken.access_token);

      // 获取系统用户
      const user = await this.usersService.findByEmail(casdoorUser.email);

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 生成系统内部JWT令牌
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
    } catch (error) {
      console.error('Casdoor回调处理失败:', error);
      throw new UnauthorizedException('认证失败，请重试');
    }
  }

  /**
   * 获取Casdoor用户信息
   */
  async getCasdoorUserInfo(email: string): Promise<any> {
    try {
      // 查找用户
      const user = await this.usersService.findByEmail(email);

      if (!user || !user.casdoorId) {
        throw new UnauthorizedException('用户未通过Casdoor认证');
      }

      // 调用Casdoor API获取用户详细信息
      const { serverUrl, clientId, clientSecret } = this.casdoorConfig;

      const response = await this.httpService
        .get(`${serverUrl}/api/get-user?id=${user.casdoorId}`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        })
        .toPromise();

      if (!response || !response.data || !response.data.data) {
        throw new UnauthorizedException('获取Casdoor用户信息失败');
      }

      return response.data.data;
    } catch (error) {
      console.error('获取Casdoor用户信息失败:', error);
      throw new UnauthorizedException('获取用户信息失败');
    }
  }

  /**
   * 获取Casdoor登出URL
   */
  async getCasdoorLogoutUrl(): Promise<string> {
    const { serverUrl } = this.casdoorConfig;
    const redirectUri = `${this.appBaseUrl}`;

    return `${serverUrl}/logout?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
}
