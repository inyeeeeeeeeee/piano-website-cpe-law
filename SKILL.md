---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Approach this as the design lead at a design studio known for giving every client a distinct visual identity that is not mistaken for anyone else's. This client has already rejected proposals that felt cliché or templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take aesthetic risk if justified.

## Ground your designs in the subject matter

If the brief does not identify what the product or subject matter is, identify it yourself before designing, and confirm with the client. You can come up with one concrete subject, the design's audience, and the design's primary job, as a proposal. If there's any information in your memory about the client's preferences or context about what they're building, use that as a hint. The subject's industry, subject matter, materials, and vernacular are where distinctive visual choices come from — a design for a toy for girls aged 8–11 will be very aesthetically different from a dashboard for financial analysts. Build with the brief's real content and subject matter throughout.

## Design principles

For web designs, the hero is the first thing viewers will see. Open with the most characteristic thing in the subject's world, in the form that is most appropriate: a headline, an image, an animation, a live demo, an interactive moment, or other treatments. Be deliberate with your choice: a big number with a small label, supporting stats, and a gradient accent is the default treatment, so only use it if that's truly the best option.

Typography carries the personality of the page. You don't need a different typeface for display or headline text and body content: use one family or two, and if two, make them clearly distinct.

Choose your typefaces deliberately, not the default families you would reach for on any other project, and set a clear type scale following the default guidance of The Elements of Typographic Style with intentional weights, widths, and spacing. When type is used as a headline or visual element, use the type treatment itself as an active part of the design, not a neutral delivery vehicle for the content.

Default to line lengths of less than 80 characters. Serif typefaces can have slightly longer line lengths; give serif body text slightly more line-height than a sans-serif.

Avoid these default typographic treatments; they are the commonest tells of a generated page:
- Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color.
- Using all caps for labels.
- Adding unnecessary typographic labels above content.

Visual structure is information. Structural devices like outlines, borders, numbering, eyebrows, dividers, labels, etc., encode useful information about the content rather than decorate it. Many generic designs use numbered markers (01 / 02 / 03), but that's only appropriate if the content actually is a sequence — like a stepped process or a timeline. Before adding numbered markers, check the content really is a sequence.

Use non-user-triggered motion sparingly and deliberately, only to draw attention. A single orchestrated moment — one page-load sequence or one reveal — lands better than scattered effects; fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated. Motion that answers a person's action (opening, expanding, confirming) is welcome when it shows what changed.

Consider written content carefully. Often a design brief may not contain real content, and it's up to you to come up with copy and placeholder content. Copy can make a design feel as templated as the design itself. See the below section on writing for more guidance.

## Process: plan, review against the brief, build, critique

For calibration, AI-generated design right now clusters around some traits:
1. a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta or warm-clay accent (often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell);
2. a near-black background with a single bright acid-green or vermilion accent;
3. a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns;
4. the SaaS-card kit: content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy, the same soft grey shadow (rgba(0,0,0,.1)) under each, and gradient washes as decoration;
5. template chrome that appears whatever the subject: a tracked-out ALL-CAPS eyebrow label above every heading; meta strings joined with middle dots ('A · B · C'); labels built as 'WORD — fragment' with a spaced em dash; tinted near-black (#0B0B0B, #111) standing in for black; a monospace face for small data labels; a '→' appended to link and button text.

All traits are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject. Where the brief pins down a visual direction, follow it exactly — the brief's own words always win, including when it asks for one of these looks. Where it leaves an axis free, don't spend that freedom on one of these defaults. As with a hired human designer, there's often a careful balance between doing what you're good at and taking each project as a chance to experiment and learn.

Work in two passes. First, brainstorm a short design plan based on the client's design brief: create a compact token system with color, type, layout, and principles.
- Color: describe the core base palette as 4–6 named hex values.
- Type: the typefaces and their roles.
- Layout: a layout concept, using one-sentence prose descriptions and ASCII wireframes to ideate and compare. Include alignment guidance; should the content be left aligned, center aligned, justified?
- Principles: the high-level guidance for what makes this page unique.

Then review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar) rather than a choice made for this specific brief — revise that part, say what you changed and why. Only after you've confirmed the relative uniqueness of your design plan should you start to write the code, following the revised plan.

When writing the code, be careful of structuring your CSS selector specificities. It's easy to generate CSS classes that cancel each other out (especially with a type-based selector like .section and an element-based selector like .cta). This can happen often with padding/margin between sections.

## Restraint and self-critique

