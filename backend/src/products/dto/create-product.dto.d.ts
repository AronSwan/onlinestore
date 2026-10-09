export declare const nullToUndefined: ({ value }: {
    value: any;
}) => any;
export declare class CreateProductDto {
    name: string;
    description: string;
    price: number;
    originalPrice?: number | null;
    stock: number;
    categoryId?: number;
    mainImage?: string;
    tags?: string[];
    images?: string[];
    specifications?: Record<string, any>;
    isActive?: boolean;
}
