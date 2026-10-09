import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MonitoringService } from '../monitoring/monitoring.service';
export declare class UsersService {
    private readonly userRepository;
    private readonly monitoring;
    constructor(userRepository: Repository<User>, monitoring: MonitoringService);
    create(createUserDto: CreateUserDto): Promise<User>;
    findById(id: number): Promise<User | null>;
    findOne(id: number): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findAll(options: {
        page: number;
        limit: number;
        search?: string;
    }): Promise<{
        users: User[];
        total: number;
    }>;
    update(id: number, updateUserDto: UpdateUserDto): Promise<User>;
    delete(id: number): Promise<void>;
    remove(id: number): Promise<void>;
    updateLoginInfo(id: number): Promise<void>;
    isEmailExists(email: string): Promise<boolean>;
    isUsernameExists(username: string): Promise<boolean>;
    getStatistics(): Promise<{
        totalUsers: number;
        activeUsers: number;
        newUsersToday: number;
    }>;
    getUserStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
    }>;
    validateUser(email: string, password: string): Promise<User | null>;
}
