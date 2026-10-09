"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyCodeService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const memoryStore = new Map();
let VerifyCodeService = class VerifyCodeService {
    constructor() {
        this.ttlMs = 5 * 60 * 1000;
    }
    async sendLoginMailCode(mail) {
        const code = String((0, crypto_1.randomInt)(100000, 999999));
        const key = `login:mail:${mail}`;
        memoryStore.set(key, { code, expireAt: Date.now() + this.ttlMs, attempts: 0 });
    }
    async verifyLoginMailCode(mail, code) {
        const key = `login:mail:${mail}`;
        const rec = memoryStore.get(key);
        if (!rec || Date.now() > rec.expireAt)
            return false;
        rec.attempts += 1;
        return rec.code === code;
    }
};
exports.VerifyCodeService = VerifyCodeService;
exports.VerifyCodeService = VerifyCodeService = __decorate([
    (0, common_1.Injectable)()
], VerifyCodeService);
