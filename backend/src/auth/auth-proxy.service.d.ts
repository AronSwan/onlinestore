import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
export interface CasdoorUser {
    id: string;
    name: string;
    displayName?: string;
    email: string;
    phone?: string;
    avatar?: string;
    isAdmin?: boolean;
}
export declare class AuthProxyService {
    private readonly httpService;
    private readonly jwtService;
    private readonly usersService;
    private readonly config;
    constructor(httpService: HttpService, jwtService: JwtService, usersService: UsersService);
    private get casdoorConfig();
    private get appBaseUrl();
    exchangeCodeForToken(code: string): Promise<unknown>;
    validateCasdoorToken(token: string): Promise<unknown>;
    private ensureUserExists;
    refreshCasdoorToken(refreshToken: string): Promise<unknown>;
    generateSystemToken(user: User): string;
    casdoorLogout(token: string): Promise<void>;
    getCasdoorLoginUrl(): Promise<string>;
    handleCasdoorCallback(code: string, state: string): Promise<unknown>;
    getCasdoorUserInfo(email: string): Promise<unknown>;
    getCasdoorLogoutUrl(): Promise<string>;
}
