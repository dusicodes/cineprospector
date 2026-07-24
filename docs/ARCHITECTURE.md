# CineProspector Architecture

## Purpose and scope

CineProspector is an AI-powered client acquisition and conversion platform for
a freelance cinematographer. Its long-term purpose is to help the filmmaker
discover prospects, qualify them, develop evidence-based creative opportunities,
conduct approved outreach, manage conversations, and convert suitable leads
into clients without removing human control over contact or commercial terms.

The application will be one modular Next.js monolith with Supabase-hosted
PostgreSQL accessed through Prisma, and Supabase Auth for authentication. The
five agents described here are
application modules with explicit inputs and outputs; they are not independent
microservices, autonomous infrastructure, or a reason to introduce queues now.

Supabase Auth is the sole authentication authority. The foundation supports
email/password and two OAuth providers — Google and Apple — so the product is
sign-in-ready for a future customer-facing launch. OAuth flows use Supabase's
PKCE sign-in with a single authoritative callback (`/auth/confirm`); no provider
credentials are exposed to the browser. Enabling and configuring each provider
is a Supabase dashboard task, not an application code task.

The MVP may initially be used by one filmmaker, but every application-owned
record is designed to belong to an authenticated user. The current foundation
implements an authenticated workspace and profile record; it does not yet
implement agents, leads, or AI workflows.

## Architectural principles

- Design for the complete prospect-to-client journey, while implementing only
  the smallest useful workflow at each phase.
- Keep UI, workflow orchestration, domain agents, persistence, and provider
  integrations separate. UI and agents must not call a vendor SDK directly.
- Treat user input, public-web content, incoming client messages, and AI output
  as untrusted data. Validate structured output and retain its evidence.
- AI may recommend and draft. The user alone approves prospects for deeper
  research, outreach, commercial terms, and contract sending.
- Do not state that a business definitely needs video. Record observed facts,
  evidence, explicitly labelled inference, and confidence separately.
- Preserve durable, auditable state rather than relying on prompt history or
  browser state. Channel, conversation, and contract state must not be inferred
  from a single lead status.

## System architecture

```text
Browser: Next.js pages and review workspace
        |
        | Server Actions for first-party mutations
        | Route Handlers for future webhooks/external APIs
        v
Application services and workflow orchestrators
  ├─ Prospecting / qualification
  ├─ Research and creative analysis
  ├─ Outreach review, approval, and delivery
  └─ Conversation, deal, and contract review (future)
        |
        +--------------------+-------------------+------------------+
        |                    |                   |                  |
        v                    v                   v                  v
  Five domain agents    Prisma repositories  AIProvider       Channel/source
  (typed modules)              |              abstraction       adapters
        |                       v                   |            (future)
        |             Supabase PostgreSQL            v
        |                                      OllamaProvider
        |                                  [later: cloud providers]
        v
Validated results, evidence, activities, and approval records
```

Supabase has two intentionally separate responsibilities: it hosts PostgreSQL
and provides authentication. Prisma is the sole application database ORM,
schema, migration, and query layer; the application does not use Supabase's
database client APIs for domain data access. Supabase Auth owns the authenticated
session, which Next.js verifies on the server before workspace access.

Authentication providers are configured in the Supabase dashboard, not in
application code. The foundation supports email/password plus Google and Apple
as OAuth providers. All provider flows terminate at the single `/auth/confirm`
callback; the application never stores provider access tokens, refresh tokens,
or provider client secrets. The application Profile row is keyed by the
Supabase Auth user UUID regardless of which provider created the identity.

## Development and deployment architecture

```text
Development
Local Next.js application -> Prisma -> Supabase PostgreSQL
Local Next.js application -> Supabase Auth
Local Next.js application -> Ollama running locally

Future production
Deployed Next.js application -> Prisma -> Supabase PostgreSQL
Deployed Next.js application -> Supabase Auth
```

Local development uses the remotely hosted Supabase database; no local
PostgreSQL service is required. Runtime Prisma traffic uses Supabase's pooled
connection URL, while Prisma migrations/introspection use its direct connection
URL. Ollama remains the initial local runtime AI provider and is independent of
Supabase and authentication. Hosting Ollama or choosing a production AI provider
is a separate future decision.

