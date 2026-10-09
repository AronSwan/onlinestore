"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const crypto_gateway_service_1 = require("./crypto-gateway.service");
describe('支付网关 fail-closed (P1-min)', () => {
    describe('CryptoGatewayService', () => {
        let service;
        beforeEach(async () => {
            const module = await testing_1.Test.createTestingModule({
                providers: [
                    crypto_gateway_service_1.CryptoGatewayService,
                    {
                        provide: config_1.ConfigService,
                        useValue: {
                            get: (_key, _default) => undefined,
                        },
                    },
                ],
            }).compile();
            service = module.get(crypto_gateway_service_1.CryptoGatewayService);
        });
        it('secret 未配置时 validateCallback 返回 false 且不拼 &secret=undefined', () => {
            const warnSpy = jest.spyOn(service.logger, 'warn').mockImplementation();
            const hashSpy = jest.spyOn(require('crypto'), 'createHash');
            const result = service.validateCallback({ paymentId: 'p1', status: 'success' }, 'deadbeef');
            expect(result).toBe(false);
            expect(warnSpy).toHaveBeenCalled();
            expect(hashSpy).not.toHaveBeenCalled();
            hashSpy.mockRestore();
        });
        it('secret 未配置时签名生成方法抛错而非生成伪造签名', () => {
            expect(() => service.generateSignature({ a: 1 }, '1700000000')).toThrow(/fail-closed/);
        });
    });
});
