import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';
export declare class Product {
    id: number;
    name: string;
    description: string;
    price: number;
    originalPrice: number;
    stock: number;
    sales: number;
    isActive: boolean;
    views: number;
    favorites: number;
    mainImage: string;
    tags: string[];
    specifications: Record<string, any>;
    category: Category;
    images: ProductImage[];
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date;
    version: number;
}
