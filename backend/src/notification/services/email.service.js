"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
let EmailService = class EmailService {
    async sendEmail(to, subject, content) {
        console.log(`发送邮件到 ${to}: ${subject}`);
        console.log(`内容: ${content}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    async sendHtmlEmail(to, subject, htmlContent) {
        console.log(`发送HTML邮件到 ${to}: ${subject}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    async sendBulkEmail(recipients, subject, content) {
        console.log(`批量发送邮件给 ${recipients.length} 个收件人: ${subject}`);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)()
], EmailService);
