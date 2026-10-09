import { Order } from '../../orders/entities/order.entity';
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    MODERATOR = "moderator"
}
export declare class User {
    id: number;
    email: string;
    password: string;
    username: string;
    role: UserRole;
    isActive: boolean;
    avatar: string;
    phone: string;
    casdoorId: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date;
    loginCount: number;
    orders: Order[];
    userRoles?: any[];
}
