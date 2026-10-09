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
var NotificationConsumer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationConsumer = void 0;
const common_1 = require("@nestjs/common");
const redpanda_service_1 = require("../../messaging/redpanda.service");
const topics_1 = require("../../messaging/topics");
let NotificationConsumer = NotificationConsumer_1 = class NotificationConsumer {
    constructor(redpanda) {
        this.redpanda = redpanda;
        this.logger = new common_1.Logger(NotificationConsumer_1.name);
    }
    async onModuleInit() {
        await this.redpanda.createConsumer('notification-service', [topics_1.Topics.NotificationSend], async (topic, value) => {
            this.logger.log(`Received ${topic} -> ${JSON.stringify(value)}`);
        });
    }
};
exports.NotificationConsumer = NotificationConsumer;
exports.NotificationConsumer = NotificationConsumer = NotificationConsumer_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redpanda_service_1.RedpandaService])
], NotificationConsumer);
