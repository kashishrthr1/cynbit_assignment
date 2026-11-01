# Cynbit Technologies — Backend Technical Audit & Improvements

[![Test Suite](https://img.shields.io/badge/tests-19%20passed-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%E2%89%A520-green.svg)]()

> **Applicant**: Kashish Rathore  
> **Role Applied For**: Backend Developer Intern  
> **Challenge**: Practical Technical Assessment — *Analyze Cynbit From a Backend Perspective*  
> **Submission Deadline**: Mon, Nov 2, 09:12 AM  
> **Candidate Portal**: `https://www.cynbit.in/candidate/cmv6c050r000d04l39fg2dix4`

---

## 💡 About This Project

This repository contains my end-to-end technical analysis of Cynbit's platform (`https://www.cynbit.in`) and candidate lifecycle portal (`/candidate/[token]`) from a backend engineering perspective.

All analysis was conducted strictly via **passive, authorized observation** (inspecting public response headers, React Server Components wire protocol data, network latencies, and client JS bundles). No active penetration testing or invasive attacks were performed.

In addition to documenting findings, I wrote **working TypeScript implementations** and **19 automated unit tests** to show exactly how I would resolve each issue if I were working on Cynbit's engineering team.

---

## 📂 The Three Required Deliverables

1. [**`AUDIT_REPORT.md`**](./AUDIT_REPORT.md)  
   **Backend Technical Audit Report**: Architectural breakdown of Cynbit's Next.js App Router stack, Vercel Serverless routing, discovered Server Action hashes, and network data flows.

2. [**`SECURITY_AND_PERFORMANCE.md`**](./SECURITY_AND_PERFORMANCE.md)  
   **Security & Performance Findings**: Detailed analysis of excessive data exposure (OWASP API3:2023), missing browser security headers, URL token leakage risks, cross-continental serverless latency (`bom1` to `iad1`), and client-side payment polling.

3. [**`RECOMMENDATIONS.md`**](./RECOMMENDATIONS.md)  
   **Recommended Improvements**: Production-ready architectural blueprints and code solutions covering strict DTO projections, Next.js security headers, Zod schemas, HMAC session management, and idempotent webhooks.

---

## 🔍 Key Findings at a Glance

| What I Found | Why It Matters | How I Fixed It |
| :--- | :--- | :--- |
| **Over-fetching on Candidate Profile** | `fetchCandidateByCandidateToken` returns internal HR notes, rating, assigned recruiter, offered CTC, and future onboarding tokens. | Implemented database-level `select` projection and a decoupled `PublicCandidateDTO`. |
| **Missing Security Headers** | Missing CSP, `X-Frame-Options`, and `Referrer-Policy`. Risks clickjacking and URL token leakage when clicking external portfolio links. | Configured strict security headers in `next.config.js`. |
| **Cross-Continental Latency** | Edge POP in Mumbai (`bom1`) proxies dynamic execution to US-East (`iad1`), adding ~200ms of avoidable latency. | Colocate serverless execution in Mumbai (`bom1`). |
| **Payment Polling Anti-Pattern** | Browser polls `verifyCashfreePaymentStatus` for 180s via `localStorage` timers. | Replaced with an idempotent, HMAC-SHA256 verified server webhook handler. |

---

## 🛠️ Repository Structure

```
.
├── AUDIT_REPORT.md                 # Deliverable 1: Backend Technical Audit Report
├── SECURITY_AND_PERFORMANCE.md     # Deliverable 2: Security & Performance Findings
├── RECOMMENDATIONS.md              # Deliverable 3: Recommended Improvements & Code
├── package.json                    # Project configuration & npm scripts
├── tsconfig.json                   # Strict TypeScript compiler config
├── vitest.config.ts                # Vitest test runner configuration
├── scripts/
│   └── passive-audit-probe.ts      # Reproducible CLI script to inspect headers & telemetry
├── src/
│   ├── actions/
│   │   └── candidate-actions.ts    # Secure Server Actions with BOLA prevention
│   ├── dal/
│   │   ├── candidate-dto.ts        # Prisma select projections & clean DTO mapping
│   │   └── types.ts                # Internal Entity vs Public DTO types
│   ├── security/
│   │   ├── headers.ts              # Production security headers & dynamic CORS
│   │   └── session.ts              # Sealed HMAC-SHA256 candidate sessions
│   ├── validation/
│   │   └── schemas.ts              # Zod validation schemas for inputs & submissions
│   └── payments/
│       └── cashfree-webhook.ts     # Idempotent Cashfree webhook processor
└── tests/
    ├── dto-sanitization.test.ts    # Verifies internal notes, CTC & tokens never leak
    ├── security-headers.test.ts    # Verifies CSP, X-Frame-Options, and CORS isolation
    ├── session-auth.test.ts        # Verifies HMAC tokens, TTL, and BOLA blocking
    ├── validation.test.ts          # Verifies URL validation & injection protection
    └── webhook-idempotency.test.ts # Verifies Cashfree HMAC verification & replay defense
```

---

## 🚀 Running the Tests & Code Locally

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run the Automated Test Suite (19 tests)
```bash
npm test
```

### 3. Verify TypeScript Types
```bash
npm run build
```

### 4. Run the Passive Audit Probe
```bash
npm run audit:probe
```

---

## 👩‍💻 Author & Contact

* **Applicant**: Kashish Rathore
* **College**: Madhav Institute of Technology and Science (MITS), Gwalior
* **Major**: B.Tech / B.E. in Computer Science Engineering (Graduation: 2027)
* **Email**: `kashishrathoreo110@gmail.com`
* **LinkedIn**: [linkedin.com/in/kashishh-rathore](https://www.linkedin.com/in/kashishh-rathore)
* **GitHub**: [@kashishrthr1](https://github.com/kashishrthr1)
