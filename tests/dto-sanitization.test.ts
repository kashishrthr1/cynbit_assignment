import { describe, it, expect } from 'vitest';
import { toPublicCandidateDTO, assertNoSensitiveDataLeaks } from '../src/dal/candidate-dto.js';
import { InternalCandidateEntity } from '../src/dal/types.js';

describe('Data Access Layer & DTO Sanitization', () => {
  const mockInternalCandidate: InternalCandidateEntity = {
    id: 'cmv6c050r000c04l3crjsb348',
    fullName: 'Kashish Rathore',
    email: 'kashishrathoreo110@gmail.com',
    phone: '+916263773348',
    currentCity: 'Gwalior',
    dob: new Date('2003-10-01'),
    gender: 'Female',
    linkedinUrl: 'https://www.linkedin.com/in/kashishh-rathore',
    portfolioUrl: 'https://drive.google.com/file/d/example',
    whatsapp: '6263773348',
    agreedToTerms: true,
    education: 'B.Tech CS - MITS Gwalior',
    graduationYear: '2027',
    skills: 'Node.js, Python, PostgreSQL, Next.js',
    university: 'Madhav Institute of Technology and Science',
    jobId: 'backend-developer-intern',
    
    // Highly sensitive internal evaluation data
    status: 'ASSESSMENT',
    rating: 4,
    internalNotes: 'Strong algorithmic skills, fast learner, high potential candidate.',
    assignedTo: 'Mohak Saini',
    interviewDate: null,
    offeredCtc: '35,000 INR/month',
    joiningDate: null,
    rejectionReason: null,
    assessmentScore: 92,
    assessmentFeedback: 'Excellent backend technical architecture.',
    
    // Assessment state
    assessmentTitle: 'Backend Developer Intern - Task — Analyze Cynbit From a Backend Perspective',
    assessmentPrompt: 'Analyze Cynbit website from a backend developer perspective.',
    assessmentDeadline: new Date(Date.now() + 86400000),
    assessmentSubmittedAt: null,
    assessmentSubmissionUrl: null,
    assessmentSubmissionLinks: [],
    assessmentNotes: null,
    trainingToken: 'cmv6c050r000d04l39fg2dix4',
    trainingFeeOriginal: '3999',
    trainingFeeScholarship: '1999',
    scholarshipDiscountPct: 50,
    paymentStatus: 'UNPAID',
    
    // Internal onboarding & provisioning tokens
    onboardingToken: 'cmv6c050r000e04l3ocafykqn',
    activationTokenHash: 'd41d8cd98f00b204e9800998ecf8427e',
    ndaIpAddress: '103.212.14.88',
    ndaUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    digitalSignature: 'Kashish Rathore Sign',
    
    activityLogs: [
      {
        id: 'cmvw6naq8001608kzvhi5dtni',
        actor: 'Aria Automation Engine',
        action: 'AUTO_ASSESSMENT_ASSIGNED',
        details: 'Assessment assigned',
        createdAt: new Date(),
      },
    ],
  };

  it('correctly maps public candidate fields to DTO', () => {
    const dto = toPublicCandidateDTO(mockInternalCandidate);
    expect(dto.id).toBe(mockInternalCandidate.id);
    expect(dto.fullName).toBe('Kashish Rathore');
    expect(dto.email).toBe('kashishrathoreo110@gmail.com');
    expect(dto.assessment.title).toBe(mockInternalCandidate.assessmentTitle);
    expect(dto.payment.status).toBe('UNPAID');
    expect(dto.payment.feeAmount).toBe('1999');
  });

  it('guarantees zero leakage of internal notes, CTC, ratings, or onboarding tokens', () => {
    const dto = toPublicCandidateDTO(mockInternalCandidate);
    const rawDto = dto as unknown as Record<string, unknown>;

    // Ensure prohibited internal keys do not exist on the DTO
    expect(assertNoSensitiveDataLeaks(rawDto)).toBe(true);
    expect(rawDto['internalNotes']).toBeUndefined();
    expect(rawDto['rating']).toBeUndefined();
    expect(rawDto['assignedTo']).toBeUndefined();
    expect(rawDto['offeredCtc']).toBeUndefined();
    expect(rawDto['rejectionReason']).toBeUndefined();
    expect(rawDto['assessmentScore']).toBeUndefined();
    expect(rawDto['onboardingToken']).toBeUndefined();
    expect(rawDto['activationTokenHash']).toBeUndefined();
    expect(rawDto['activityLogs']).toBeUndefined();
  });

  it('throws an error if an un-sanitized internal payload is passed to the leak assertion guard', () => {
    const unSanitizedPayload = {
      ...mockInternalCandidate,
    } as unknown as Record<string, unknown>;

    expect(() => assertNoSensitiveDataLeaks(unSanitizedPayload)).toThrow(
      /Data Leak Violation: Field 'internalNotes' must not be exposed/
    );
  });
});