Spend your boldness in one place. Let one element be the memorable thing, keep everything around it quiet and disciplined, and cut any decoration that does not serve the brief. Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected, visually accessible, harmonious color palettes. Critique your own work as you build, taking screenshots to review if your environment supports it — a picture is worth 1000 tokens. Consider Chanel's advice: before leaving the house, take a look in the mirror and remove one accessory. Human creatives have memory and always try to do something new, so if you have a space to quickly jot down notes about what you've tried, it can help you in future passes.

## More on writing in design

Words appear in a design for one reason: to make it easier to understand and use. They are design content, not decoration. Bring the same intentionality and minimalism to copywriting that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience.

Write from the end user's perspective. Name things by what users will understand in simple language, not by how the system is built. A user manages notifications, not webhook config. Describe what something is or does in plain terms rather than selling it. Being specific and legible to new users is always better than being clever.

Use active voice as default. A CTA says exactly what happens when it is used: "Save changes," not "Submit." An action keeps the same name through the whole flow, so the button that says "Publish" produces a toast that says "Published." The vocabulary of an interface is the signposting for someone navigating the product. Cohesion and consistency are how people learn their way around.

Treat failure and emptiness as moments for direction, not mood. Explain what went wrong and how to fix it, in the interface's voice rather than a person's. Errors don't apologize, and they are never vague about what happened. An empty screen is an invitation to act.

Keep the tone conversational: plain verbs, sentence case, no filler, with tone matched to the brand and the audience. Let each written element do exactly one job.

---

# Full-Stack Developer Skills

Curated skill set for working on the Piano Website CPE Law project (React + TypeScript frontend, Node.js/Express REST API, PostgreSQL + Redis, Stripe/SendGrid/S3, Docker + Kubernetes, CI/CD). All skills live under `claude-skills/skills/<name>/SKILL.md`.

## Tier 1 — Daily drivers

| Skill | Path | Use it when |
| --- | --- | --- |
| fullstack-guardian | `claude-skills/skills/fullstack-guardian/SKILL.md` | Building a feature across frontend + backend at once: authenticated API routes with UI forms, CRUD end-to-end from database to UI, monorepo wiring. The default skill for this project. |
| react-expert | `claude-skills/skills/react-expert/SKILL.md` | Writing React 18+ components, custom hooks, Server Components, Suspense, rendering/performance issues in `.jsx`/`.tsx`. |
| typescript-pro | `claude-skills/skills/typescript-pro/SKILL.md` | Advanced types, type guards, discriminated unions, monorepo typing, end-to-end type safety. |
| javascript-pro | `claude-skills/skills/javascript-pro/SKILL.md` | Modern ES2023+, async/await flows, Node.js APIs, plain `.js`/`.mjs`/`.cjs` review. |
| api-designer | `claude-skills/skills/api-designer/SKILL.md` | Designing or reviewing REST endpoints, resource modeling, versioning, pagination, error contracts, OpenAPI specs. |
| sql-pro | `claude-skills/skills/sql-pro/SKILL.md` | Schema design/migration, complex joins, window functions, query plan analysis across SQL dialects. |
| postgres-pro | `claude-skills/skills/postgres-pro/SKILL.md` | PostgreSQL specifics: `EXPLAIN` analysis, JSONB, indexing, VACUUM/replication tuning. |
| secure-code-guardian | `claude-skills/skills/secure-code-guardian/SKILL.md` | Auth/authorization, input validation (Zod), JWT/sessions, parameterized queries, CORS/CSP, OWASP Top 10 prevention — required by `SYSTEM_ARCHITECTURE.md` security rules. |

## Tier 2 — Per-area depth

| Skill | Path | Use it when |
| --- | --- | --- |
| nextjs-developer | `claude-skills/skills/nextjs-developer/SKILL.md` | Only if the React app moves to Next.js 14+: App Router, route handlers, streaming SSR, Vercel deploys. |
| graphql-architect | `claude-skills/skills/graphql-architect/SKILL.md` | If the REST API gains a GraphQL layer: schema design, DataLoader resolvers, federation. |
| websocket-engineer | `claude-skills/skills/websocket-engineer/SKILL.md` | Real-time features (live lesson status, notifications): Socket.IO, Redis-backed scaling, presence/rooms. |
| database-optimizer | `claude-skills/skills/database-optimizer/SKILL.md` | Slow queries, lock contention, index design, partitioning — escalate here after `sql-pro`/`postgres-pro`. |
| nestjs-expert | `claude-skills/skills/nestjs-expert/SKILL.md` | Only if the Express backend is restructured into NestJS modules/controllers/services. |
| python-pro / fastapi-expert | `claude-skills/skills/python-pro/SKILL.md` | Any Python tooling, scripts, or services (also `fastapi-expert` for async Python APIs). |

