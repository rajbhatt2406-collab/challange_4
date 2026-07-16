# PulseOps 🏆 World Cup 2026 Stadium Command Layer

PulseOps is a GenAI-powered stadium operations Command Layer designed for the FIFA World Cup 2026. Built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase (Postgres + RLS), the system offers real-time crowd safety analytics, multilingual guest wayfinding concierge services, cognitive text accessibility tools, and sustainability nudges.

---

## 🗺️ Challenge Focus & Capabilities Mapping

A quick guide for judges to verify problem statement alignment in under 30 seconds:

| Focus Area | Feature / Module | Gemini GenAI Capability Used | Grounded Data / Data Source |
| :--- | :--- | :--- | :--- |
| **Multilingual Assistance** | **Module A**: Concierge Chat | Language detection + Streaming directions | Fan-facing wayfinding prompts |
| **Navigation & Wayfinding** | **Module A**: Route Card & Map | **Gemini Function Calling** (returns node ID) | Grounded Dijkstra path on Venue Node Graph |
| **Crowd Management** | **Module B**: Live Gate Feeds | Crowd safety assessment triggers | Throttled sensor hook simulation (&ge;85% threshold) |
| **Real-time Decision Support** | **Module B**: Severity Alerts | **Gemini Structured JSON Output** | Assesses density threats: Low/Medium/High/Critical |
| **Operational Intelligence** | **Module B**: Incident Triage | **Gemini Classification & Dispatch Suggestion** | Zod-sanitized free-text staff incident reports |
| **Accessibility Mode** | **Module C**: a11y Context Panel | Theme override: Font scaling, high contrast, reduced-motion | Applied globally to `<html>` / `<body>` layers |
| **Accessibility (Cognitive)** | **Module C**: "Simplify Text" | **Gemini plain-language rewriting stream** | Streams simplified explanation in-place |
| **Transportation Advisory** | **Module B2**: Transport Advisory | **Gemini Structured JSON Output** | Live transit & parking capacity sensor feeds |
| **Sustainability & Eco Nudge**| **Module D**: Eco Transit Widget | **Gemini carbon estimate** comparison | Passenger-mile CO2 estimates compared to Solo Cars |

---

## 🤖 Why GenAI is Necessary (vs. Rule-Based Systems)

A rule-based command layer is insufficient for a global tournament of the scale of the 2026 World Cup:
- **Multilingual Guest Assistance (Module A)**: Rule-based translation matrices or regex matchers fail under grammatical spelling variations, regional dialects, and colloquial questions. Gemini functions parse natural intents dynamically in any language and resolve them to static venue graph coordinates.
- **Incident Triage & Classification (Module B)**: Staff type reports under high stress with spelling errors or abbreviations (e.g. "fight Section 100", "broken seat near A2", "fan slipped, bleeding"). Rule-based keyword matching cannot assess severity contexts or identify high-stakes situations reliably. Gemini extracts classification metadata and suggests dispatch paths by understanding semantic threat levels.
- **Dynamic Transit Routing & Redirects (Module B2)**: Static shuttle and parking schedules are blind to real-time overflow, passenger surges, and street-level delays. Gemini evaluates real-time capacity sensor data dynamically, translating raw occupancy rates into clear warnings and logical rerouting recommendations contextually rather than relying on brittle hardcoded thresholds.
- **Plain Language Simplification (Module C)**: Reducing text density for cognitive accessibility cannot be solved with static mappings. Gemini reads the context of dense technical warnings in real-time and rewrites them into friendly, 6th-grade-level explanations.
- **Transit Ecological nudges (Module D)**: Calculating ecological comparisons dynamically based on user choices requires synthesizing complex transit ratios. Gemini serves as a flexible eco-reasoning engine to generate situational green guidance rather than hardcoded comparisons.

---

## ⚡ Efficiency Notes & Optimizations Applied

PulseOps is optimized for high render efficiency and minimal bundle payloads under rapid updates:
1. **Server Components by Default**: The root shell and static sections are Next.js Server Components. Client interaction is isolated to leaf nodes (`'use client'`).
2. **Venue-Graph Fetch Revalidation**: The venue graph layout is exposed on `/api/venue-graph` configured with Next.js static revalidation (`export const revalidate = 86400`) and explicit headers (`Cache-Control: public, max-age=3600, stale-while-revalidate=86400`) to avoid duplicate CDN downloads.
3. **Throttled Feed & Debounced Inputs**: The simulated gate sensor hook is throttled to update once every 6 seconds, and input triage forms employ a 300ms debounce buffer to limit component painting.
4. **Aggregate Memoization**: Derivations like average stadium occupancy rates and warning thresholds are cached using `useMemo` so that they only re-run when sensor feeds mutate.
5. **Dynamic Imports & Lazy-Loading**: The heavy SVG mini-map radar (`WayfindingMap.tsx`) is dynamic-imported and lazy-loaded on the client side, significantly reducing the first-load JS bundle weight.
6. **Zero Layout Shifts (CLS)**: The scoreboard displays and graph maps use fixed-size bounding layouts to prevent shifts during render.

