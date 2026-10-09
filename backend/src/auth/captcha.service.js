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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptchaService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const unified_master_config_1 = require("../config/unified-master.config");
const masterConfig = (0, unified_master_config_1.createMasterConfiguration)();
let CaptchaService = class CaptchaService {
    constructor(http) {
        this.http = http;
    }
    async verify(token, remoteip) {
        const captchaConfig = {
            enabled: false,
            provider: 'recaptcha',
            secret: '',
            threshold: 5,
            windowSec: 600,
        };
        if (!captchaConfig.enabled) {
            return true;
        }
        const provider = captchaConfig.provider;
        const secret = captchaConfig.secret;
        if (!secret) {
            return false;
        }
        try {
            if (provider === 'hcaptcha') {
                const url = 'https://hcaptcha.com/siteverify';
                const payload = new URLSearchParams({
                    secret,
                    response: token,
                });
                if (remoteip)
                    payload.append('remoteip', remoteip);
                const resp = await (0, rxjs_1.firstValueFrom)(this.http.post(url, payload.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }));
                return !!resp.data?.success;
            }
            if (provider === 'recaptcha') {
                const url = 'https://www.google.com/recaptcha/api/siteverify';
                const payload = new URLSearchParams({
                    secret,
                    response: token,
                });
                if (remoteip)
                    payload.append('remoteip', remoteip);
                const resp = await (0, rxjs_1.firstValueFrom)(this.http.post(url, payload.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }));
                return !!resp.data?.success;
            }
            return false;
        }
        catch (e) {
            return false;
        }
    }
};
exports.CaptchaService = CaptchaService;
exports.CaptchaService = CaptchaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], CaptchaService);
