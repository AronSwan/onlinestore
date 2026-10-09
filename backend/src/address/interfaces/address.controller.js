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
exports.AddressController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_docs_decorator_1 = require("../../common/decorators/api-docs.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const address_service_1 = require("../application/address.service");
const receive_address_dto_1 = require("../application/dto/receive-address.dto");
let AddressController = class AddressController {
    constructor(service) {
        this.service = service;
    }
    async list(customerUserId) {
        return this.service.listByUserId(customerUserId);
    }
    async save(body) {
        await this.service.save(body);
    }
    async update(body) {
        await this.service.update(body);
    }
    async remove(customerUserId, receiveAddressId) {
        await this.service.remove(customerUserId, receiveAddressId);
    }
    async setDefault(receiveAddressId, userId) {
        await this.service.setDefault(userId, receiveAddressId);
    }
};
exports.AddressController = AddressController;
__decorate([
    (0, api_docs_decorator_1.ApiGetResource)(Object, '获取用户收货地址列表'),
    (0, common_1.Get)('receive-address/:customerUserId'),
    __param(0, (0, common_1.Param)('customerUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "list", null);
__decorate([
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '新增用户收货地址'),
    (0, common_1.Post)('receive-address'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [receive_address_dto_1.ReceiveAddressSaveCommand]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "save", null);
__decorate([
    (0, api_docs_decorator_1.ApiUpdateResource)(Object, Object, '修改用户收货地址'),
    (0, common_1.Put)('receive-address'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [receive_address_dto_1.ReceiveAddressUpdateCommand]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "update", null);
__decorate([
    (0, api_docs_decorator_1.ApiDeleteResource)('删除用户收货地址'),
    (0, common_1.Delete)(':customerUserId/receive-address/:receiveAddressId'),
    __param(0, (0, common_1.Param)('customerUserId')),
    __param(1, (0, common_1.Param)('receiveAddressId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "remove", null);
__decorate([
    (0, api_docs_decorator_1.ApiUpdateResource)(Object, Object, '设置默认地址'),
    (0, common_1.Put)('receive-address/:receiveAddressId/default'),
    __param(0, (0, common_1.Param)('receiveAddressId')),
    __param(1, (0, common_1.Body)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "setDefault", null);
exports.AddressController = AddressController = __decorate([
    (0, swagger_1.ApiTags)('收货地址'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/customer-user'),
    __metadata("design:paramtypes", [address_service_1.AddressService])
], AddressController);
