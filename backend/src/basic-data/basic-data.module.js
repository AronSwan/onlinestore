"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicDataModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const region_info_entity_1 = require("./infrastructure/entities/region-info.entity");
const region_controller_1 = require("./interfaces/region.controller");
const region_service_1 = require("./application/region.service");
let BasicDataModule = class BasicDataModule {
};
exports.BasicDataModule = BasicDataModule;
exports.BasicDataModule = BasicDataModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([region_info_entity_1.RegionInfoEntity])],
        controllers: [region_controller_1.RegionController],
        providers: [region_service_1.RegionService],
        exports: [region_service_1.RegionService],
    })
], BasicDataModule);
