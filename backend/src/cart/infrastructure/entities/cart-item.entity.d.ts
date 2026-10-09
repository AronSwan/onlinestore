export declare class CartItemEntity {
    id: string;
    customerUserId: string;
    get userId(): string;
    set userId(value: string);
    productId: string;
    productSkuId: string;
    productName: string;
    productBrand: string;
    productPrice: number;
    productQuantity: number;
    productPic: string;
    productAttribute: string;
    selectFlag: boolean;
    delFlag: boolean;
    createdAt: Date;
    updatedAt: Date;
}