Use Server Components for reads/page composition and Server Actions for
first-party create, edit, generation, and approval interactions. Every Server
Action is reachable as a POST endpoint, so it must validate input and, once
authentication exists, enforce authorization. Keep Route Handlers under
`src/app/api` for webhooks and external integrations; do not build a parallel
REST API solely for the web UI.

The MVP runs AI workflows synchronously with clear pending/error UI. Persist an
`AiRun` when a run begins and complete/fail it explicitly. A later job runner
can call the same application service if longer work or integrations justify
one; it must not change the agent or data model contracts.

## Long-term flow and human gates

```text
Prospector -> user approves prospect -> Researcher -> Creative -> Outreach
                                                          |
                                               user approves outreach
                                                          v
Client conversation -> Closer -> user approves deal terms -> contract draft
                                                          |
                                             user approves contract send
                                                          v
                                                        Client
```

The arrows express workflow dependencies, not autonomous authority. A user can
stop, correct, rerun, or close a lead at every stage. Approval is an explicit,
persisted action for a specific version of the object being approved.

## Five-agent architecture

All agents are TypeScript domain modules using the same provider-neutral
`AIProvider` contract. The workflow service owns ordering, persistence, retry
policy, and lifecycle transitions. Runtime schemas validate every agent output
before it becomes application data.

| Agent | Inputs | Validated outputs | Role and rollout |
| --- | --- | --- | --- |
| **Prospector** | Target area/market, qualification criteria, permitted discovery sources | Candidate businesses, contact details, discovery source, ranking score, signals/evidence, qualification confidence | Future. Builds a ranked shortlist (for example, top 10 of 20) for user approval. MVP begins with manual lead creation. |
| **Researcher** | Approved lead, permitted sources and captured content | Observed facts, evidence references/excerpts, labelled inferences, confidence, marketing/video signals and gaps | MVP. Never asserts a need for video as fact. |
| **Creative** | Research, opportunity analysis, filmmaker profile and selected positioning | Video opportunity, concept, creative direction, deliverables, target audience, distribution channels, pitch angle | MVP. Produces options and recommendations, not commitments. |
| **Outreach** | Lead contacts, research, creative selection, filmmaker profile, channel, outreach/conversation context | Channel-specific draft, CTA, assumptions, follow-up suggestion | MVP drafts email/Instagram/TikTok copy; editing/approval/manual send are MVP. Automated delivery, replies and follow-ups are near-term. |
| **Closer** | Incoming conversation, selected proposal context, filmmaker pricing profile, approved constraints | Intent classification, response draft, objection notes, pricing/negotiation recommendation, scope options, proposed deal terms, contract-draft inputs | Future. It can recommend only; it cannot accept, promise, negotiate, or send on the user's behalf. |

### Prospector boundary

The Prospector will support prompts such as “find me 20 businesses in my area”
only after compliant discovery adapters exist. It gathers candidates from
permitted sources such as Google Maps/Places, business directories, search
providers, and public websites. It ranks candidates using documented factors
and attaches the source/evidence used for every meaningful claim.

Discovery candidates are not automatically deep-researched. They enter a
reviewable `PROSPECT_APPROVAL` stage, where the user chooses which businesses
become research-approved leads. Manual creation follows the same lead aggregate
and remains a supported input path, not a permanent architectural substitute
for prospect discovery.

### Research and opportunity analysis

The Researcher must return records in four clear categories:

| Category | Meaning |
| --- | --- |
| Observed fact | A directly visible or supplied statement, linked to a source. |
| Evidence | The source, captured time, and bounded excerpt or structured observation supporting a fact. |
| AI inference | A clearly labelled interpretation based on facts; never represented as certainty. |
| Confidence | A bounded rating and explanation based on evidence quality/coverage. |

Research may examine existing video quality/presence, website and social
content, marketing activity, products/services, events, launches, positioning,
competitor content, and possible content gaps. Lack of evidence is a finding
with low confidence, not proof of absence or business need.

An explainable opportunity analysis converts those signals into a score from
0--100. It must contain a versioned factor breakdown, rationale, confidence,
and evidence IDs. The application computes or verifies the total, rather than
trusting an unexplained model-generated number.

