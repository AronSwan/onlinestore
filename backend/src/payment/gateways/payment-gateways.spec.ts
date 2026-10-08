import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoGatewayService } from './crypto-gateway.service';

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

  // GopayGatewayService 用例随 gopay 栈删除（2026-10-09 用户裁决：gopay 支付栈删）
});
