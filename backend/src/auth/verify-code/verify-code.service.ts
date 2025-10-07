import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

interface VerifyCodeRecord {
  code: string;
  expireAt: number;
  attempts: number;
}

const memoryStore = new Map<string, VerifyCodeRecord>();

@Injectable()
export class VerifyCodeService {
  private ttlMs = 5 * 60 * 1000;

  async sendLoginMailCode(mail: string): Promise<void> {
    const code = String(randomInt(100000, 999999));
    const key = `login:mail:${mail}`;
    memoryStore.set(key, { code, expireAt: Date.now() + this.ttlMs, attempts: 0 });
    // TODO: integrate real mail provider; emit monitoring metric
  }

  async verifyLoginMailCode(mail: string, code: string): Promise<boolean> {
    const key = `login:mail:${mail}`;
    const rec = memoryStore.get(key);
    if (!rec || Date.now() > rec.expireAt) return false;
    rec.attempts += 1;
    return rec.code === code;
  }
}