## Tier 3 — Quality, review, and delivery

| Skill | Path | Use it when |
| --- | --- | --- |
| code-reviewer | `claude-skills/skills/code-reviewer/SKILL.md` | Every PR / pre-merge pass: correctness, bugs, code smells, N+1 queries, architecture concerns in one report. |
| security-reviewer | `claude-skills/skills/security-reviewer/SKILL.md` | Scheduled audits, dependency and secrets scanning, SAST, compliance checklists (complements `secure-code-guardian`). |
| test-master | `claude-skills/skills/test-master/SKILL.md` | Test strategy, unit/integration coverage gaps, mocking, flaky tests, k6/Artillery performance runs. |
| playwright-expert | `claude-skills/skills/playwright-expert/SKILL.md` | E2E browser tests, page objects, fixtures, visual regression, CI test integration. |
| debugging-wizard | `claude-skills/skills/debugging-wizard/SKILL.md` | Stack traces, log correlation, root-cause analysis of crashes or unexpected behavior. |
| devops-engineer | `claude-skills/skills/devops-engineer/SKILL.md` | Dockerfiles, GitHub Actions CI/CD, deployment automation — matches the containerized deployment in `SYSTEM_ARCHITECTURE.md`. |
| kubernetes-specialist | `claude-skills/skills/kubernetes-specialist/SKILL.md` | Production manifests, pod crashes, RBAC, NetworkPolicies, Helm charts, GitOps. |
| terraform-engineer | `claude-skills/skills/terraform-engineer/SKILL.md` | Infrastructure as code for AWS resources (S3 buckets, clusters), state and multi-environment workflows. |
| monitoring-expert | `claude-skills/skills/monitoring-expert/SKILL.md` | Prometheus/Grafana dashboards, structured logging (ELK), alerting, tracing, load tests, profiling. |
| sre-engineer | `claude-skills/skills/sre-engineer/SKILL.md` | SLOs/error budgets, incident procedures, capacity planning for production. |

## Tier 4 — Planning and design (before and after the code)

| Skill | Path | Use it when |
| --- | --- | --- |
| feature-forge | `claude-skills/skills/feature-forge/SKILL.md` | Defining a new feature: user stories, EARS-format requirements, acceptance criteria, implementation checklists. |
| architecture-designer | `claude-skills/skills/architecture-designer/SKILL.md` | System-level decisions, ADRs, component interaction and scalability planning — must stay consistent with `SYSTEM_ARCHITECTURE.md`. |
| spec-miner | `claude-skills/skills/spec-miner/SKILL.md` | Inherited or undocumented code: reverse-engineer behavior, generate API docs, map dependencies. |
| code-documenter | `claude-skills/skills/code-documenter/SKILL.md` | Docstrings, JSDoc, OpenAPI/Swagger docs, documentation sites and guides. |
| legacy-modernizer | `claude-skills/skills/legacy-modernizer/SKILL.md` | Incremental migrations, strangler-fig decomposition, framework upgrades without downtime. |
| the-fool | `claude-skills/skills/the-fool/SKILL.md` | Pre-mortems, red-teaming a plan, devil's advocate on a proposal before committing. |

## Future roadmap (from `SYSTEM_ARCHITECTURE.md`)

| Skill | Path | Use it when |
| --- | --- | --- |
| react-native-expert | `claude-skills/skills/react-native-expert/SKILL.md` | The planned mobile application (React Native/Expo). |
| flutter-expert | `claude-skills/skills/flutter-expert/SKILL.md` | Alternative cross-platform mobile path if Flutter is evaluated instead. |

## How to pick

1. Is the work a feature spanning UI **and** API **and** data? → start with `fullstack-guardian`.
2. Is it a single layer? → Tier 1/2 skill for that layer (React, TypeScript, API, SQL, security).
3. Before writing code on anything non-trivial → `feature-forge` for the spec; for structural decisions also `architecture-designer`.
4. Before merging → `code-reviewer`, plus `security-reviewer` for auth/payment paths (Stripe) and `test-master`/`playwright-expert` for coverage.
5. After shipping → `devops-engineer`/`kubernetes-specialist` for delivery, `monitoring-expert` for observability.
