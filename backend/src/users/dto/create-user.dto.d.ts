import { UserRole } from '../entities/user.entity';
export declare class CreateUserDto {
    email: string;
    password: string;
    username: string;
    role?: UserRole;
    avatar?: string;
    casdoorId?: string;
    phone?: string;
}
