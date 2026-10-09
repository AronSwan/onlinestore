import { Product } from './product.entity';
export declare class ProductImage {
    id: number;
    product: Product;
    productId: number;
    url: string;
    title: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
