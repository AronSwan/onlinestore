export declare class CartItemResponseDto {
    id: string;
    productId: string;
    productSkuId: string;
    productName: string;
    productBrand: string;
    productPrice: number;
    productQuantity: number;
    productPic: string;
    productAttribute: string;
    selectFlag: boolean;
    createdAt: Date;
    updatedAt: Date;
    totalPrice: number;
    constructor(id: string, productId: string, productSkuId: string, productName: string, productBrand: string, productPrice: number, productQuantity: number, productPic: string, productAttribute: string, selectFlag: boolean, createdAt: Date, updatedAt: Date);
}
