import { ConfigService } from '@nestjs/config';
export declare class PaymentModule {
    private configService;
    constructor(configService: ConfigService);
    private validateCriticalConfig;
}
