"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const monitoring_module_1 = require("../monitoring/monitoring.module");
const config_1 = require("@nestjs/config");
const redpanda_service_1 = require("./redpanda.service");
const product_events_service_1 = require("./product-events.service");
const order_events_service_1 = require("./order-events.service");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, (0, common_1.forwardRef)(() => monitoring_module_1.MonitoringModule)],
        providers: [redpanda_service_1.RedpandaService, product_events_service_1.ProductEventsService, order_events_service_1.OrderEventsService],
        exports: [redpanda_service_1.RedpandaService, product_events_service_1.ProductEventsService, order_events_service_1.OrderEventsService],
    })
], MessagingModule);
