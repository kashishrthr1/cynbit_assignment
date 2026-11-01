/**
 * Robust Cashfree Webhook Handler
 * 
 * Replaces client-side 180s localStorage polling with an idempotent,
 * cryptographically verified server-side webhook handler.
 */

import crypto from 'node:crypto';

export interface CashfreeWebhookPayload {
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency: string;
      order_tags?: {
        candidateId?: string;
        trainingToken?: string;
      };
    };
    payment: {
      cf_payment_id: string;
      payment_status: 'SUCCESS' | 'FAILED' | 'USER_DROPPED';
      payment_amount: number;
      payment_time: string;
      payment_message?: string;
    };
    customer_details: {
      customer_id: string;
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
    };
  };
  event_time: string;
  type: 'PAYMENT_SUCCESS_WEBHOOK' | 'PAYMENT_FAILED_WEBHOOK';
}

export class CashfreeWebhookProcessor {
  private secretKey: string;
  // Processed event idempotency store (in production: Redis SETNX or DB unique constraint)
  private processedEvents: Set<string> = new Set();

  constructor(secretKey = process.env.CASHFREE_SECRET_KEY || 'cynbit_cashfree_test_secret') {
    this.secretKey = secretKey;
  }

  /**
   * Verifies Cashfree HMAC-SHA256 signature from headers
   * Format: x-webhook-signature and x-webhook-timestamp
   */
  public verifySignature(rawBody: string, timestamp: string, signature: string): boolean {
    if (!rawBody || !timestamp || !signature) {
      return false;
    }

    const payload = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('base64');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  /**
   * Idempotently processes payment status.
   */
  public async handleWebhook(
    payload: CashfreeWebhookPayload,
    onSuccessCallback: (orderId: string, paymentId: string, candidateId?: string) => Promise<void>
  ): Promise<{ status: 'PROCESSED' | 'ALREADY_HANDLED' | 'IGNORED' }> {
    const paymentId = payload.data.payment.cf_payment_id;
    const eventId = `${payload.type}_${paymentId}`;

    // 1. Idempotency Check
    if (this.processedEvents.has(eventId)) {
      return { status: 'ALREADY_HANDLED' };
    }

    // 2. Handle Event Type
    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK' && payload.data.payment.payment_status === 'SUCCESS') {
      const { order_id, order_tags } = payload.data.order;
      await onSuccessCallback(order_id, paymentId, order_tags?.candidateId);
      this.processedEvents.add(eventId);
      return { status: 'PROCESSED' };
    }

    return { status: 'IGNORED' };
  }
}
