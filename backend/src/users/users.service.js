"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
const monitoring_service_1 = require("../monitoring/monitoring.service");
let UsersService = class UsersService {
    constructor(userRepository, monitoring) {
        this.userRepository = userRepository;
        this.monitoring = monitoring;
    }
    async create(createUserDto) {
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException();
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
        const user = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
        });
        return await this.userRepository.save(user);
    }
    async findById(id) {
        const startDb = process.hrtime.bigint();
        const result = await this.userRepository.findOne({ where: { id } });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('detail', 'users', Number(endDb - startDb) / 1_000_000_000);
        return result;
    }
    async findOne(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException();
        }
        return user;
    }
    async findByEmail(email) {
        const startDb = process.hrtime.bigint();
        const result = await this.userRepository.findOne({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                username: true,
                role: true,
                isActive: true,
                avatar: true,
                phone: true,
                createdAt: true,
            },
        });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('detail', 'users', Number(endDb - startDb) / 1_000_000_000);
        return result;
    }
    async findByUsername(username) {
        const startDb = process.hrtime.bigint();
        const result = await this.userRepository.findOne({ where: { username } });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('detail', 'users', Number(endDb - startDb) / 1_000_000_000);
        return result;
    }
    async findAll(options) {
        const { page, limit, search } = options;
        const skip = (page - 1) * limit;
        const queryBuilder = this.userRepository.createQueryBuilder('user');
        if (search) {
            queryBuilder.where('user.username LIKE :search OR user.email LIKE :search', {
                search: `%${search}%`,
            });
        }
        const startDb = process.hrtime.bigint();
        const [users, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .orderBy('user.createdAt', 'DESC')
            .getManyAndCount();
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('list', 'users', Number(endDb - startDb) / 1_000_000_000);
        return { users, total };
    }
    async update(id, updateUserDto) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException();
        }
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
        }
        await this.userRepository.update(id, updateUserDto);
        return (await this.findById(id));
    }
    async delete(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException();
        }
        await this.userRepository.delete(id);
    }
    async remove(id) {
        const user = await this.findOne(id);
        await this.userRepository.remove(user);
    }
    async updateLoginInfo(id) {
        await this.userRepository.update(id, {
            lastLoginAt: new Date(),
            loginCount: () => 'login_count + 1',
        });
    }
    async isEmailExists(email) {
        const user = await this.findByEmail(email);
        return !!user;
    }
    async isUsernameExists(username) {
        const user = await this.findByUsername(username);
        return !!user;
    }
    async getStatistics() {
        const startDb = process.hrtime.bigint();
        const totalUsers = await this.userRepository.count();
        const activeUsers = await this.userRepository.count({ where: { isActive: true } });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsersToday = await this.userRepository
            .createQueryBuilder('user')
            .where('user.createdAt >= :today', { today })
            .getCount();
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('aggregation', 'users', Number(endDb - startDb) / 1_000_000_000);
        return {
            totalUsers,
            activeUsers,
            newUsersToday,
        };
    }
    async getUserStats() {
        const totalUsers = await this.userRepository.count();
        const activeUsers = await this.userRepository.count({
            where: { isActive: true },
        });
        return {
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
        };
    }
    async validateUser(email, password) {
        const user = await this.findByEmail(email);
        if (user && (await bcrypt.compare(password, user.password))) {
            return user;
        }
        return null;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        monitoring_service_1.MonitoringService])
], UsersService);
