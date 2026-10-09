import { OnModuleInit } from '@nestjs/common';
import { RedpandaService } from '../../messaging/redpanda.service';
export interface NotificationRequestedEvent {
    userId: number;
    channel: 'email' | 'sms' | 'push';
    template: string;
    payload: Record<string, any>;
    requestId?: string;
}
export declare class NotificationConsumer implements OnModuleInit {
    private readonly redpanda;
    private readonly logger;
    constructor(redpanda: RedpandaService);
    onModuleInit(): Promise<void>;
}
