"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRiskService = exports.RiskAssessmentResult = void 0;
const common_1 = require("@nestjs/common");
class RiskAssessmentResult {
    constructor(riskLevel, riskScore, reason) {
        this.riskLevel = riskLevel;
        this.riskScore = riskScore;
        this.reason = reason;
    }
    isHighRisk() {
        return this.riskLevel === 'HIGH';
    }
    getReason() {
        return this.reason;
    }
    getRiskLevel() {
        return this.riskLevel;
    }
    getRiskScore() {
        return this.riskScore;
    }
}
exports.RiskAssessmentResult = RiskAssessmentResult;
let PaymentRiskService = class PaymentRiskService {
    async assessRisk(params) {
        return new RiskAssessmentResult('LOW', 0.1, 'Normal payment pattern');
    }
};
exports.PaymentRiskService = PaymentRiskService;
exports.PaymentRiskService = PaymentRiskService = __decorate([
    (0, common_1.Injectable)()
], PaymentRiskService);