| Factor | Range | Evidence-led examples |
| --- | ---: | --- |
| Video/content opportunity signals | 0--30 | visual offer, demonstrable experience, event/launch context |
| Marketing activity and momentum | 0--20 | active campaigns, new services, regular announcements |
| Audience and distribution readiness | 0--15 | active owned/social channels, audience-facing marketing |
| Potential content gap | 0--20 | insufficient, stale, or poorly aligned visible content; with confidence |
| Reachability and filmmaker fit | 0--15 | usable contact path, geography/industry alignment, evidenced fit |

Budget, intent, social performance, and conversion likelihood must not be
invented. Scores may mark factors `not assessed` and should reduce confidence
when source coverage is weak.

### Closer safeguards

The future Closer Agent works from a user-defined `FilmmakerPricingProfile`,
including base day rate, project minimum, editing/travel/rush rates, packages,
discount limits, and preferred payment schedules. Recommendations must cite
the relevant profile rules and state assumptions.

It may classify a reply, draft a response, suggest options, or prepare proposed
terms. It may never independently accept a price, promise a deliverable, agree
to a change in scope, negotiate commercial terms, generate a binding acceptance,
or send a contract. Each deal term set and each contract draft needs its own
explicit user approval before advancing.

## High-level workflows

### MVP: manual lead to approved manual outreach

1. The user creates a `NEW` lead manually with business/contact information,
   notes, and optionally supplied URLs/source material.
2. The user starts research. The lead becomes `RESEARCHING`; the workflow
   snapshots inputs, provider/model, and prompt version in `AiRun`.
3. Researcher results are validated and stored with observed facts, evidence,
   inference, and confidence. Opportunity analysis is then stored with its
   explainable score.
4. Creative generates tailored opportunities and concepts using the filmmaker
   profile. The user selects an option; the lead reaches `CREATIVE_READY`.
5. Outreach creates a per-channel draft. The user reviews and edits it.
6. The user explicitly approves one immutable message version. Editing after
   approval creates a new unapproved version.
7. The MVP displays/copies the approved message for manual delivery. Only user
   confirmation can mark it sent and move the lead to `CONTACTED`.

If a run fails, retain successful records, mark the run failed, provide a
retryable state, and never create a fabricated partial result.

### Near-term: discovery through reply handling

1. Prospector obtains candidates from a compliant adapter and produces a
   ranked, evidence-backed shortlist.
2. The user approves selected candidates for research; only those pass to the
   Researcher.
3. Official email delivery records dispatch status and delivery events only for
   an approved message.
4. Reply/callback ingestion creates conversation records. Outreach proposes
   follow-ups according to user-defined timeframes; scheduled or sent follow-up
   actions require the applicable approval policy.

### Future: conversion and contract flow

1. Client messages and conversation context reach the Closer for classification
   and optional response/pricing recommendations.
2. The user selects/edits and explicitly approves all commercial terms.
3. The system creates a contract draft from the approved term snapshot.
4. The user explicitly approves a specific contract revision before any
   delivery adapter may send it.
5. Conversion analytics derive insight from outcomes, activity, messages,
   campaigns, and deals; they do not become a second source of truth.

## Recommended folder structure

Keep routes thin and feature modules cohesive. The structure is intentionally
capability-oriented, so future agents add a module rather than a service.

```text
src/
  app/
    (auth)/                         # login, signup, and auth actions
    (workspace)/                    # protected workspace routes
    (workspace)/
      leads/
        page.tsx
        new/page.tsx
        [leadId]/page.tsx
        _components/
        actions.ts                  # Server Action boundary only
      prospects/                    # future discovery/review UI
      conversations/                # future
      layout.tsx
    api/                            # webhooks/external endpoints only, later
    layout.tsx
    page.tsx
  features/
    profiles/                       # application profile ownership
    leads/
    prospecting/                    # Prospector and source qualification
    research/                       # Researcher and evidence schemas
    creative/                       # Creative and concept schemas
    outreach/                       # Outreach, review, delivery policies
    conversations/                  # future reply/follow-up modules
    closing/                        # future Closer, deals, contracts
    profiles/                       # filmmaker and pricing profiles
    ai/
      provider.ts                   # provider-neutral contract
      workflow.service.ts
      prompt-templates.ts
      run.service.ts
      providers/
        ollama.provider.ts
  components/                       # shared UI only
  lib/
    db.ts                            # Prisma client singleton
    env.ts                           # server-only environment validation
    auth.ts                          # verified server-side identity helper
    supabase/                        # cookie/session client utilities
    validation.ts
  generated/prisma/                  # generated; do not edit
prisma/
  schema.prisma
  migrations/
docs/
  ARCHITECTURE.md
```

