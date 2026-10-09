"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserDeletionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDeletionService = exports.ANONYMIZED_USERNAME = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
exports.ANONYMIZED_USERNAME = '[已注销]';
let UserDeletionService = UserDeletionService_1 = class UserDeletionService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(UserDeletionService_1.name);
    }
    async deleteMeCascade(userId) {
        if (!Number.isInteger(userId) || userId <= 0) {
            throw new common_1.NotFoundException('用户不存在');
        }
        const uid = String(userId);
        await this.dataSource.transaction(async (em) => {
            const rows = await em.query('SELECT id FROM users WHERE id = ?', [userId]);
            if (!rows || rows.length === 0) {
                throw new common_1.NotFoundException('用户不存在');
            }
            await em.query('DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE user_id = ?)', [userId]);
            await em.query('DELETE FROM orders WHERE user_id = ?', [userId]);
            await em.query('DELETE FROM cart_items WHERE customer_user_id = ?', [uid]);
            await em.query('DELETE FROM user_addresses WHERE user_id = ?', [userId]);
            await em.query('DELETE FROM customer_profiles WHERE user_id = ?', [userId]);
            await em.query('DELETE FROM users_session WHERE userId = ?', [uid]);
            await em.query('UPDATE audit_logs SET userName = ? WHERE userId = ?', [
                exports.ANONYMIZED_USERNAME,
                uid,
            ]);
            await em.query('DELETE FROM users WHERE id = ?', [userId]);
        });
        setTimeout(() => {
            void this.anonymizeAuditTrail(uid);
        }, 3000);
    }
    async anonymizeAuditTrail(uid) {
        try {
            await this.dataSource.query('UPDATE audit_logs SET userName = ? WHERE userId = ?', [exports.ANONYMIZED_USERNAME, uid]);
        }
        catch (error) {
            this.logger.warn(`注销后审计脱敏补跑失败（userId=${uid}）：${String(error)}`);
        }
    }
};
exports.UserDeletionService = UserDeletionService;
exports.UserDeletionService = UserDeletionService = UserDeletionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], UserDeletionService);
