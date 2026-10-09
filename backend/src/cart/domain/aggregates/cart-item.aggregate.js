"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartItemAggregate = void 0;
class CartItemAggregate {
    constructor(id, customerUserId, productId, productSkuId, productName, productBrand, productPrice, productQuantity, productPic, productAttribute, selectFlag = true, delFlag = false, createdAt = new Date(), updatedAt = new Date()) {
        this.id = id;
        this.customerUserId = customerUserId;
        this.productId = productId;
        this.productSkuId = productSkuId;
        this.productName = productName;
        this.productBrand = productBrand;
        this.productPrice = productPrice;
        this.productQuantity = productQuantity;
        this.productPic = productPic;
        this.productAttribute = productAttribute;
        this.selectFlag = selectFlag;
        this.delFlag = delFlag;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    get userId() {
        return this.customerUserId;
    }
    updateQuantity(newQuantity) {
        if (newQuantity <= 0) {
            throw new Error('商品数量必须大于0');
        }
        if (newQuantity > 999) {
            throw new Error('单个商品数量不能超过999');
        }
        this.productQuantity = newQuantity;
        this.updatedAt = new Date();
    }
    setSelectFlag(selectFlag) {
        this.selectFlag = selectFlag;
    }
    mergeQuantity(additionalQuantity) {
        const newQuantity = this.productQuantity + additionalQuantity;
        if (newQuantity > 999) {
            throw new Error('单个商品数量不能超过999');
        }
        this.productQuantity = newQuantity;
        this.updatedAt = new Date();
    }
    static create(customerUserId, productId, productSkuId, productName, productBrand, productPrice, productQuantity, productPic, productAttribute) {
        return new CartItemAggregate(CartItemAggregate.generateId(), customerUserId, productId, productSkuId, productName, productBrand, productPrice, productQuantity, productPic, productAttribute);
    }
    validate() {
        return !!(this.customerUserId &&
            this.productId &&
            this.productSkuId &&
            this.productName &&
            this.productPrice > 0 &&
            this.productQuantity > 0);
    }
    static generateId() {
        return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.CartItemAggregate = CartItemAggregate;
