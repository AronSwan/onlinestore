import { Cipheriv, Decipheriv } from 'crypto';
export interface CipherGCM extends Cipheriv {
    getAuthTag(): Buffer;
}
export interface DecipherGCM extends Decipheriv {
    setAuthTag(tag: Buffer): this;
}
export interface EncryptionResult {
    iv: string;
    encrypted: string;
    authTag: string;
}
export interface DecryptionInput {
    iv: string;
    encrypted: string;
    authTag: string;
}
