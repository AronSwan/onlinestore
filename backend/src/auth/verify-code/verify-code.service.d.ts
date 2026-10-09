export declare class VerifyCodeService {
    private ttlMs;
    sendLoginMailCode(mail: string): Promise<void>;
    verifyLoginMailCode(mail: string, code: string): Promise<boolean>;
}
