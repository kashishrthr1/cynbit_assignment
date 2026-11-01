/**
 * Cryptographic Candidate Session Management
 * 
 * Replaces unexpiring, naked URL tokens (/candidate/[token])
 * with HMAC-SHA256 signed, time-bounded session tokens.
 */

import crypto from 'node:crypto';

export interface CandidateSessionPayload {
  candidateId: string;
  trainingToken: string;
  issuedAt: number;
  expiresAt: number;
}

export class CandidateSessionManager {
  private secretKey: string;

  constructor(secretKey: string = process.env.SESSION_SECRET || 'cynbit-secure-fallback-key-32chars!!') {
    this.secretKey = secretKey;
  }

  /**
   * Signs and seals candidate session payload.
   */
  public createSessionToken(candidateId: string, trainingToken: string, ttlSeconds = 86400 * 7): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: CandidateSessionPayload = {
      candidateId,
      trainingToken,
      issuedAt: now,
      expiresAt: now + ttlSeconds,
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  /**
   * Verifies signature and expiration of session token.
   */
  public verifySessionToken(token: string): CandidateSessionPayload | null {
    if (!token || !token.includes('.')) {
      return null;
    }

    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(encodedPayload)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    try {
      const payload: CandidateSessionPayload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf-8')
      );

      const now = Math.floor(Date.now() / 1000);
      if (payload.expiresAt < now) {
        return null; // Expired
      }

      return payload;
    } catch {
      return null;
    }
  }
}
