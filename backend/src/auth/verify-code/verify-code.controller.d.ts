import { VerifyCodeService } from './verify-code.service';
declare class VerifyCodeSendDto {
    sendType: 'login' | 'register';
    mail: string;
}
export declare class VerifyCodeController {
    private readonly service;
    constructor(service: VerifyCodeService);
    send(body: VerifyCodeSendDto): Promise<void>;
}
export {};
