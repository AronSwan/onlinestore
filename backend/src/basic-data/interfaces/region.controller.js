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
exports.RegionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_docs_decorator_1 = require("../../common/decorators/api-docs.decorator");
const region_service_1 = require("../application/region.service");
let RegionController = class RegionController {
    constructor(service) {
        this.service = service;
    }
    listAll() {
        return this.service.listAll();
    }
    listByLevel(level) {
        return this.service.listByLevel(Number(level));
    }
    listByCode(code) {
        return this.service.listByCode(code);
    }
    listByParent(parent) {
        return this.service.listByParent(parent);
    }
};
exports.RegionController = RegionController;
__decorate([
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    (0, common_1.Get)('all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RegionController.prototype, "listAll", null);
__decorate([
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    (0, common_1.Get)('list/level/:level'),
    __param(0, (0, common_1.Param)('level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RegionController.prototype, "listByLevel", null);
__decorate([
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    (0, common_1.Get)('list/code/:code'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RegionController.prototype, "listByCode", null);
__decorate([
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    (0, common_1.Get)('list/parent/:parent'),
    __param(0, (0, common_1.Param)('parent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RegionController.prototype, "listByParent", null);
exports.RegionController = RegionController = __decorate([
    (0, swagger_1.ApiTags)('行政区划'),
    (0, common_1.Controller)('basic-data/region'),
    __metadata("design:paramtypes", [region_service_1.RegionService])
], RegionController);
