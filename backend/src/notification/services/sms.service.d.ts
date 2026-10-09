export declare class SmsService {
    sendSms(phone: string, content: string): Promise<void>;
    sendVerificationCode(phone: string, code: string): Promise<void>;
    sendBulkSms(phones: string[], content: string): Promise<void>;
}
