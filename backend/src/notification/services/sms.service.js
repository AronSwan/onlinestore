"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
let SmsService = class SmsService {
    async sendSms(phone, content) {
        console.log(`发送短信到 ${phone}: ${content}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    async sendVerificationCode(phone, code) {
        const content = `您的验证码是：${code}，5分钟内有效，请勿泄露给他人。`;
        await this.sendSms(phone, content);
    }
    async sendBulkSms(phones, content) {
        console.log(`批量发送短信给 ${phones.length} 个号码: ${content}`);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = __decorate([
    (0, common_1.Injectable)()
], SmsService);
