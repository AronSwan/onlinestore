export declare class FeeInfoDto {
    rate: number;
    min: number;
    max?: number;
}
export declare class TraditionalPaymentMethodDto {
    method: string;
    name: string;
    icon: string;
    enabled: boolean;
    description: string;
    fees: FeeInfoDto;
}
export declare class CryptoPaymentMethodDto {
    method: string;
    name: string;
    icon: string;
    network: string;
    enabled: boolean;
    description: string;
    fees: FeeInfoDto;
    contractAddress?: string;
}
export declare class PaymentMethodsResponseDto {
    traditional: TraditionalPaymentMethodDto[];
    crypto: CryptoPaymentMethodDto[];
}
