export declare class PushService {
    sendPush(userId: number, title: string, content: string, data?: any): Promise<void>;
    sendPushToUsers(userIds: number[], title: string, content: string, data?: any): Promise<void>;
    sendPushToAll(title: string, content: string, data?: any): Promise<void>;
}
