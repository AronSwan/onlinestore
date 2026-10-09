import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { UserDeletionService } from './user-deletion.service';
export interface UserResponseDto {
    id: number;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
    avatar?: string;
    phone?: string;
    createdAt: string;
    updatedAt: string;
}
export interface UserListResponseDto {
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class UsersController {
    private readonly usersService;
    private readonly userDeletion;
    constructor(usersService: UsersService, userDeletion: UserDeletionService);
    createUser(createUserDto: CreateUserDto): Promise<UserResponseDto>;
    create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
    getProfile(req: Record<string, any>): {
        user: any;
    };
    getUserById(id: string): Promise<UserResponseDto>;
    updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto>;
    update(id: string | number, updateUserDto: UpdateUserDto): Promise<UserResponseDto>;
    deleteMe(req: Record<string, any>): Promise<{
        message: string;
    }>;
    deleteUser(id: string): Promise<void>;
    searchUsers(searchTerm?: string, page?: number, limit?: number): Promise<UserListResponseDto>;
    activateUser(id: string): Promise<UserResponseDto>;
    deactivateUser(id: string): Promise<UserResponseDto>;
    verifyUserEmail(id: string): Promise<UserResponseDto>;
    getUserStats(): Promise<any>;
    getUserStatsCount(): Promise<any>;
    getStats(): Promise<any>;
}