Dependencies flow inward: `app` to feature services, services to agents and
repositories, with provider/source/channel adapters implementing contracts at
the outer edge. Agents receive typed data and an `AIProvider`, never an Ollama
client or Next.js request object.

## AI provider abstraction

Ollama is the initial runtime provider, but all agent logic uses a
provider-neutral contract. Provider configuration and network clients are
server-only.

```ts
interface AIProvider {
  readonly id: string;
  generateStructured<T>(request: {
    task: "prospecting" | "research" | "creative" | "outreach" | "closing";
    systemPrompt: string;
    input: unknown;
    schema: StructuredSchema<T>;
    model?: string;
  }): Promise<AIProviderResult<T>>;
}
```

`AIProviderResult` contains validated data plus vendor-neutral metadata:
provider/model, duration, correlation ID, usage when available, and a
redacted/raw-response retention reference. It does not leak vendor SDK types.
`OllamaProvider` owns Ollama HTTP details, model defaults, timeouts, and
structured-output options. Future cloud providers implement the same contract
and read keys from server-only environment variables. Provider choice comes from
validated server configuration, never a client request.

Prompts are versioned within agent modules. They must isolate source text as
quoted data, prohibit it from altering instructions, and prohibit unsupported
claims. Neither model output nor fetched source text is executable or allowed
to initiate outbound network actions. The development coding agent (Codex,
OpenCode, or another tool) is separate from the runtime AI provider.

## Database model

Use Supabase-hosted PostgreSQL with Prisma. Prisma owns the application schema,
migrations, and queries; Supabase Auth's managed `auth` schema remains outside
Prisma's ownership. Use enums for bounded
states/channels, consistent UUID/CUID primary keys, UTC timestamps, foreign
keys, and JSON only for bounded structured payloads or metadata. Keep current
records and historical runs; do not overwrite analysis needed for audit.

| Entity | Core fields | Purpose and rollout |
| --- | --- | --- |
| `Lead` | id, businessName, website, industry, location, contacts, notes, status, ownerId?, timestamps | Core aggregate. MVP supports manual creation; future prospects are promoted into it after approval. |
| `ProspectCandidate` | id, source, sourceExternalId, business/contact snapshot, location, qualification score, signals JSON, discovery run ID, status | Future staging record for ranked discovery results and user approval; prevents every search result becoming a lead. |
| `BusinessResearch` | id, leadId, summary, observedFacts JSON, inferences JSON, confidence, source snapshot, timestamps | MVP; many per lead for reruns. |
| `ResearchEvidence` | id, researchId, source type/URL/label, excerpt or observation, capturedAt | MVP; citations for facts and score factors. |
| `OpportunityAnalysis` | id, leadId, researchId, score, rubricVersion, factors JSON, rationale, confidence, createdAt | MVP; evidence-linked, explainable opportunity score. |
| `VideoConcept` | id, leadId, researchId, analysisId, title, opportunity, creative direction, deliverables, audience, distribution, pitch angle, status | MVP; many per lead and selectable for outreach. |
| `OutreachMessage` | id, leadId, conceptId, channel, subject, original AI body, current body, draft origin, state, approvedAt, sentAt, delivery metadata | MVP drafts/review/manual send; future official delivery. |
| `Conversation` / `ConversationMessage` | leadId, channel, participants, state; direction, body, external IDs, received/sent times | Near-term reply tracking and future Closer context; not needed for manual MVP. |
| `FollowUp` | leadId, message/conversation ID, dueAt, policy, state, approved/sent timestamps | Near-term; keeps schedule separate from lead status. |
| `Deal` / `DealTermSet` | leadId, negotiation state, proposed/approved term snapshots, approval metadata | Future; immutable approved terms supply contract generation. |
| `ContractDraft` | leadId, dealTermSetId, content/version, state, approvedAt, sentAt, delivery metadata | Future; distinct approval and delivery lifecycle. |
| `AiRun` | id, leadId?, entity type/ID, task, provider/model, prompt version, input snapshot, status, timings, usage/error | MVP and beyond; reproducibility and operational audit. |
| `LeadActivity` | id, leadId, type, related entity IDs, metadata, occurredAt | MVP append-only audit across all capability phases. |
| `Profile` | id matching Supabase Auth UUID, email, display name, timestamps | Foundation. The application-owned user/profile representation and future owner target. |
| `FilmmakerProfile` | profile/user ID, positioning, services, portfolio links, tone, default CTA | Future MVP context source for Creative and Outreach. |
| `FilmmakerPricingProfile` | base day/project minimum, editing/travel/rush rates, packages, discount limits, payment schedules, version | Future Closer context; no automatic commercial action. |

