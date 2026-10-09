"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const config_1 = require("@nestjs/config");
const address_controller_1 = require("./address.controller");
const address_service_1 = require("./address.service");
const nominatim_service_1 = require("./services/nominatim.service");
const address_formatting_service_1 = require("./services/address-formatting.service");
const address_validation_service_1 = require("./services/address-validation.service");
const address_cache_service_1 = require("./services/address-cache.service");
const address_queue_service_1 = require("./services/address-queue.service");
const address_processor_1 = require("./processors/address.processor");
const address_entity_1 = require("./entities/address.entity");
const address_config_1 = __importDefault(require("./config/address.config"));
let AddressModule = class AddressModule {
};
exports.AddressModule = AddressModule;
exports.AddressModule = AddressModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forFeature(address_config_1.default),
            typeorm_1.TypeOrmModule.forFeature([address_entity_1.Address]),
            bull_1.BullModule.registerQueue({
                name: 'address-geocoding',
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            }),
        ],
        controllers: [address_controller_1.AddressController],
        providers: [
            address_service_1.AddressService,
            nominatim_service_1.NominatimService,
            address_formatting_service_1.AddressFormattingService,
            address_validation_service_1.AddressValidationService,
            address_cache_service_1.AddressCacheService,
            address_queue_service_1.AddressQueueService,
            address_processor_1.AddressProcessor,
        ],
        exports: [
            address_service_1.AddressService,
            address_validation_service_1.AddressValidationService,
            nominatim_service_1.NominatimService,
            address_cache_service_1.AddressCacheService,
            address_queue_service_1.AddressQueueService,
        ],
    })
], AddressModule);
