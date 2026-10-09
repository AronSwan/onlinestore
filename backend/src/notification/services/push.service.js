"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
let PushService = class PushService {
    async sendPush(userId, title, content, data) {
        console.log(`发送推送给用户 ${userId}: ${title}`);
        console.log(`内容: ${content}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    async sendPushToUsers(userIds, title, content, data) {
        console.log(`批量推送给 ${userIds.length} 个用户: ${title}`);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    async sendPushToAll(title, content, data) {
        console.log(`全员推送: ${title}`);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
};
exports.PushService = PushService;
exports.PushService = PushService = __decorate([
    (0, common_1.Injectable)()
], PushService);
