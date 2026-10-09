export declare const ZERO_HASH: string;
export declare const CANONICAL_KEYS: readonly ["seq", "id", "createTime", "userId", "userName", "operation", "module", "method", "url", "ip", "userAgent", "requestParams", "responseData", "duration", "status", "errorMessage"];
export type CanonicalKey = (typeof CANONICAL_KEYS)[number];
export declare function formatCanonicalDate(value: Date): string;
export declare function canonicalValue(value: unknown): string | null;
export declare function canonicalizeRow(row: Record<string, unknown>): Record<string, string | null>;
export declare function computeRecordHash(prevHash: string, seq: number, row: Record<string, unknown>): string;
export type ChainProblemType = 'UNCHAINED' | 'GAP' | 'DUPLICATE_SEQ' | 'BREAK' | 'CONTENT' | 'FORK';
export interface ChainProblem {
    type: ChainProblemType;
    seq: number | null;
    id: string | null;
    detail: string;
}
export interface ChainVerificationResult {
    valid: boolean;
    length: number;
    headHash: string;
    headSeq: number;
    problems: ChainProblem[];
}
export declare function verifyChain(rows: ReadonlyArray<Record<string, unknown>>): ChainVerificationResult;
