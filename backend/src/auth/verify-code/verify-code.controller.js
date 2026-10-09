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
exports.VerifyCodeController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const api_docs_decorator_1 = require("../../common/decorators/api-docs.decorator");
const verify_code_service_1 = require("./verify-code.service");
class VerifyCodeSendDto {
}
__decorate([
    (0, class_validator_1.IsIn)(['login', 'register']),
    __metadata("design:type", String)
], VerifyCodeSendDto.prototype, "sendType", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], VerifyCodeSendDto.prototype, "mail", void 0);
let VerifyCodeController = class VerifyCodeController {
    constructor(service) {
        this.service = service;
    }
    async send(body) {
        await this.service.sendLoginMailCode(body.mail);
    }
};
exports.VerifyCodeController = VerifyCodeController;
__decorate([
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '创建资源'),
    (0, common_1.Post)('send'),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyCodeSendDto]),
    __metadata("design:returntype", Promise)
], VerifyCodeController.prototype, "send", null);
exports.VerifyCodeController = VerifyCodeController = __decorate([
    (0, swagger_1.ApiTags)('验证码'),
    (0, common_1.Controller)('customer-user/verify-code'),
    __metadata("design:paramtypes", [verify_code_service_1.VerifyCodeService])
], VerifyCodeController);