At MVP scale, retain original AI outreach plus a current editable body. A
message approval activity stores a frozen snapshot or digest of the approved
body. Introduce `OutreachMessageRevision` only when granular history or
multi-approver requirements justify it. Use the same pattern for future deal
terms and contract revisions from their first implementation because those are
commercially material.

Index `Lead.status`/`updatedAt`, `ProspectCandidate` source/status/ranking,
`OutreachMessage(leadId, state)`, `Conversation(leadId, state)`, and
`AiRun(leadId, status)`. Add normalized website/email indexes only with a
defined duplicate-resolution policy.

## Lifecycle and state boundaries

The long-term lead lifecycle is:

```text
NEW -> QUALIFYING -> PROSPECT_APPROVAL -> RESEARCHING -> ANALYSED
    -> CREATIVE_READY -> OUTREACH_REVIEW -> APPROVED -> CONTACTED
    -> REPLIED -> INTERESTED -> NEGOTIATING -> AGREED -> CONTRACT_REVIEW
    -> CONTRACT_SENT -> CONVERTED

Possible terminal outcomes from relevant non-terminal states:
NOT_INTERESTED, LOST, CLOSED
```

For the MVP, implement only `NEW`, `RESEARCHING`, `ANALYSED`,
`CREATIVE_READY`, `OUTREACH_REVIEW`, `APPROVED`, `CONTACTED`, `REPLIED`,
`INTERESTED`, `NOT_INTERESTED`, and `CLOSED`. The user may return an analysed
lead to research for a deliberate rerun, preserving prior records. The
remaining lifecycle states are architectural targets, not MVP work.

Lead status indicates the dominant relationship stage. It is not a replacement
for channel-specific message state (`DRAFT`, `APPROVED`, `SENT`, `FAILED`),
conversation state, follow-up state, negotiation state, or contract state.
Each is stored on its own entity and connected through `LeadActivity`.

## Human approval and outbound/commercial safety

Enforce these invariants in the application-service layer as well as the UI:

- Discovery results require user selection before deep research begins.
- AI generation creates drafts/recommendations only; it has no direct access to
  delivery, negotiation acceptance, or contract-sending adapters.
- Editing an approved outreach message, deal term set, or contract draft
  invalidates that approval and requires reapproval of the changed version.
- The MVP manual delivery flow displays/copies approved content and records
  `SENT` only after an explicit user confirmation. It does not send email or
  social messages.
- Future delivery adapters support only official, compliant platform APIs, are
  disabled by default, and check current approval immediately before dispatch.
- The Closer cannot accept a price, commit scope, agree terms, or send a
  contract. A user approves deal terms and contract delivery independently.
- Record approval, delivery attempt/outcome, manual-sent confirmation, and
  commercial state changes in `LeadActivity`. A failed delivery never becomes
  `SENT`.

## Security and operational considerations

- Store `DATABASE_URL`, `DIRECT_URL`, and future provider keys in ignored
  server-only environment files. Only the Supabase project URL and publishable
  key may use `NEXT_PUBLIC_`; never expose database URLs or a service-role key.
- Authentication is required for workspace access from the foundation phase.
  Use Supabase's server-side cookie session flow, refresh it through Next.js
  `proxy.ts`, and verify JWT claims server-side rather than trusting a cookie
  session object. Every future data access service must enforce ownership.
- OAuth providers (Google, Apple) are configured in the Supabase dashboard, not
  in application code or environment variables. The application only needs the
  Supabase URL and publishable key; provider client secrets live entirely in
  Supabase. The OAuth callback at `/auth/confirm` is the single, authoritative
  redirect target for all providers; enabling a provider in the dashboard is
  sufficient for the application to accept it. Do not add provider credentials
  to `.env` or ship them with the application.
