import { AuthService } from './auth.service';
import { AuthProxyService } from './auth-proxy.service';
import { LoginDto, RegisterDto, ChangePasswordDto, RefreshTokenDto, LoginResponseDto, ProfileResponseDto, MessageResponseDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    private readonly authProxyService;
    constructor(authService: AuthService, authProxyService: AuthProxyService);
    register(registerData: RegisterDto): Promise<LoginResponseDto>;
    login(loginData: LoginDto): Promise<LoginResponseDto>;
    refreshToken(refreshData: RefreshTokenDto): Promise<LoginResponseDto>;
    getProfile(req: any): Promise<ProfileResponseDto>;
    changePassword(req: any, changePasswordData: ChangePasswordDto): Promise<MessageResponseDto>;
    logout(req: any): Promise<MessageResponseDto>;
    casdoorLogin(): Promise<{
        url: string;
    }>;
    casdoorCallback(code: string, state: string): Promise<unknown>;
    getCasdoorUserInfo(req: any): Promise<unknown>;
    casdoorLogout(): Promise<{
        url: string;
    }>;
}
