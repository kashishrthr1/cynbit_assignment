# Cynbit Technologies — Security & Performance Findings

**Author / Candidate**: Kashish Rathore  
**Application Role**: Backend Developer Intern  
**Target Scope**: `https://www.cynbit.in`  
**Assessment Task**: Security, Performance, Data Validation, and Auth Findings

---

## 1. Findings Matrix

| ID | Category | Issue Name | OWASP / CWE | Severity | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Security | Broken Object Property Level Authorization (Excessive Data Exposure) | OWASP API3:2023 / CWE-213 | **High** | Observed |
| **SEC-02** | Security | Token-in-URL Bearer Pattern & Referrer Token Leakage | CWE-598 / CWE-200 | **Medium** | Observed |
| **SEC-03** | Security | Missing Critical HTTP Security Headers (Clickjacking & CSP) | CWE-1021 / CWE-693 | **Medium** | Observed |
| **SEC-04** | Security | Overly Permissive CORS Policy (`Access-Control-Allow-Origin: *`) | CWE-942 | **Medium** | Observed |
| **SEC-05** | Security | Server Technology Fingerprinting (`X-Powered-By`) | CWE-200 | **Low** | Observed |
| **PERF-01**| Performance | Cross-Continental Serverless Region Routing (`BOM1` to `IAD1`) | Latency / Architecture | **High** | Observed |
| **PERF-02**| Performance | Client-Driven Polling for Asynchronous Payment Status | Polling Anti-Pattern | **Medium** | Observed |
| **VAL-01** | Validation | Mutable Identifier Binding in Server Action Arguments (BOLA Risk) | OWASP API1:2023 / CWE-639 | **High** | Architectural Risk |
| **VAL-02** | Validation | Unrestricted Target Protocol on Client Submission Inputs | CWE-20 | **Low** | Observed |

---

## 2. Security Findings (Detailed Analysis)

### SEC-01: Excessive Data Exposure via Server Action Wire Protocol
* **Classification**: OWASP Top 10 API Security Risks (API3:2023 - Broken Object Property Level Authorization), CWE-213 (Exposure of Sensitive Information).
* **Observed Evidence**:
  In `fetchCandidateByCandidateToken`, the response payload includes:
  * `internalNotes`: Confidential internal evaluations.
  * `rating`: Internal numerical scoring.
  * `assignedTo`: Internal recruiter/engineer assignment.
  * `offeredCtc`: Sensitive remuneration proposals.
  * `rejectionReason`: Confidential pipeline status notes.
  * `onboardingToken`: The token to unlock downstream onboarding (`cmv6c050r000e04l3ocafykqn`), visible during the assessment stage.
  * `activityLogs`: Full internal automated trigger history (`actor: "Aria Automation Engine"`, timestamps, and action types).
* **Impact**: Candidates or external observers inspect sensitive HR decisions, remuneration metrics, and internal process logic before authorized stages.
* **Remediation**:
  1. Enforce strict Prisma projections (`select: { ... }`) at the repository boundary.
  2. Map database records to a decoupled `PublicCandidateDTO`.
  3. Implement automated test assertions ensuring sensitive fields never exist in serialized output (see [`tests/dto-sanitization.test.ts`](./tests/dto-sanitization.test.ts)).

---

### SEC-02: Naked Token-in-URL Bearer Pattern & Referrer Leakage
* **Classification**: CWE-598 (Use of GET Request Method With Sensitive Query Strings/Path), CWE-200.
* **Observed Evidence**:
  Authentication to the candidate portal relies entirely on an unexpiring path parameter:
  `https://www.cynbit.in/candidate/cmv6c050r000d04l39fg2dix4`
  The page displays external hyperlinks to LinkedIn profiles, Google Drive files, and third-party resources. The HTTP response headers **omit** `Referrer-Policy`.
* **Impact**:
  When a candidate clicks any external link from their portal page, standard browser behavior transmits the full URL (including the secret token) in the HTTP `Referer` header to the destination server. Anyone with access to the destination server logs can access the candidate portal.
* **Remediation**:
  1. Set `Referrer-Policy: strict-origin-when-cross-origin` on all responses.
  2. Exchange the URL invitation token for a signed, HttpOnly session cookie on the first visit.

---

### SEC-03: Missing Critical HTTP Security Headers
* **Classification**: CWE-1021 (Improper Restriction of Rendered UI Layers or Frames), CWE-693 (Protection Mechanism Failure).
* **Observed Headers**:
  ```http
  Strict-Transport-Security: max-age=63072000
  Server: Vercel
  X-Powered-By: Next.js
  ```
  Missing headers:
  * `Content-Security-Policy` (CSP): No restrictions on script execution domains.
  * `X-Frame-Options: DENY`: Allows malicious third-party sites to frame `/candidate/[token]` inside an `<iframe>` for clickjacking attacks.
  * `X-Content-Type-Options: nosniff`: Leaves MIME-type sniffing active.
  * `Permissions-Policy`: Camera, microphone, and geolocation features are unconstrained.
