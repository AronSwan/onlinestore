import { HttpService } from '@nestjs/axios';
export declare class CaptchaService {
    private readonly http;
    constructor(http: HttpService);
    verify(token: string, remoteip?: string): Promise<boolean>;
}
