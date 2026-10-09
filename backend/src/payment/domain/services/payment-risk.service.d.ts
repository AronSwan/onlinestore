import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { Money } from '../value-objects/money.value-object';
export declare class RiskAssessmentResult {
    private readonly riskLevel;
    private readonly riskScore;
    private readonly reason;
    constructor(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH', riskScore: number, reason: string);
    isHighRisk(): boolean;
    getReason(): string;
    getRiskLevel(): string;
    getRiskScore(): number;
}
export declare class PaymentRiskService {
    assessRisk(params: {
        userId: string;
        amount: Money;
        paymentMethod: PaymentMethod;
        clientIp: string;
        userAgent: string;
    }): Promise<RiskAssessmentResult>;
}
