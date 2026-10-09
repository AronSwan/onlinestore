import { Product } from './product.entity';
export declare class Category {
    id: number;
    name: string;
    slug: string;
    description: string;
    icon: string;
    isActive: boolean;
    sortOrder: number;
    children: Category[];
    parent: Category;
    products: Product[];
    createdAt: Date;
    updatedAt: Date;
}
