export declare class ConfigurationValidator {
    static validateAll(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    static validateDatabaseConfig(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    static validateRedisConfig(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    static validateJwtConfig(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    static validateConnectionPool(): {
        isValid: boolean;
        errors: never[];
        warnings: string[];
    };
    static generateConfigReport(): string;
}
