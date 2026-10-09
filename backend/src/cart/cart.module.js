"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cart_item_entity_1 = require("./infrastructure/entities/cart-item.entity");
const cart_controller_1 = require("./interfaces/cart.controller");
const cart_application_service_1 = require("./application/cart-application.service");
const cart_domain_service_1 = require("./domain/services/cart-domain.service");
const cart_repository_impl_1 = require("./infrastructure/repositories/cart-repository.impl");
const cart_repository_1 = require("./domain/repositories/cart.repository");
let CartModule = class CartModule {
};
exports.CartModule = CartModule;
exports.CartModule = CartModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([cart_item_entity_1.CartItemEntity])],
        controllers: [cart_controller_1.CartController],
        providers: [
            cart_application_service_1.CartApplicationService,
            cart_domain_service_1.CartDomainService,
            {
                provide: cart_repository_1.CartRepository,
                useClass: cart_repository_impl_1.CartRepositoryImpl,
            },
        ],
        exports: [cart_application_service_1.CartApplicationService],
    })
], CartModule);
