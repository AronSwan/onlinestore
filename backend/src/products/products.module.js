"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const typeorm_1 = require("@nestjs/typeorm");
const monitoring_module_1 = require("../monitoring/monitoring.module");
const search_module_1 = require("./search/search.module");
const messaging_module_1 = require("../messaging/messaging.module");
const products_service_1 = require("./products.service");
const products_controller_1 = require("./products.controller");
const product_entity_1 = require("./entities/product.entity");
const category_entity_1 = require("./entities/category.entity");
const product_image_entity_1 = require("./entities/product-image.entity");
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([product_entity_1.Product, category_entity_1.Category, product_image_entity_1.ProductImage]),
            cache_manager_1.CacheModule.register(),
            monitoring_module_1.MonitoringModule,
            (0, common_1.forwardRef)(() => messaging_module_1.MessagingModule),
            (0, common_1.forwardRef)(() => search_module_1.SearchModule),
        ],
        controllers: [products_controller_1.ProductsController],
        providers: [products_service_1.ProductsService],
        exports: [products_service_1.ProductsService, search_module_1.SearchModule],
    })
], ProductsModule);