- Validate all user input, agent output, status transitions, URLs, emails, and
  social handles. Escape displayed content; never render AI/source content as
  raw HTML.
- Treat websites, search results, directories, client messages, and model
  output as untrusted. Bound and label captured content, strip active content,
  permit only safe URL schemes/destinations, and defend against SSRF before
  external research or discovery is added.
- Log redacted operational data (run/task/model/duration/status/error) rather
  than contact data or full prompt/response content by default. Define retention,
  deletion, and access policies before production/cloud use.
- Apply request-size limits, timeouts, concurrency controls, and rate limits to
  every future source, delivery, and webhook integration. Keep failed AI and
  delivery states actionable.
- Use HTTPS in production, encrypted database/backups, least-privilege
  credentials, dependency updates, and monitoring appropriate to a solo MVP.

## Scope and implementation phases

| Scope | Included capabilities | Explicitly excluded at that stage |
| --- | --- | --- |
| **Foundation (current)** | Supabase Auth (email/password + Google and Apple OAuth), protected workspace, Supabase PostgreSQL through Prisma, profile ownership, environment validation | Agents, AI workflows, lead CRUD, discovery, messaging, pricing, contracts, analytics. |
| **MVP** | Manual lead creation/storage; Ollama Researcher; evidence-based opportunity analysis; Creative concepts; personalised Outreach drafts; review/approval; manual sending; basic lead activity | Automated discovery, website fetching, official delivery, reply tracking, follow-ups, Closer, pricing, contracts, analytics. |
| **Near-term** | Prospector discovery adapters and top-10 ranking; user prospect approval; safe website research; compliant email sending; follow-up scheduling; reply tracking | Social automation unless officially supported; pricing/negotiation, contracts, advanced analytics. |
| **Future** | Official social integrations; conversation intelligence; Closer; pricing/negotiation recommendations; deal terms; contract generation; client onboarding; conversion analytics and learning | Autonomous commitments, unapproved sending, microservice split unless proven necessary. |

Recommended incremental phases:

1. **Application foundation:** Supabase Auth, protected routes, cookie session
   refresh, Prisma/Supabase connectivity, `Profile`, and environment validation.
2. **Lead foundation:** manual lead CRUD, ownership enforcement, lifecycle
   transitions, `LeadActivity`, and filmmaker profile.
3. **Research MVP:** AI provider contract, Ollama provider, `AiRun`, schemas,
   Researcher, evidence display, explainable analysis, and retries using manual
   source material only.
4. **Creative and outreach MVP:** Creative concepts, Outreach drafts, editing,
   immutable approval activities, manual-copy/send confirmation, and
   channel-level message state.
5. **Discovery and conversations:** candidate staging, compliant discovery and
   website adapters, ranking/approval, email delivery, replies, and follow-up
   scheduling.
6. **Conversion:** conversation intelligence, pricing profile, Closer
   recommendations, deal-term approvals, contract drafts/delivery approvals,
   then outcome analytics.

Add a background job runner only when synchronous work or scheduled follow-ups
make it necessary; it invokes existing workflows. Do not introduce microservices
for these phases.

## Decisions requiring product approval before implementation

1. The Supabase project, local redirect URLs, email-confirmation settings, and
   future deployment domain for authenticated redirects. The OAuth callback
   (`/auth/confirm`) must be added to Supabase's "Redirect URLs" for each
   environment; Google and Apple provider apps must list the Supabase callback
   URL as an authorised redirect.
2. The initial filmmaker profile, portfolio links, positioning, services, and
   tone permitted in AI prompts.
3. The scoring and prospect-ranking rubric weights, thresholds, and evidence
   requirements, including how low-confidence prospects should be shown.
4. Whether MVP research remains restricted to user-supplied material or may
   safely fetch a supplied public website.
5. Manual-send semantics: copied, opened in a mail client, or user-confirmed
   sent. This document assumes user-confirmed sent.
6. The user-approval policy for future follow-ups: approval per message,
   preapproved follow-up rules, or both.
7. Initial compliant discovery/email providers and their permitted use,
   geographic/industry constraints, and contact-data policy.
8. Pricing-profile rules, discount authority, contract template/legal review,
   and the exact commercial actions that always require user approval.
9. Retention/deletion/access policy for contact data, source excerpts,
   conversations, provider inputs/outputs, and contracts.
