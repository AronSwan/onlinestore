"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrderId = void 0;
const uuid_1 = require("uuid");
class PaymentOrderId {
    static { this.ID_PATTERN = /^[a-zA-Z0-9_-]+$/; }
    static { this.MIN_LENGTH = 8; }
    static { this.MAX_LENGTH = 64; }
    constructor(value) {
        this.value = value;
        this.validate();
    }
    static create(value) {
        return new PaymentOrderId(value);
    }
    static generate() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const uuid = (0, uuid_1.v4)().replace(/-/g, '').substring(0, 8);
        const id = `PAY_${timestamp}_${random}_${uuid}`.toUpperCase();
        return new PaymentOrderId(id);
    }
    static fromUUID(uuid) {
        const cleanUuid = uuid.replace(/-/g, '');
        const id = `PAY_${cleanUuid}`.toUpperCase();
        return new PaymentOrderId(id);
    }
    validate() {
        if (!this.value) {
            throw new Error('支付订单ID不能为空');
        }
        if (this.value.length < PaymentOrderId.MIN_LENGTH) {
            throw new Error(`支付订单ID长度不能少于${PaymentOrderId.MIN_LENGTH}位`);
        }
        if (this.value.length > PaymentOrderId.MAX_LENGTH) {
            throw new Error(`支付订单ID长度不能超过${PaymentOrderId.MAX_LENGTH}位`);
        }
        if (!PaymentOrderId.ID_PATTERN.test(this.value)) {
            throw new Error('支付订单ID只能包含字母、数字、下划线和连字符');
        }
    }
    equals(other) {
        return this.value === other.value;
    }
    toString() {
        return this.value;
    }
    getShortDisplay() {
        if (this.value.length <= 12) {
            return this.value;
        }
        return `${this.value.substring(0, 6)}...${this.value.substring(this.value.length - 6)}`;
    }
    isSystemGenerated() {
        return this.value.startsWith('PAY_');
    }
    getTimestamp() {
        if (!this.isSystemGenerated()) {
            return null;
        }
        try {
            const parts = this.value.split('_');
            if (parts.length >= 2) {
                const timestampStr = parts[1];
                const timestamp = parseInt(timestampStr, 36);
                return new Date(timestamp);
            }
        }
        catch (error) {
        }
        return null;
    }
}
exports.PaymentOrderId = PaymentOrderId;
