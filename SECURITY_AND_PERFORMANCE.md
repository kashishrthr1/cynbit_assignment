# Cynbit Technologies — Security & Performance Findings

**Author**: Kashish Rathore  
**Role Applied For**: Backend Developer Intern  
**Target Scope**: `https://www.cynbit.in`  
**Purpose**: Practical Technical Assessment — Security, Performance, and Data Validation Analysis

---

## 1. Quick Summary of Findings

To make these findings easy to evaluate, I've organized them by area, severity, and practical impact:

| Finding | Area | Severity | The Core Issue in Plain English |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Security | **High** | Candidate profile endpoint returns internal HR fields (notes, ratings, CTC, future onboarding tokens) over the wire. |
| **SEC-02** | Security | **Medium** | Candidate authentication uses naked tokens in the URL without a `Referrer-Policy`, risking token leakage via external links. |
| **SEC-03** | Security | **Medium** | Missing essential browser defense headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`). |
| **SEC-04** | Security | **Medium** | Overly permissive CORS (`Access-Control-Allow-Origin: *`) enabled on top-level pages and 404 responses. |
| **SEC-05** | Security | **Low** | Backend framework fingerprinting exposed via `X-Powered-By: Next.js`. |
| **PERF-01**| Performance | **High** | Edge traffic in Mumbai (`bom1`) proxies serverless execution to US-East (`iad1`), causing a ~200ms latency penalty. |
| **PERF-02**| Performance | **Medium** | Asynchronous payment status is checked via 180-second client-side polling rather than server webhooks. |
| **VAL-01** | Validation | **High** | Server action accepts `candidateId` as a client argument without server-side identity verification (BOLA risk). |
| **VAL-02** | Validation | **Low** | Assessment submission URL inputs lack strict HTTPS and domain protocol constraints. |

---

## 2. Security Findings (Detailed Analysis)

### SEC-01: Excessive Data Exposure (Broken Property Authorization)
* **OWASP / CWE Reference**: OWASP Top 10 API Security (API3:2023 - Broken Object Property Level Authorization), CWE-213.
* **What I Observed**:  
  When the candidate assessment page mounts, it calls the server action `fetchCandidateByCandidateToken`. The JSON payload received by the client contains the complete database row, including fields that should strictly stay inside the HR team's internal tools:
  * `internalNotes`: Reviewer comments and feedback.
  * `rating`: Internal rating number.
  * `assignedTo`: Recruiter / reviewer ID.
  * `offeredCtc`: Proposed salary or stipend numbers.
  * `rejectionReason`: Reason codes if an application is closed.
  * `onboardingToken`: The token to unlock downstream onboarding documents (`cmv6c050r000e04l3ocafykqn`), visible while the candidate is still in the assessment phase.
  * `activityLogs`: Full internal automated trigger history.
* **Why This Matters**:  
  Even if the React frontend does not render `internalNotes` on screen, any applicant or curious user can open their browser's Network tab and read the raw JSON response. This leaks sensitive internal decision-making, compensation structures, and future stage tokens.
* **How to Fix It**:  
  1. Do not use `prisma.candidate.findUnique({ include: { ... } })` directly in client-facing actions.
  2. Define an explicit `select` query with only UI-safe fields.
  3. Transform the database entity into a `PublicCandidateDTO` before sending it back across the wire.
  *(See implementation in `src/dal/candidate-dto.ts` and tests in `tests/dto-sanitization.test.ts`)*.

---

### SEC-02: Naked Token-in-URL Bearer Pattern & Referrer Token Leakage
* **CWE Reference**: CWE-598 (Information Exposure Through Query Strings / URL Path), CWE-200.
* **What I Observed**:  
  Access to the candidate portal relies entirely on an unexpiring token in the URL path:  
  `https://www.cynbit.in/candidate/cmv6c050r000d04l39fg2dix4`  
  On this page, there are external links (to LinkedIn profiles, Google Drive portfolio folders, and external resources). Noticeably, the HTTP response headers do **not** set a `Referrer-Policy`.
* **Why This Matters**:  
  By default, when a user clicks a regular link to an external website from that page, modern browsers may transmit the full originating URL in the HTTP `Referer` request header. This means the third-party website's access logs can capture the candidate's secret URL token. Anyone who obtains that URL can view the candidate's portal and submit tasks on their behalf.
* **How to Fix It**:  
  1. Immediately add `Referrer-Policy: strict-origin-when-cross-origin` to HTTP headers so only `https://www.cynbit.in` is sent to external sites.
  2. Exchange the single-use URL link on first visit for an `HttpOnly`, `SameSite=Lax` session cookie, so subsequent requests don't rely on raw URL tokens.

---

### SEC-03: Missing Critical HTTP Security Headers
* **CWE Reference**: CWE-1021 (Improper Restriction of Rendered UI Layers or Frames), CWE-693.
* **What I Observed**:  
  Checking response headers on `https://www.cynbit.in` showed:
  ```http
  Strict-Transport-Security: max-age=63072000
  Server: Vercel
  X-Powered-By: Next.js
  ```
  Notably missing:
  * `Content-Security-Policy` (CSP): No restrictions on where scripts, styles, or iframes can be loaded from.
  * `X-Frame-Options`: Absent, meaning the candidate portal could be embedded inside an `<iframe>` on a malicious site to perform clickjacking attacks on the submit button.
  * `X-Content-Type-Options: nosniff`: Absent, leaving the browser to guess MIME types.
