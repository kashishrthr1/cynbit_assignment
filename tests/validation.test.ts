import { describe, it, expect } from 'vitest';
import { AssessmentSubmissionSchema, SupportTicketSchema } from '../src/validation/schemas.js';

describe('Zod Input Validation & Sanitization', () => {
  it('accepts valid GitHub repository submissions with HTTPS', () => {
    const validPayload = {
      candidateId: 'cmv6c050r000c04l3crjsb348',
      submissionUrl: 'https://github.com/kashishrthr1/cynbit-backend-audit',
      additionalUrls: ['https://drive.google.com/file/d/audit-doc'],
      notes: 'Completed comprehensive backend technical audit with zero data leakage DTO implementation.',
    };

    const result = AssessmentSubmissionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects insecure HTTP submission URLs', () => {
    const insecurePayload = {
      candidateId: 'cmv6c050r000c04l3crjsb348',
      submissionUrl: 'http://github.com/kashishrthr1/cynbit-backend-audit',
      additionalUrls: [],
      notes: 'Test notes',
    };

    const result = AssessmentSubmissionSchema.safeParse(insecurePayload);
    expect(result.success).toBe(false);
  });

  it('rejects unapproved third-party submission hosts', () => {
    const maliciousHostPayload = {
      candidateId: 'cmv6c050r000c04l3crjsb348',
      submissionUrl: 'https://malicious-phishing-site.com/exploit',
      additionalUrls: [],
      notes: 'Test notes',
    };

    const result = AssessmentSubmissionSchema.safeParse(maliciousHostPayload);
    expect(result.success).toBe(false);
  });

  it('rejects malformed candidate IDs (anti-injection)', () => {
    const invalidIdPayload = {
      candidateId: 'cmv6c050"; DROP TABLE candidates; --',
      submissionUrl: 'https://github.com/kashishrthr1/repo',
      additionalUrls: [],
      notes: 'SQL Injection attempt',
    };

    const result = AssessmentSubmissionSchema.safeParse(invalidIdPayload);
    expect(result.success).toBe(false);
  });

  it('validates support ticket categories and trims inputs', () => {
    const validTicket = {
      candidateId: 'cmv6c050r000c04l3crjsb348',
      category: 'Assessment & Tasks' as const,
      subject: '   Clarification on API architecture   ',
      message: '   Need clarification on the Server Action response structure.   ',
    };

    const result = SupportTicketSchema.safeParse(validTicket);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe('Clarification on API architecture');
      expect(result.data.message).toBe('Need clarification on the Server Action response structure.');
    }
  });

  it('rejects invalid support ticket categories', () => {
    const invalidTicket = {
      candidateId: 'cmv6c050r000c04l3crjsb348',
      category: 'NonExistentCategory' as any,
      subject: 'Valid Subject',
      message: 'Valid message body with sufficient length.',
    };

    const result = SupportTicketSchema.safeParse(invalidTicket);
    expect(result.success).toBe(false);
  });
});
