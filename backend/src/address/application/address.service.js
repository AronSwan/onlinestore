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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const receive_address_entity_1 = require("../infrastructure/entities/receive-address.entity");
let AddressService = class AddressService {
    constructor(repo, dataSource) {
        this.repo = repo;
        this.dataSource = dataSource;
    }
    async listByUserId(userId) {
        const rows = await this.repo.find({
            where: { userId },
            order: { isDefault: 'DESC', createdAt: 'DESC' },
        });
        return rows;
    }
    async save(cmd) {
        await this.dataSource.transaction(async (manager) => {
            if (cmd.isDefault) {
                await manager.update(receive_address_entity_1.ReceiveAddressEntity, { userId: cmd.userId, isDefault: true }, { isDefault: false });
            }
            const entity = manager.create(receive_address_entity_1.ReceiveAddressEntity, { ...cmd });
            await manager.save(entity);
        });
    }
    async update(cmd) {
        await this.dataSource.transaction(async (manager) => {
            const existed = await manager.findOne(receive_address_entity_1.ReceiveAddressEntity, {
                where: { id: cmd.id, userId: cmd.userId },
            });
            if (!existed)
                throw new common_1.NotFoundException('Address not found');
            if (cmd.isDefault) {
                await manager.update(receive_address_entity_1.ReceiveAddressEntity, { userId: cmd.userId, isDefault: true }, { isDefault: false });
            }
            await manager.update(receive_address_entity_1.ReceiveAddressEntity, { id: cmd.id }, { ...cmd });
        });
    }
    async remove(userId, addressId) {
        await this.repo.delete({ id: addressId, userId });
    }
    async setDefault(userId, addressId) {
        await this.dataSource.transaction(async (manager) => {
            await manager.update(receive_address_entity_1.ReceiveAddressEntity, { userId, isDefault: true }, { isDefault: false });
            const found = await manager.findOne(receive_address_entity_1.ReceiveAddressEntity, {
                where: { id: addressId, userId },
            });
            if (!found)
                throw new common_1.NotFoundException('Address not found');
            await manager.update(receive_address_entity_1.ReceiveAddressEntity, { id: addressId }, { isDefault: true });
        });
    }
};
exports.AddressService = AddressService;
exports.AddressService = AddressService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(receive_address_entity_1.ReceiveAddressEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], AddressService);
