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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogEntity = void 0;
const typeorm_1 = require("typeorm");
let AuditLogEntity = class AuditLogEntity {
};
exports.AuditLogEntity = AuditLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, comment: '用户ID' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, comment: '用户名' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "userName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, comment: '操作名称' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "operation", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, comment: '模块名称' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "module", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10, comment: '请求方法' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, comment: '请求URL' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, comment: '客户端IP' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "ip", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true, comment: '用户代理' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '请求参数' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "requestParams", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '响应数据' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "responseData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', comment: '执行时长(ms)' }),
    __metadata("design:type", Number)
], AuditLogEntity.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, comment: '执行状态：SUCCESS/FAILURE' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '错误信息' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, comment: '链序号（哈希链定位，从 1 连续递增）' }),
    __metadata("design:type", Number)
], AuditLogEntity.prototype, "seq", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64, nullable: true, comment: '链前驱哈希（创世行固定 64 个 0）' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "prevHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64, nullable: true, comment: '链记录哈希（canonical SHA-256，见 common/audit/audit-chain.ts）' }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "recordHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '创建时间' }),
    __metadata("design:type", Date)
], AuditLogEntity.prototype, "createTime", void 0);
exports.AuditLogEntity = AuditLogEntity = __decorate([
    (0, typeorm_1.Entity)('audit_logs'),
    (0, typeorm_1.Index)(['userId', 'createTime']),
    (0, typeorm_1.Index)(['module', 'createTime']),
    (0, typeorm_1.Index)('idx_audit_logs_seq_unique', ['seq'], { unique: true })
], AuditLogEntity);
