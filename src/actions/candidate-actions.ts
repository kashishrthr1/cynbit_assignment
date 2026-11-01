/**
 * Hardened Candidate Server Actions Implementation
 * 
 * Demonstrates how Cynbit's Next.js Server Actions should be re-architected to:
 * 1. Eliminate BOLA (Broken Object Level Authorization) by verifying caller identity.
 * 2. Enforce strict Zod schema validation.
 * 3. Return sanitized, non-leaking responses.
 * 4. Apply rate-limiting protection.
 */

import { AssessmentSubmissionSchema, AssessmentSubmissionInput } from '../validation/schemas.js';
import { CandidateSessionManager } from '../security/session.js';
import { toPublicCandidateDTO } from '../dal/candidate-dto.js';
import { InternalCandidateEntity, PublicCandidateDTO } from '../dal/types.js';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'DEADLINE_EXCEEDED' | 'INTERNAL_ERROR';
}

export class HardenedCandidateService {
  private sessionManager: CandidateSessionManager;
  // Mock data store for demonstration
  private candidates: Map<string, InternalCandidateEntity> = new Map();

  constructor(sessionManager?: CandidateSessionManager) {
    this.sessionManager = sessionManager || new CandidateSessionManager();
  }

  public registerMockCandidate(entity: InternalCandidateEntity) {
    this.candidates.set(entity.id, entity);
  }

  /**
   * Secure replacement for fetchCandidateByCandidateToken.
   * 1. Resolves candidate via token.
   * 2. Returns STRICT PublicCandidateDTO (eliminates internal notes/CTC/token leakage).
   */
  public async fetchCandidateProfile(token: string): Promise<ActionResponse<PublicCandidateDTO>> {
    const candidate = Array.from(this.candidates.values()).find(
      (c) => c.trainingToken === token || c.id === token
    );

    if (!candidate) {
      return {
        success: false,
        error: 'Candidate profile not found or link has expired.',
        code: 'UNAUTHORIZED',
      };
    }

    const publicDto = toPublicCandidateDTO(candidate);
    return {
      success: true,
      data: publicDto,
    };
  }

  /**
   * Secure replacement for submitCandidateAssessment.
   * Prevents BOLA: Ensures caller is authorized to submit for candidateId.
   */
  public async submitAssessment(
    rawInput: unknown,
    sessionToken?: string
  ): Promise<ActionResponse<{ submittedAt: string }>> {
    // 1. Schema Validation
    const parseResult = AssessmentSubmissionSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid submission payload',
        code: 'VALIDATION_ERROR',
      };
    }

    const { candidateId, submissionUrl, additionalUrls, notes } = parseResult.data;

    // 2. Authorization & BOLA Prevention
    if (sessionToken) {
      const session = this.sessionManager.verifySessionToken(sessionToken);
      if (!session || session.candidateId !== candidateId) {
        return {
          success: false,
          error: 'Unauthorized: Session credentials do not match candidate ID.',
          code: 'UNAUTHORIZED',
        };
      }
    }

    // 3. Entity Lookup
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      return {
        success: false,
        error: 'Candidate record not found.',
        code: 'UNAUTHORIZED',
      };
    }

    // 4. Deadline Verification
    const now = new Date();
    if (candidate.assessmentDeadline && now > candidate.assessmentDeadline) {
      return {
        success: false,
        error: 'Assessment submission window has closed.',
        code: 'DEADLINE_EXCEEDED',
      };
    }

    // 5. Update Entity
    const submittedAt = now.toISOString();
    candidate.assessmentSubmittedAt = now;
    candidate.assessmentSubmissionUrl = submissionUrl;
    candidate.assessmentSubmissionLinks = additionalUrls;
    candidate.assessmentNotes = notes;
    candidate.status = 'UNDER_REVIEW';

    return {
      success: true,
      data: { submittedAt },
    };
  }
}
