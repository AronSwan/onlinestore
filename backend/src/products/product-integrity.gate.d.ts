export interface IntegrityGateInput {
    name?: unknown;
    description?: unknown;
    specifications?: Record<string, unknown> | null;
    tags?: unknown;
}
export interface IntegrityRulesModule {
    lintCopy: (text: string, rules?: unknown[]) => {
        violations: Array<Record<string, unknown>>;
    };
    checkNameImage: (input: {
        name?: string;
        description?: string;
        factCard?: {
            mainColor?: string;
            bagType?: string;
        };
    }) => {
        warnings: Array<Record<string, unknown>>;
        blockers: Array<Record<string, unknown>>;
    };
}
export declare function resolveIntegrityRulesPath(): string;
export declare function loadIntegrityRules(): Promise<IntegrityRulesModule>;
export declare function hasFactCard(specifications: unknown): specifications is Record<string, unknown>;
export declare function enforceProductIntegrityGate(input: IntegrityGateInput): Promise<{
    warnings: Array<Record<string, unknown>>;
}>;
