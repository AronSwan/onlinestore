import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsBoolean, IsOptional, validateSync } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

export class PaymentConfig {
  // Gopay 网关配置
  @IsString()
  @IsOptional()
  gopayGatewayUrl?: string = 'http://localhost:8080';

  @IsString()
  @IsOptional()
  gopayAppId?: string;

  @IsString()
  @IsOptional()
  gopayAppSecret?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 30000)
  gopayTimeout: number = 30000;

  // 加密货币网关配置
  @IsString()
  @IsOptional()
  cryptoGatewayUrl?: string = 'http://localhost:8081';

  @IsString()
  @IsOptional()
  cryptoApiKey?: string;

  @IsString()
  @IsOptional()
  cryptoApiSecret?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 30000)
  cryptoTimeout: number = 30000;

  // 支付配置
  @IsString()
  defaultCurrency: string = 'CNY';

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 30)
  defaultExpireMinutes: number = 30;

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 3)
  maxRetryCount: number = 3;

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 10000)
  callbackTimeout: number = 10000;

  // 支付宝配置
  @IsString()
  @IsOptional()
  alipayAppId?: string;

  @IsString()
  @IsOptional()
  alipayPrivateKey?: string;

  @IsString()
  @IsOptional()
  alipayPublicKey?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  alipaySandbox: boolean = true;

  // 微信支付配置
  @IsString()
  @IsOptional()
  wechatAppId?: string;

  @IsString()
  @IsOptional()
  wechatMchId?: string;

  @IsString()
  @IsOptional()
  wechatApiKey?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  wechatSandbox: boolean = true;

  // 银联支付配置
  @IsString()
  @IsOptional()
  unionpayMerId?: string;

  @IsString()
  @IsOptional()
  unionpayPrivateKey?: string;

  @IsString()
  @IsOptional()
  unionpayPublicKey?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  unionpaySandbox: boolean = true;

  // USDT配置
  @IsString()
  @IsOptional()
  usdtTrc20Contract: string = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

  @IsString()
  @IsOptional()
  tronRpcUrl: string = 'https://api.trongrid.io';

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 1)
  usdtTrc20Confirmations: number = 1;

  @IsString()
  @IsOptional()
  usdtErc20Contract: string = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

  @IsString()
  @IsOptional()
  ethRpcUrl: string = 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID';

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 12)
  usdtErc20Confirmations: number = 12;

  @IsString()
  @IsOptional()
  usdtBep20Contract: string = '0x55d398326f99059fF775485246999027B3197955';

  @IsString()
  @IsOptional()
  bscRpcUrl: string = 'https://bsc-dataseed1.binance.org';

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 3)
  usdtBep20Confirmations: number = 3;

  // Bitcoin配置
  @IsString()
  @IsOptional()
  btcNetwork: string = 'mainnet';

  @IsString()
  @IsOptional()
  btcRpcUrl?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 6)
  btcConfirmations: number = 6;

  // Ethereum配置
  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 12)
  ethConfirmations: number = 12;

  // 验证配置
  static validate(config: Record<string, unknown>): PaymentConfig {
    const validatedConfig = plainToClass(PaymentConfig, {
      gopayGatewayUrl: config.GOPAY_GATEWAY_URL || 'http://localhost:8080',
      gopayAppId: config.GOPAY_APP_ID,
      gopayAppSecret: config.GOPAY_APP_SECRET,
      gopayTimeout: config.GOPAY_TIMEOUT || '30000',
      cryptoGatewayUrl: config.CRYPTO_GATEWAY_URL || 'http://localhost:8081',
      cryptoApiKey: config.CRYPTO_API_KEY,
      cryptoApiSecret: config.CRYPTO_API_SECRET,
      cryptoTimeout: config.CRYPTO_TIMEOUT || '30000',
      defaultCurrency: config.PAYMENT_DEFAULT_CURRENCY || 'CNY',
      defaultExpireMinutes: config.PAYMENT_DEFAULT_EXPIRE_MINUTES || '30',
      maxRetryCount: config.PAYMENT_MAX_RETRY_COUNT || '3',
      callbackTimeout: config.PAYMENT_CALLBACK_TIMEOUT || '10000',
      alipayAppId: config.ALIPAY_APP_ID,
      alipayPrivateKey: config.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: config.ALIPAY_PUBLIC_KEY,
      alipaySandbox: config.ALIPAY_SANDBOX || 'true',
      wechatAppId: config.WECHAT_APP_ID,
      wechatMchId: config.WECHAT_MCH_ID,
      wechatApiKey: config.WECHAT_API_KEY,
      wechatSandbox: config.WECHAT_SANDBOX || 'true',
      unionpayMerId: config.UNIONPAY_MER_ID,
      unionpayPrivateKey: config.UNIONPAY_PRIVATE_KEY,
      unionpayPublicKey: config.UNIONPAY_PUBLIC_KEY,
      unionpaySandbox: config.UNIONPAY_SANDBOX || 'true',
      usdtTrc20Contract: config.USDT_TRC20_CONTRACT || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      tronRpcUrl: config.TRON_RPC_URL || 'https://api.trongrid.io',
      usdtTrc20Confirmations: config.USDT_TRC20_CONFIRMATIONS || '1',
      usdtErc20Contract: config.USDT_ERC20_CONTRACT || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      ethRpcUrl: config.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      usdtErc20Confirmations: config.USDT_ERC20_CONFIRMATIONS || '12',
      usdtBep20Contract: config.USDT_BEP20_CONTRACT || '0x55d398326f99059fF775485246999027B3197955',
      bscRpcUrl: config.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
      usdtBep20Confirmations: config.USDT_BEP20_CONFIRMATIONS || '3',
      btcNetwork: config.BTC_NETWORK || 'mainnet',
      btcRpcUrl: config.BTC_RPC_URL,
      btcConfirmations: config.BTC_CONFIRMATIONS || '6',
      ethConfirmations: config.ETH_CONFIRMATIONS || '12',
    });

    const errors = validateSync(validatedConfig);
    if (errors.length > 0) {
      console.warn(`Payment configuration validation warnings: ${errors.toString()}`);
      // 在开发环境中，只警告而不抛出错误
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Payment configuration validation failed: ${errors.toString()}`);
      }
    }

    return validatedConfig;
  }
}

export default registerAs('payment', () => PaymentConfig.validate(process.env));
