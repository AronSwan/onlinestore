export declare class EmailService {
    sendEmail(to: string, subject: string, content: string): Promise<void>;
    sendHtmlEmail(to: string, subject: string, htmlContent: string): Promise<void>;
    sendBulkEmail(recipients: string[], subject: string, content: string): Promise<void>;
}
