"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const core_1 = require("@nestjs/core");
const monitoring_service_1 = require("./monitoring.service");
const metrics_service_1 = require("./metrics.service");
const monitoring_controller_1 = require("./monitoring.controller");
const metrics_interceptor_1 = require("./metrics.interceptor");
let MonitoringModule = class MonitoringModule {
};
exports.MonitoringModule = MonitoringModule;
exports.MonitoringModule = MonitoringModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([monitoring_service_1.Metric]), schedule_1.ScheduleModule.forRoot()],
        controllers: [monitoring_controller_1.MonitoringController],
        providers: [
            monitoring_service_1.MonitoringService,
            metrics_service_1.MetricsService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: metrics_interceptor_1.MetricsInterceptor,
            },
        ],
        exports: [monitoring_service_1.MonitoringService, metrics_service_1.MetricsService],
    })
], MonitoringModule);
