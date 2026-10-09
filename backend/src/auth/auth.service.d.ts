import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RedisHealthService } from '../redis/redis-health.service';
import { CaptchaService } from './captcha.service';
export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: {
        id: number;
        email: string;
        username: string;
        role: string;
    };
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly userRepository;
    private readonly redisHealth;
    private readonly captchaService;
    private readonly config;
    constructor(usersService: UsersService, jwtService: JwtService, userRepository: Repository<User>, redisHealth: RedisHealthService, captchaService: CaptchaService);
    register(registerData: {
        email: string;
        password: string;
        username: string;
        captcha_token?: string;
    }): Promise<LoginResponse>;
    login(loginData: {
        email: string;
        password: string;
        captcha_token?: string;
    }): Promise<LoginResponse>;
    refreshToken(refreshToken: string): Promise<LoginResponse>;
    private generateTokens;
    validateToken(token: string): Promise<any>;
    changePassword(changePasswordData: {
        userId: number;
        oldPassword: string;
        newPassword: string;
    }): Promise<void>;
}
