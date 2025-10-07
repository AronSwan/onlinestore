import { Module, Global } from '@nestjs/common';
import {
  LogSanitizerService,
  EncryptionService,
  PaymentSecurityService,
  RateLimitGuard,
  SecurityMiddleware,
} from './index';

@Global()
@Module({
  providers: [
    LogSanitizerService,
    EncryptionService,
    PaymentSecurityService,
    RateLimitGuard,
    SecurityMiddleware,
  ],
  exports: [
    LogSanitizerService,
    EncryptionService,
    PaymentSecurityService,
    RateLimitGuard,
    SecurityMiddleware,
  ],
})
export class SecurityModule {}
