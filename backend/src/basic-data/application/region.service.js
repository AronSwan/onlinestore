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
exports.RegionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const region_info_entity_1 = require("../infrastructure/entities/region-info.entity");
let RegionService = class RegionService {
    constructor(repo) {
        this.repo = repo;
    }
    listAll() {
        return this.repo.find({ order: { sort: 'ASC' } });
    }
    listByLevel(level) {
        return this.repo.find({ where: { level }, order: { sort: 'ASC' } });
    }
    listByCode(code) {
        return this.repo.find({ where: { code }, order: { sort: 'ASC' } });
    }
    listByParent(parent) {
        return this.repo.find({ where: { parent }, order: { sort: 'ASC' } });
    }
};
exports.RegionService = RegionService;
exports.RegionService = RegionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(region_info_entity_1.RegionInfoEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RegionService);