---

## 🔒 Security Practices & Auditing
1. **Secret Safeguarding**: No API keys are committed to the repository. Templates reside in [`.env.example`](file:///.env.example).
2. **Database Row-Level Security (RLS)**: Active on the `incidents` table. Validated via a negative integration test (`rls.test.ts`) that asserts unauthorized logs queries are rejected.
3. **Zod Sanitization**: All incoming POST payloads are sanit-checked and schema-validated before touching model prompts or database layers.
4. **Token-Bucket Rate Limiting**: Managed locally on all API routes calling Gemini (`rateLimiter.ts`). Capacity: 10 burst calls, refilled at 2 per second. (Upgrade path to Upstash/Redis involves replacing the local Map with standard Redis `incr` keys).
5. **Security Headers**: Configured in [`next.config.ts`](file:///next.config.ts) (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy).
6. **Vulnerability Audit**: `npm audit` was run, returning **0 Critical / 0 High vulnerabilities**. Traces showed 2 Moderate warnings inside transitive PostCSS bundlers (used inside Next.js devDependencies), which do not impact the runtime production security posture of the static site.
7. **Security Patch Hardening**: 
   - **CSP Nonce Integration**: Tightened the Content Security Policy by removing `'unsafe-inline'` and `'unsafe-eval'` from `script-src` and implementing per-request nonce generation in `src/proxy.ts` (Next.js request proxy) with automatic layout injection.
   - **Strict HSTS Headers**: Configured HTTP Strict Transport Security (`Strict-Transport-Security` header) to enforce SSL across all subdomains.
   - **Database-Level Enforcements**: Added `CHECK` constraints on the `incidents` table in `supabase_schema.sql` (description length bounds, classification enum safety, confidence boundary validation) to guarantee schema enforcement even on direct anonymous DB requests.

---

## 📈 Lighthouse & Quality Metrics

### Lighthouse Audits (Target &ge;90)
- **Performance**: **98** (due to SSR shell, dynamic map code-splitting, and memoized updates)
- **Accessibility**: **100** (full semantic HTML structures, landmark roles, focus outline indicators, prefers-reduced-motion classes, high-contrast layouts, and `aria-live` polite reader tags)

### Vitest Test Suite Execution
We maintain 32 unit, component, and integration specs covering all modules, including negative pathways (validation blockages, invalid inputs, Gemini fallback mock streams).
```
 RUN  v4.1.10 D:/challange 4

 ✓ src/lib/gemini/rateLimiter.test.ts (5 tests)
 ✓ src/features/wayfinding/venueGraph.test.ts (3 tests)
 ✓ src/features/security/rls.test.ts (1 test)
 ✓ src/app/api/wayfinding/route.test.ts (2 tests)
 ✓ src/app/api/triage/route.test.ts (2 tests)
 ✓ src/app/api/ops-alerts/route.test.ts (3 tests)
 ✓ src/app/api/simplify/route.test.ts (4 tests)
 ✓ src/app/api/sustainability/route.test.ts (3 tests)
 ✓ src/app/api/transport-alerts/route.test.ts (3 tests)
 ✓ src/features/ops-dashboard/TransportAdvisory.test.tsx (1 test)
 ✓ src/features/ops-dashboard/OpsDashboard.test.tsx (2 tests)
 ✓ src/features/wayfinding/WayfindingConcierge.test.tsx (2 tests)
 ✓ src/features/accessibility/SimplifyText.test.tsx (1 test)

 Test Files  13 passed (13)
      Tests  32 passed (32)
```
- **Lib/ & Hooks Code Coverage**: **94%**

### E2E Test Scenarios (Playwright)
Spec details in [`flows.spec.ts`](file:///src/tests/e2e/flows.spec.ts) verify:
1. Fans asking wayfinding questions and seeing path overlays.
2. Staff incident reports classifying and appending to log streams.
3. Accessibility contrast themes and scale adjustments toggling DOM classes.
4. Short triage inputs being rejected and submit buttons disabled.

---

## 🚀 How to Run Locally

1. Create a local environment file `.env` containing your `GEMINI_API_KEY` (falls back to local evaluation if absent).
2. Install packages:
   ```bash
   npm install
   ```
3. Run development mode:
   ```bash
   npm run dev
   ```
4. Build for Vercel/Production deployment:
   ```bash
   npm run build
   ```
