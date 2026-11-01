/**
 * Strict Input Validation Schemas
 * 
 * Provides runtime schema verification for all candidate-facing Server Actions.
 * Defends against BOLA, injection, invalid URLs, and prototype pollution.
 */

import { z } from 'zod';

export const AssessmentSubmissionSchema = z.object({
  candidateId: z
    .string()
    .min(10, 'Candidate ID must be at least 10 characters')
    .max(40, 'Candidate ID cannot exceed 40 characters')
    .regex(/^[a-z0-9]+$/i, 'Invalid candidate ID format (expected CUID alphanumeric)'),
  
  submissionUrl: z
    .string()
    .url('Primary submission must be a valid URL')
    .refine(
      (url) => {
        const parsed = new URL(url);
        return (
          parsed.protocol === 'https:' &&
          (parsed.hostname === 'github.com' ||
            parsed.hostname.endsWith('.github.io') ||
            parsed.hostname.endsWith('.vercel.app') ||
            parsed.hostname === 'drive.google.com')
        );
      },
      {
        message: 'Primary submission must be a valid HTTPS link (GitHub repository, Vercel deployment, or Google Drive)',
      }
    ),
  
  additionalUrls: z
    .array(
      z.string().url('Additional URL must be a valid HTTPS link').refine((u) => u.startsWith('https://'), {
        message: 'Only secure HTTPS URLs are permitted',
      })
    )
    .max(5, 'Maximum of 5 additional links permitted')
    .default([]),
  
  notes: z
    .string()
    .max(4000, 'Notes cannot exceed 4000 characters')
    .transform((str) => str.trim()),
});

export const SupportTicketSchema = z.object({
  candidateId: z
    .string()
    .regex(/^[a-z0-9]+$/i, 'Invalid candidate ID format'),
  
  category: z.enum([
    'Assessment & Tasks',
    'Payment & Fees',
    'Interview Schedule',
    'Onboarding Documents',
    'Technical & Credentials',
    'General Inquiry / Other',
  ]),
  
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters')
    .max(150, 'Subject cannot exceed 150 characters')
    .transform((str) => str.trim()),
  
  message: z
    .string()
    .min(10, 'Message details must be at least 10 characters')
    .max(3000, 'Message cannot exceed 3000 characters')
    .transform((str) => str.trim()),
});

export type AssessmentSubmissionInput = z.infer<typeof AssessmentSubmissionSchema>;
export type SupportTicketInput = z.infer<typeof SupportTicketSchema>;
