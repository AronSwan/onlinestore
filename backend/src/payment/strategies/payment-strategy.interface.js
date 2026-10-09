"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStrategy = void 0;
const crypto = __importStar(require("crypto"));
const payment_security_service_1 = require("../../common/security/payment-security.service");
class PaymentStrategy {
    verifyCallbackSignature(data) {
        const secret = process.env.PAYMENT_SIGNATURE_SECRET;
        if (!secret) {
            console.warn(`[${this.constructor.name}] PAYMENT_SIGNATURE_SECRET 未配置，支付回调验签拒绝（fail-closed）`);
            return false;
        }
        if (!data || typeof data !== 'object') {
            return false;
        }
        const provided = typeof data.signature === 'string' ? data.signature : '';
        if (!provided) {
            return false;
        }
        const { signature: _ignored, ...rest } = data;
        const sorted = (0, payment_security_service_1.sortKeysDeep)(rest);
        const expected = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(sorted))
            .digest('hex');
        const providedBuf = Buffer.from(provided, 'hex');
        const expectedBuf = Buffer.from(expected, 'hex');
        if (providedBuf.length === 0 || providedBuf.length !== expectedBuf.length) {
            return false;
        }
        return crypto.timingSafeEqual(providedBuf, expectedBuf);
    }
}
exports.PaymentStrategy = PaymentStrategy;
