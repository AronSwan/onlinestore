import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoGatewayService } from './crypto-gateway.service';
import { GopayGatewayService } from './gopay-gateway.service';

describe('支付网关 fail-closed (P1-min)', () => {
  describe('CryptoGatewayService', () => {
    let service: CryptoGatewayService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CryptoGatewayService,
          {
            provide: ConfigService,
            useValue: {
              get: (_key: string, _default?: any) => undefined,
            },
          },
        ],
      }).compile();
      service = module.get<CryptoGatewayService>(CryptoGatewayService);
    });

    it('secret 未配置时 validateCallback 返回 false 且不拼 &secret=undefined', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const hashSpy = jest.spyOn(require('crypto'), 'createHash');

      const result = service.validateCallback({ paymentId: 'p1', status: 'success' }, 'deadbeef');

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      // 未进入签名拼接(不产生 &secret=undefined 的哈希输入)
      expect(hashSpy).not.toHaveBeenCalled();
      hashSpy.mockRestore();
    });

    it('secret 未配置时签名生成方法抛错而非生成伪造签名', () => {
      expect(() => (service as any).generateSignature({ a: 1 }, '1700000000')).toThrow(
        /fail-closed/,
      );
    });
  });

  describe('GopayGatewayService', () => {
    let service: GopayGatewayService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GopayGatewayService,
          {
            provide: ConfigService,
            useValue: {
              get: (_key: string, _default?: any) => undefined,
            },
          },
        ],
      }).compile();
      service = module.get<GopayGatewayService>(GopayGatewayService);
    });

    it('secret 未配置时 validateCallback 返回 false 且不拼 &key=undefined', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const hashSpy = jest.spyOn(require('crypto'), 'createHash');

      const result = service.validateCallback({ paymentId: 'p1', status: 'success' }, 'deadbeef');

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      expect(hashSpy).not.toHaveBeenCalled();
      hashSpy.mockRestore();
    });

    it('secret 未配置时签名生成方法抛错而非生成伪造签名', () => {
      expect(() =>
        (service as any).generateSignature({ a: 1 }, '1700000000', 'nonce'),
      ).toThrow(/fail-closed/);
    });

    it('secret 未配置时响应验签直接判定失败', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const result = (service as any).verifyResponseSignature({
        headers: { 'x-signature': 'deadbeef', 'x-timestamp': '1700000000', 'x-nonce': 'n' },
        data: {},
      });
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
