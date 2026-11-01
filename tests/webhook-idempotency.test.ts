import { describe, it, expect, vi } from 'vitest';
import { CashfreeWebhookProcessor, CashfreeWebhookPayload } from '../src/payments/cashfree-webhook.js';
import crypto from 'node:crypto';

describe('Cashfree Webhook Verification & Idempotency', () => {
  const secretKey = 'test_webhook_secret_key_123';
  const processor = new CashfreeWebhookProcessor(secretKey);

  const mockPayload: CashfreeWebhookPayload = {
    data: {
      order: {
        order_id: 'order_cynbit_test_1001',
        order_amount: 1999,
        order_currency: 'INR',
        order_tags: {
          candidateId: 'cmv6c050r000c04l3crjsb348',
        },
      },
      payment: {
        cf_payment_id: 'pay_99887766',
        payment_status: 'SUCCESS',
        payment_amount: 1999,
        payment_time: new Date().toISOString(),
      },
      customer_details: {
        customer_id: 'cmv6c050r000c04l3crjsb348',
        customer_email: 'kashishrathoreo110@gmail.com',
      },
    },
    event_time: new Date().toISOString(),
    type: 'PAYMENT_SUCCESS_WEBHOOK',
  };

  it('verifies valid HMAC-SHA256 signature from Cashfree', () => {
    const rawBody = JSON.stringify(mockPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(`${timestamp}${rawBody}`)
      .digest('base64');

    expect(processor.verifySignature(rawBody, timestamp, signature)).toBe(true);
  });

  it('rejects tampered or forged webhook signatures', () => {
    const rawBody = JSON.stringify(mockPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const invalidSignature = 'invalid_base64_signature==';

    expect(processor.verifySignature(rawBody, timestamp, invalidSignature)).toBe(false);
  });

  it('processes payment idempotently and rejects duplicate replay events', async () => {
    const callbackMock = vi.fn().mockResolvedValue(undefined);

    // First invocation: should process
    const firstCall = await processor.handleWebhook(mockPayload, callbackMock);
    expect(firstCall.status).toBe('PROCESSED');
    expect(callbackMock).toHaveBeenCalledTimes(1);
    expect(callbackMock).toHaveBeenCalledWith('order_cynbit_test_1001', 'pay_99887766', 'cmv6c050r000c04l3crjsb348');

    // Duplicate webhook delivery (common in network retries)
    const secondCall = await processor.handleWebhook(mockPayload, callbackMock);
    expect(secondCall.status).toBe('ALREADY_HANDLED');
    expect(callbackMock).toHaveBeenCalledTimes(1); // Callback must NOT be invoked again
  });
});
