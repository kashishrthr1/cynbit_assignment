# Cynbit Technologies — Backend Technical Audit & Architectural Optimization

[![Test Suite](https://img.shields.io/badge/tests-19%20passed-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%E2%89%A520-green.svg)]()
[![Security Audit](https://img.shields.io/badge/OWASP-API3%3A2023%20Remediated-success.svg)]()

> **Applicant**: Kashish Rathore  
> **Role**: Backend Developer Intern  
> **Task**: Practical Technical Assessment — *Analyze Cynbit From a Backend Perspective*  
> **Deadline**: Mon, Nov 2, 09:12 AM  
> **Candidate Portal**: `https://www.cynbit.in/candidate/cmv6c050r000d04l39fg2dix4`

---

## 📌 Executive Overview

This repository delivers an end-to-end backend technical audit and engineering enhancement suite for **Cynbit Technologies** (`https://www.cynbit.in`), analyzed strictly through passive, authorized, non-intrusive observation.

### Assessment Deliverables Summary

1. [**`AUDIT_REPORT.md`**](./AUDIT_REPORT.md): Complete backend architectural deconstruction covering Next.js App Router RSC wire protocol, Vercel Serverless runtime topologies, discovered Server Action hashes, and data over-fetching analysis.
2. [**`SECURITY_AND_PERFORMANCE.md`**](./SECURITY_AND_PERFORMANCE.md): Categorized findings matrix covering OWASP API3:2023 (Excessive Data Exposure), missing browser security headers, token-in-URL referrer leakage, cross-continental serverless latency (`bom1` to `iad1`), and payment polling bottlenecks.
3. [**`RECOMMENDATIONS.md`**](./RECOMMENDATIONS.md): Architectural solutions and drop-in code implementations covering Next.js security headers, decoupled DTO projections, Zod schema validation, HMAC-signed session management, and idempotent Cashfree webhook processing.

---

## 🏗️ Repository Architecture

```
.
├── AUDIT_REPORT.md                 # Deliverable 1: Backend Technical Audit Report
├── SECURITY_AND_PERFORMANCE.md     # Deliverable 2: Security & Performance Findings
├── RECOMMENDATIONS.md              # Deliverable 3: Recommended Improvements & Architectural Specs
├── package.json                    # Project definition & scripts
├── tsconfig.json                   # Strict TypeScript compiler config
├── vitest.config.ts                # Automated test runner configuration
├── scripts/
│   └── passive-audit-probe.ts      # Live passive probe tool to verify response headers & telemetry
├── src/
│   ├── actions/
│   │   └── candidate-actions.ts    # Hardened Server Actions with session binding & BOLA prevention
│   ├── dal/
│   │   ├── candidate-dto.ts        # Data Access Layer & strict Prisma field projections
│   │   └── types.ts                # Domain entity vs Public DTO type contracts
│   ├── security/
│   │   ├── headers.ts              # Production HTTP security headers & CORS policy
│   │   └── session.ts              # Sealed HMAC-SHA256 candidate session management
│   ├── validation/
│   │   └── schemas.ts              # Strict Zod schemas for candidate inputs and tickets
│   └── payments/
│       └── cashfree-webhook.ts     # Idempotent Cashfree webhook processor with signature check
└── tests/
    ├── dto-sanitization.test.ts    # 3 tests: Guarantees zero leakage of internal notes/CTC/tokens
    ├── security-headers.test.ts    # 2 tests: Validates CSP, XFO, nosniff, and CORS isolation
    ├── session-auth.test.ts        # 5 tests: Verifies HMAC signing, expiration, and BOLA blocking
    ├── validation.test.ts          # 6 tests: Verifies URL schemas, injection defense, and input limits
    └── webhook-idempotency.test.ts # 3 tests: Verifies Cashfree HMAC-SHA256 & replay defense
```

---

## ⚡ Quick Start & Verification

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/kashishrthr1/cynbit-backend-audit.git
cd cynbit-backend-audit

# Install dependencies
npm install --legacy-peer-deps
```

### 2. Run Automated Test Suite
```bash
# Executes 19 unit & security tests with Vitest
npm test
```

### 3. Typecheck Codebase
```bash
# Validates TypeScript types across src, tests, and scripts
npm run build
```

### 4. Run Passive Audit Probe
```bash
# Non-intrusively probes cynbit.in to verify observable headers and serverless telemetry
npm run audit:probe
```

---

## 🔍 Key Findings Highlights

| Area | Observation | Impact | Solution |
| :--- | :--- | :--- | :--- |
| **Data Exposure** | `fetchCandidateByCandidateToken` returns internal HR notes, rating, assignedTo, offeredCtc, and onboarding tokens. | Sensitive company data visible in client RSC payloads. | Implemented `candidatePortalSelect` Prisma projection and `PublicCandidateDTO`. |
| **Security Headers** | Missing CSP, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. | Clickjacking exposure; candidate secret URL token leaks via HTTP `Referer`. | Configured strict CSP, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`. |
| **Regional Latency** | Edge POP in Mumbai (`bom1`) forwards dynamic functions to Virginia (`iad1`). | ~200ms added latency floor on every dynamic page load. | Colocate Serverless Function execution in `bom1` (Mumbai). |
| **Payment Flow** | Client polls `verifyCashfreePaymentStatus` for 180s in `localStorage`. | Unnecessary compute invocations, client battery drain, race conditions. | Implemented idempotent, HMAC-SHA256 verified server webhook handler. |

---

## 👤 Author Information

* **Candidate**: Kashish Rathore
* **Degree**: B.Tech / B.E. (Computer Science), Madhav Institute of Technology and Science (MITS)
* **Email**: `kashishrathoreo110@gmail.com`
* **LinkedIn**: [linkedin.com/in/kashishh-rathore](https://www.linkedin.com/in/kashishh-rathore)
* **GitHub**: [@kashishrthr1](https://github.com/kashishrthr1)