* **How to Fix It**:  
  Configure these standard security headers in `next.config.js` or Next.js edge middleware.
  *(See implementation in `src/security/headers.ts`)*.

---

### SEC-04: Overly Permissive CORS Policy
* **CWE Reference**: CWE-942 (Permissive Cross-Domain Policy with Wildcard).
* **What I Observed**:  
  `Access-Control-Allow-Origin: *` is returned on root document requests and 404 pages.
* **Why This Matters**:  
  Wildcard CORS is useful for public CDNs hosting static fonts or images, but should not be enabled globally on application document routes and dynamic pages.
* **How to Fix It**:  
  Remove the wildcard header from top-level document routes, and restrict CORS to approved Cynbit domains.

---

## 3. Performance & Scalability Findings

### PERF-01: Cross-Continental Serverless Region Routing (`bom1` to `iad1`)
* **What I Observed**:  
  The Vercel trace header returned:  
  `X-Vercel-Id: bom1::iad1::nj5vz-1793525027672-f57d939e1e8d`
  * `bom1`: Vercel Edge Point of Presence in Mumbai, India.
  * `iad1`: Serverless function execution in Northern Virginia, USA.
* **Why This Matters**:  
  For an Indian candidate or client visiting a `.in` domain, their initial request reaches Mumbai in ~20ms. But because the serverless function is configured in `iad1`, Vercel proxies that request across the Atlantic Ocean (~180ms - 220ms RTT) just to run the backend handler and query the database.
  
  This adds an avoidable **~200ms baseline latency overhead** to every dynamic RSC page load, even before accounting for cold starts or database query execution time.
* **How to Fix It**:  
  Update `vercel.json` or page segment configs to deploy functions in `bom1` (Mumbai) or `sin1` (Singapore), colocated with the database:
  ```json
  {
    "regions": ["bom1"]
  }
  ```

---

### PERF-02: Client-Driven Polling for Asynchronous Payment Status
* **What I Observed**:  
  In client bundle `da5a6f561f8d3783.js`, payment checking runs a client-side timer:
  ```javascript
  let e = setInterval(async () => {
    let t = Math.max(0, 180 - Math.floor((Date.now() - W) / 1e3));
    let l = await d(j, s); // verifyCashfreePaymentStatus
    if (l.success) { ... }
  }, interval);
  ```
  The browser saves the order ID in `localStorage` and polls `verifyCashfreePaymentStatus` every few seconds for up to 3 minutes.
* **Why This Matters**:  
  1. Repeatedly invokes serverless functions during normal payment checkout, consuming compute execution quotas.
  2. Mobile browsers can throttle or suspend JavaScript timers when users switch to their UPI app (PhonePe, Google Pay, Paytm) to authorize payment, leading to failed UI updates upon return.
  3. Creates race conditions between client polling and server webhook processing.
* **How to Fix It**:  
  Rely on Cashfree's server-to-server webhook (`PAYMENT_SUCCESS_WEBHOOK`). Once Cashfree confirms payment, the server idempotently updates the database and unlocks enrollment.
  *(See implementation in `src/payments/cashfree-webhook.ts`)*.

---

## 4. Data Validation & Authorization Findings

### VAL-01: Mutable Identifier Binding in Server Actions (BOLA Risk)
* **What I Observed**:  
  Looking at how assessment submission is called from the client:
  ```javascript
  let t = await submitCandidateAssessment(N.id, submissionUrl, links, notes);
  ```
  Notice that `N.id` (`candidateId`) is passed explicitly as an argument from client state.
* **Why This Matters**:  
  In Next.js Server Actions, arguments coming from the browser can be modified by anyone with DevTools. If the backend action takes `candidateId` directly from the function argument without verifying that the caller's session owns that ID, an attacker could change `candidateId` and overwrite another candidate's submission (Broken Object Level Authorization / BOLA).
* **How to Fix It**:  
  Do not trust client-supplied candidate IDs. Derive the candidate identity strictly from the server-side session or validated HMAC token.
  *(See implementation in `src/actions/candidate-actions.ts`)*.

---

## 5. Automated Verification

All these issues and their fixes are backed by runnable unit tests in [`tests/`](./tests/):
- `tests/dto-sanitization.test.ts` — Asserts that internal notes, ratings, CTC, and onboarding tokens are completely stripped from DTO output.
- `tests/security-headers.test.ts` — Tests CSP, X-Frame-Options, HSTS, and CORS validation.
- `tests/session-auth.test.ts` — Verifies HMAC session signing and blocks BOLA identity spoofing.
- `tests/validation.test.ts` — Tests Zod URL schemas and injection prevention.
- `tests/webhook-idempotency.test.ts` — Tests Cashfree HMAC signature verification and replay prevention.

You can run all 19 tests anytime using `npm test`.
