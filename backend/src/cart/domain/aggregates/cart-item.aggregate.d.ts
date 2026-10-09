export declare class CartItemAggregate {
    readonly id: string;
    readonly customerUserId: string;
    readonly productId: string;
    readonly productSkuId: string;
    productName: string;
    productBrand: string;
    productPrice: number;
    productQuantity: number;
    productPic: string;
    productAttribute: string;
    selectFlag: boolean;
    delFlag: boolean;
    readonly createdAt: Date;
    updatedAt: Date;
    constructor(id: string, customerUserId: string, productId: string, productSkuId: string, productName: string, productBrand: string, productPrice: number, productQuantity: number, productPic: string, productAttribute: string, selectFlag?: boolean, delFlag?: boolean, createdAt?: Date, updatedAt?: Date);
    get userId(): string;
    updateQuantity(newQuantity: number): void;
    setSelectFlag(selectFlag: boolean): void;
    mergeQuantity(additionalQuantity: number): void;
    static create(customerUserId: string, productId: string, productSkuId: string, productName: string, productBrand: string, productPrice: number, productQuantity: number, productPic: string, productAttribute: string): CartItemAggregate;
    validate(): boolean;
    private static generateId;
}
