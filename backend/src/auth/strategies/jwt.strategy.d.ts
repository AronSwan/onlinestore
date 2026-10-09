import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
export interface JwtPayload {
    sub: number;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
    jti?: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    private readonly configService;
    constructor(usersService: UsersService, configService: ConfigService);
    validate(payload: JwtPayload): Promise<{
        sub: number;
        email: string;
        role: import("../../users/entities/user.entity").UserRole;
    }>;
    private isValidPayload;
    private isValidEmail;
    private isValidRole;
    private validateJwtSecretStrength;
    private isValidRsaKey;
}
export {};
