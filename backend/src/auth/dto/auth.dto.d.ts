export declare class LoginDto {
    email: string;
    password: string;
    captcha_token?: string;
}
export declare class RegisterDto {
    email: string;
    password: string;
    username: string;
    captcha_token?: string;
}
export declare class ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}
export declare class RefreshTokenDto {
    refresh_token: string;
}
export declare class LoginResponseDto {
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
export declare class ProfileResponseDto {
    user: {
        id: number;
        sub: number;
        email: string;
        username: string;
        role: string;
    };
}
export declare class MessageResponseDto {
    message: string;
}
