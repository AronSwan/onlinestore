import { Cipheriv, Decipheriv } from 'crypto';

/**
 * 扩展的Cipher接口，包含GCM模式的方法
 */
export interface CipherGCM extends Cipheriv {
  getAuthTag(): Buffer;
}

/**
 * 扩展的Decipher接口，包含GCM模式的方法
 */
export interface DecipherGCM extends Decipheriv {
  setAuthTag(tag: Buffer): this;
}

/**
 * 加密结果接口
 */
export interface EncryptionResult {
  iv: string;
  encrypted: string;
  authTag: string;
}

/**
 * 解密输入接口
 */
export interface DecryptionInput {
  iv: string;
  encrypted: string;
  authTag: string;
}
