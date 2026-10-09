export declare const PASSWORD_REGEX: RegExp;
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    MODERATOR = "moderator"
}
export declare class UpdateUserDto {
    username?: string;
    password?: string;
    email?: string;
    avatar?: string;
    phone?: string;
    role?: UserRole;
    status?: 'active' | 'inactive' | 'suspended';
    isActive?: boolean;
    description?: string;
    casdoorId?: string;
    lastLoginIp?: string;
    lastLoginAt?: string;
    preferences?: {
        language?: string;
        theme?: string;
        notifications?: {
            email?: boolean;
            push?: boolean;
            sms?: boolean;
        };
    };
}
export declare class UpdatePasswordDto {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}
export declare class RegisterUserDto {
    username: string;
    password: string;
    email: string;
    phone?: string;
    role?: UserRole;
}
export declare class LoginUserDto {
    identifier: string;
    password: string;
    rememberMe?: boolean;
}
export declare class UserUpdateResponseDto {
    id: string;
    username: string;
    email: string;
    phone?: string;
    role: UserRole;
    status: 'active' | 'inactive' | 'suspended';
    isActive: boolean;
    avatar?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
    lastLoginIp?: string;
    preferences?: {
        language?: string;
        theme?: string;
        notifications?: {
            email?: boolean;
            push?: boolean;
            sms?: boolean;
        };
    };
}