* **Remediation**:
  Configure comprehensive security headers in `next.config.js` (see [`src/security/headers.ts`](./src/security/headers.ts)).

---

### SEC-04: Overly Permissive CORS on Document & API Routes
* **Classification**: CWE-942 (Permissive Cross-Domain Policy with Wildcard).
* **Observed Evidence**:
  `Access-Control-Allow-Origin: *` is returned on root (`/`) and 404 responses.
* **Impact**:
  Exposes document endpoints and error states to arbitrary origin requests.
* **Remediation**:
  Restrict CORS origins dynamically to Cynbit domains using an explicit origin allowlist.

---

### SEC-05: Server Technology Fingerprinting
* **Classification**: CWE-200 (Information Exposure).
* **Observed Evidence**:
  `X-Powered-By: Next.js` header is explicitly returned.
* **Remediation**:
  Add `poweredByHeader: false` in `next.config.js`.

---

## 3. Performance & Scalability Findings

### PERF-01: Cross-Continental Region Routing (India to US-East)
* **Observed Evidence**:
  Header `X-Vercel-Id: bom1::iad1::nj5vz-...` demonstrates that:
  1. The client connects to Vercel's Mumbai Edge (`bom1`).
  2. The Serverless Function executes in Vercel's Northern Virginia region (`iad1`).
  3. Any database or third-party call executes in North America.
* **Latency Penalty**:
  * Roundtrip time between Mumbai and Virginia is typically **~180–220ms**.
  * Dynamic RSC hydration (`X-Vercel-Cache: MISS`) experiences an avoidable ~200ms TTFB floor before compute even starts.
* **Remediation**:
  Configure the Serverless Function runtime region in `vercel.json` or route segment configs:
  ```json
  {
    "regions": ["bom1", "sin1"]
  }
  ```
  Colocate the primary PostgreSQL database in `ap-south-1` (Mumbai).

---

### PERF-02: Client-Driven Polling for Asynchronous Payment Status
* **Observed Evidence**:
  Inspection of candidate chunk `da5a6f561f8d3783.js` shows:
  ```javascript
  let e = setInterval(async () => {
    let t = Math.max(0, 180 - Math.floor((Date.now() - W) / 1e3));
    let l = await d(j, s); // verifyCashfreePaymentStatus(token, orderId)
    if (l.success) { ... }
  }, interval);
  ```
  The browser stores a pending order ID in `localStorage` and continuously polls `verifyCashfreePaymentStatus` for 180 seconds.
* **Architectural Drawbacks**:
  * Unnecessary Serverless function invocations during normal payment flows.
  * Battery and data drain on mobile devices.
  * Race conditions between client polling and backend webhook delivery.
* **Remediation**:
  Rely on Cashfree's asynchronous Server-to-Server Webhook (`PAYMENT_SUCCESS_WEBHOOK`) with HMAC-SHA256 signature verification and database idempotency keys (see [`src/payments/cashfree-webhook.ts`](./src/payments/cashfree-webhook.ts)).

---

## 4. Data Validation & Authorization Findings

### VAL-01: Mutable Identifier in Server Action Arguments (BOLA Risk)
* **Observed Evidence**:
  Client submission call:
  ```javascript
  let t = await submitCandidateAssessment(N.id, submissionUrl, links, notes);
  ```
  Notice that `N.id` (`candidateId`) is passed explicitly from the client bundle as an argument to the Server Action.
* **Vulnerability Analysis**:
  In Next.js Server Actions, arguments passed from the client must be treated as untrusted user input. If the backend Server Action does not cross-check whether the authenticated session/token owns `candidateId`, a candidate could submit assignments on behalf of another applicant simply by altering `N.id`.
* **Remediation**:
  Derive the `candidateId` strictly from the server-side session or validated HMAC token on the backend rather than trusting client-provided ID arguments.

---

## 5. Verification & Test Evidence

All identified issues have been modeled with automated unit and regression tests in this repository:
* `tests/dto-sanitization.test.ts` (3 tests passed)
* `tests/security-headers.test.ts` (2 tests passed)
* `tests/session-auth.test.ts` (5 tests passed)
* `tests/validation.test.ts` (6 tests passed)
* `tests/webhook-idempotency.test.ts` (3 tests passed)

Total: **19 automated tests passing** validating the proposed security and performance fixes.
