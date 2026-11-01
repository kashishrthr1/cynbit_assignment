/**
 * Internal vs Public Domain Types
 * Illustrates the architectural separation between backend database models
 * and client-facing Data Transfer Objects (DTOs).
 */

export interface InternalCandidateEntity {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  currentCity: string;
  dob: Date;
  gender: string;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  whatsapp: string | null;
  agreedToTerms: boolean;
  education: string;
  graduationYear: string;
  skills: string;
  university: string;
  jobId: string;
  
  // Sensitive Internal HR & Evaluation Fields (MUST NEVER BE EXPOSED TO CLIENT)
  status: string;
  rating: number;
  internalNotes: string | null;
  assignedTo: string | null;
  interviewDate: Date | null;
  offeredCtc: string | null;
  joiningDate: Date | null;
  rejectionReason: string | null;
  assessmentScore: number | null;
  assessmentFeedback: string | null;

  // Assessment & Training State
  assessmentTitle: string;
  assessmentPrompt: string;
  assessmentDeadline: Date;
  assessmentSubmittedAt: Date | null;
  assessmentSubmissionUrl: string | null;
  assessmentSubmissionLinks: string[];
  assessmentNotes: string | null;
  trainingToken: string;
  trainingFeeOriginal: string;
  trainingFeeScholarship: string;
  scholarshipDiscountPct: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED';
  
  // Sensitive Onboarding & Audit Tokens
  onboardingToken: string | null;
  activationTokenHash: string | null;
  ndaIpAddress: string | null;
  ndaUserAgent: string | null;
  digitalSignature: string | null;

  // Internal Audit Logs & Relations
  activityLogs: Array<{
    id: string;
    actor: string;
    action: string;
    details: string;
    createdAt: Date;
  }>;
}

/**
 * Public Sanitized Candidate DTO
 * Strictly projected view returned to the candidate portal.
 */
export interface PublicCandidateDTO {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  assessment: {
    title: string;
    prompt: string;
    deadline: string;
    isSubmitted: boolean;
    submittedAt: string | null;
    submissionUrl: string | null;
    submissionLinks: string[];
  };
  payment: {
    status: 'UNPAID' | 'PAID' | 'FAILED';
    feeAmount: string;
    hasScholarship: boolean;
  };
  portalStatus: 'ASSESSMENT' | 'UNDER_REVIEW' | 'ONBOARDING' | 'COMPLETED';
}
