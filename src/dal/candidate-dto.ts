import { InternalCandidateEntity, PublicCandidateDTO } from './types.js';

/**
 * Recommended Prisma Query Projection (Field-Level Selection)
 * 
 * Instead of:
 *   prisma.candidate.findUnique({ where: { trainingToken }, include: { ... } })
 * 
 * Use explicit field projection at the database level:
 */
export const candidatePortalSelect = {
  id: true,
  fullName: true,
  email: true,
  jobId: true,
  assessmentTitle: true,
  assessmentPrompt: true,
  assessmentDeadline: true,
  assessmentSubmittedAt: true,
  assessmentSubmissionUrl: true,
  assessmentSubmissionLinks: true,
  paymentStatus: true,
  trainingFeeScholarship: true,
  status: true,
  // Note: internalNotes, rating, assignedTo, offeredCtc, activityLogs,
  // onboardingToken, and activationTokenHash are EXCLUDED from the query.
} as const;

/**
 * Transforms an internal entity into a safe public DTO.
 * Guarantees zero leakage of internal HR evaluation notes, CTC, or activation tokens.
 */
export function toPublicCandidateDTO(
  entity: Partial<InternalCandidateEntity>,
  jobTitle = 'Backend Developer Intern'
): PublicCandidateDTO {
  return {
    id: entity.id || '',
    fullName: entity.fullName || '',
    email: entity.email || '',
    jobTitle,
    assessment: {
      title: entity.assessmentTitle || 'Technical Assessment',
      prompt: entity.assessmentPrompt || '',
      deadline: entity.assessmentDeadline ? new Date(entity.assessmentDeadline).toISOString() : '',
      isSubmitted: Boolean(entity.assessmentSubmittedAt || entity.assessmentSubmissionUrl),
      submittedAt: entity.assessmentSubmittedAt ? new Date(entity.assessmentSubmittedAt).toISOString() : null,
      submissionUrl: entity.assessmentSubmissionUrl || null,
      submissionLinks: entity.assessmentSubmissionLinks || [],
    },
    payment: {
      status: entity.paymentStatus || 'UNPAID',
      feeAmount: entity.trainingFeeScholarship || '0',
      hasScholarship: Number(entity.scholarshipDiscountPct || 0) > 0,
    },
    portalStatus: (entity.status as any) || 'ASSESSMENT',
  };
}

/**
 * Audit check helper: Scans any candidate response object for prohibited keys.
 */
export const SENSITIVE_PROHIBITED_KEYS = [
  'internalNotes',
  'rating',
  'assignedTo',
  'offeredCtc',
  'rejectionReason',
  'assessmentScore',
  'assessmentFeedback',
  'onboardingToken',
  'activationTokenHash',
  'activityLogs',
  'ndaIpAddress',
  'ndaUserAgent',
  'digitalSignature',
];

export function assertNoSensitiveDataLeaks(payload: Record<string, unknown>): boolean {
  for (const key of SENSITIVE_PROHIBITED_KEYS) {
    if (key in payload && payload[key] !== undefined) {
      throw new Error(`Data Leak Violation: Field '${key}' must not be exposed to the client.`);
    }
  }
  return true;
}
