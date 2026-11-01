import { describe, it, expect } from 'vitest';
import { CandidateSessionManager } from '../src/security/session.js';
import { HardenedCandidateService } from '../src/actions/candidate-actions.js';
import { InternalCandidateEntity } from '../src/dal/types.js';

describe('Candidate Session Authentication & BOLA Prevention', () => {
  const sessionManager = new CandidateSessionManager('test-secret-salt-32-chars-length!');
  const candidateService = new HardenedCandidateService(sessionManager);

  const mockCandidate: InternalCandidateEntity = {
    id: 'cmv6c050r000c04l3crjsb348',
    fullName: 'Kashish Rathore',
    email: 'kashishrathoreo110@gmail.com',
    phone: '+916263773348',
    currentCity: 'Gwalior',
    dob: new Date('2003-10-01'),
    gender: 'Female',
    linkedinUrl: null,
    portfolioUrl: null,
    whatsapp: null,
    agreedToTerms: true,
    education: 'B.Tech CS',
    graduationYear: '2027',
    skills: 'Node.js, PostgreSQL',
    university: 'MITS',
    jobId: 'backend-developer-intern',
    status: 'ASSESSMENT',
    rating: 0,
    internalNotes: 'Internal admin review notes',
    assignedTo: null,
    interviewDate: null,
    offeredCtc: null,
    joiningDate: null,
    rejectionReason: null,
    assessmentScore: null,
    assessmentFeedback: null,
    assessmentTitle: 'Backend Task',
    assessmentPrompt: 'Analyze backend architecture',
    assessmentDeadline: new Date(Date.now() + 86400000), // Active
    assessmentSubmittedAt: null,
    assessmentSubmissionUrl: null,
    assessmentSubmissionLinks: [],
    assessmentNotes: null,
    trainingToken: 'cmv6c050r000d04l39fg2dix4',
    trainingFeeOriginal: '3999',
    trainingFeeScholarship: '1999',
    scholarshipDiscountPct: 50,
    paymentStatus: 'UNPAID',
    onboardingToken: 'cmv6c050r000e04l3ocafykqn',
    activationTokenHash: null,
    ndaIpAddress: null,
    ndaUserAgent: null,
    digitalSignature: null,
    activityLogs: [],
  };

  candidateService.registerMockCandidate(mockCandidate);

  it('generates and verifies HMAC signed session token', () => {
    const token = sessionManager.createSessionToken(mockCandidate.id, mockCandidate.trainingToken);
    expect(token).toBeDefined();

    const verified = sessionManager.verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.candidateId).toBe(mockCandidate.id);
    expect(verified?.trainingToken).toBe(mockCandidate.trainingToken);
  });

  it('rejects tampered session tokens', () => {
    const token = sessionManager.createSessionToken(mockCandidate.id, mockCandidate.trainingToken);
    const tampered = token.slice(0, -4) + 'abcd';
    expect(sessionManager.verifySessionToken(tampered)).toBeNull();
  });

  it('rejects expired session tokens', () => {
    // Session with negative TTL
    const expiredToken = sessionManager.createSessionToken(mockCandidate.id, mockCandidate.trainingToken, -10);
    expect(sessionManager.verifySessionToken(expiredToken)).toBeNull();
  });

  it('blocks BOLA / IDOR attacks when candidateId does not match session', async () => {
    // Attacker token is for candidate B
    const attackerToken = sessionManager.createSessionToken('candidate_attacker_999', 'token_attacker');

    const result = await candidateService.submitAssessment(
      {
        candidateId: mockCandidate.id, // Trying to submit for Kashish Rathore
        submissionUrl: 'https://github.com/attacker/repo',
        additionalUrls: [],
        notes: 'Malicious overwrite',
      },
      attackerToken
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.error).toContain('Session credentials do not match');
  });

  it('allows authorized submissions with matching session', async () => {
    const legitimateToken = sessionManager.createSessionToken(mockCandidate.id, mockCandidate.trainingToken);

    const result = await candidateService.submitAssessment(
      {
        candidateId: mockCandidate.id,
        submissionUrl: 'https://github.com/kashishrthr1/cynbit_assignment',
        additionalUrls: ['https://drive.google.com/file/d/audit-notes'],
        notes: 'Submitted full assessment solution.',
      },
      legitimateToken
    );

    expect(result.success).toBe(true);
    expect(result.data?.submittedAt).toBeDefined();
  });
});
