# Handoff: Plataforma Elos — HRIS B2B Multi-Tenant

## Overview
Elos is an HRIS (Human Resources Information System) covering recruitment, admission, employee records, payroll/DP, health & safety (SST), compliance, organizational psychology, workflow approvals, cross-hub analytics, and an AI assistant ("Elo") with agent-mode actions. This package hands off the full product design so it can be rebuilt as a real, production-grade multi-tenant SaaS.

## About the Design Files
The file in this bundle (`Plataforma Elos.dc.html`) is a **design reference built in HTML** — a clickable, data-driven prototype demonstrating every screen, state, and interaction, not production code to copy verbatim. It was built with a component-template runtime (custom `{{ }}` bindings, `sc-if`/`sc-for` control flow, a single in-memory state object) that only exists in the prototyping tool — none of that runtime should be carried into the real product.

**The task is to recreate this design in a real, chosen stack** (React/Next.js is recommended given the component boundaries already implied by the hub structure, but Vue/Angular are equally valid) with a real backend, real database, real auth, and real multi-tenancy — not to embed or iframe the HTML file.

## Fidelity
**High-fidelity.** Colors, spacing, typography, copy, and layouts are final/intentional. Recreate pixel-for-pixel where practical; where the target design system already has established components (buttons, inputs, tables), prefer those as long as visual parity is kept.

---

## Recommended Architecture for Multi-Tenant SaaS

### Multi-tenancy model
- **Shared database, tenant_id column on every table** is the pragmatic default for an HRIS at this stage (simpler ops, cheaper, fine up to the low thousands of tenants). Row-level security (Postgres RLS) keyed on `tenant_id` is strongly recommended so tenant isolation is enforced at the database layer, not just in application code.
- Alternative if enterprise customers demand hard isolation: schema-per-tenant or database-per-tenant, provisioned on signup. Only pursue this if a customer contract requires it — it multiplies migration/ops complexity.
- Every table needs `tenant_id`, and every query must be scoped by it (a query builder middleware or ORM-level default scope is essential to avoid data leaks).

### Suggested stack
- **Frontend**: React + TypeScript, Next.js (App Router) for SSR/auth-gated routing per hub. TanStack Query for server state. A component library (shadcn/ui, Radix, or MUI) mapped to the tokens below.
- **Backend**: Node.js/TypeScript (NestJS or a well-structured Express/Fastify) or a BFF pattern if the org already has services in another language. Multi-tenant middleware resolves `tenant_id` from subdomain (`{tenant}.elos.app`) or from the authenticated session on a shared domain.
- **Database**: PostgreSQL with RLS policies per tenant_id. Redis for session/cache and rate limiting.
- **Auth**: OAuth2/OIDC-based (Auth0, Clerk, or in-house) with MFA (the login screen already designs for a 2-step code), SSO/SAML for enterprise tenants, and role-based access control (RBAC) — the prototype's `currentUserRole` simulation (Comitê de Ética, Compliance, RH Generalista, Gestor de área, Psicologia) should become real roles/permissions enforced server-side, not just hidden in the UI.
- **Background jobs**: a queue (BullMQ/Postgres-backed) for payroll processing, eSocial event submission, training-expiration alerts, report generation, and webhook delivery — all currently mocked synchronously in the prototype.
- **File storage**: S3-compatible object storage per tenant prefix for documents (ASOs, laudos, contratos, certificates).
- **Audit log**: every module in the prototype has an "audit trail" (trilha de auditoria) — model this as one immutable, append-only `audit_events` table (tenant_id, actor, entity_type, entity_id, action, payload, created_at), not per-feature ad hoc arrays.

### Integrations & public API (see "Integrações" screen)
- Expose a versioned REST API (`/v1`) with per-tenant API keys (rotate/regenerate, as designed), scoped to least-privilege.
- Webhook delivery system with retry/backoff and a delivery log (the "Webhooks — últimos eventos" table is the UI for this).
- Connector abstraction for ERP (TOTVS Protheus), banking (payment file/remessa generation), and benefits platforms (Flash) — each as a pluggable adapter behind a common `Integration` interface (connect, sync, disconnect, health-check).

### Elô (AI assistant) in agent mode
- The prototype's regex-based intent parser (create task, approve vacation) is a stand-in. In production this should call an LLM with function-calling/tool-use against a constrained set of backend actions (create task, approve request, send reminder), with an audit entry per executed action and a confirmation UI step for anything destructive or irreversible. See the "Claude API in prototypes" pattern for wiring a real model; server-side the tool calls must re-check permissions (never trust the client to gate agent actions).

### Multi-tenant considerations per module
- **Compliance** (Ética, LGPD, Riscos, Treinamentos, Políticas): confidentiality/access-control model (`acessoPermitido` arrays in the prototype) must become real per-tenant RBAC + row-level access grants, with request/approval logged.
- **SST**: eSocial event submission (S-2210, S-2220, S-2240) needs a real integration with eSocial's SOAP/REST endpoints per tenant's CNPJ, with retry and government response tracking.
- **Payroll (DP)**: folha processing should be an idempotent, auditable batch job, not a UI toggle.
- **Psicologia**: clinical/confidential content (atendimentos, prontuário) needs field-level encryption at rest and the strictest RBAC in the system — only the assigned professional role should decrypt/view clinical notes.

---

## Modules / Screens (Hubs)

1. **Área de trabalho (Painel)** — cross-hub dashboard: KPI cards with mini sparklines, agenda widget, notifications.
2. **Gestão de Pessoas (RH)** — Recrutamento & Seleção (kanban-like job pipeline, candidate drawer, interview scheduling, cost-per-hire), Admissão (checklist, e-signature simulation, eSocial S-2200, document upload), Colaboradores (directory + profile drawer with history), Avaliação e PDI (self/manager scoring, goals, training), Férias e Afastamentos (request/approval, Gantt-style month bar), Desligamento (termination workflow + checklist).
3. **Departamento Pessoal (DP)** — Prazos trabalhistas, CCT/Convenções, Tabela de Cargos, Benefícios, Uniforme/EPI, Ponto Eletrônico (justification approval), Folha de Pagamento (batch processing, guias, eSocial).
4. **SST (Saúde e Segurança do Trabalho)** — Visão geral (KPIs incl. taxa de gravidade), Acidentes e CAT (registration, eSocial S-2210, investigation fields — causa raiz/ação corretiva), Exames Ocupacionais (scheduling, results, eSocial S-2220), Treinamentos NR, PGR/PCMSO, Mapa de Riscos (+ eSocial S-2240), EPI (delivery/renewal tracking).
5. **Compliance** — Visão geral (maturity score), Canal de Ética (confidential case management with role-gated access requests), LGPD (incident register, ANPD reporting), Auditorias, Políticas (versioning + acceptance tracking), Gestão de Riscos (5×5 matrix, mitigation plan, audit trail), Terceiros (vendor risk/due diligence), Treinamentos Obrigatórios (track assignment by role, certificates, expiry alerts), Conflito de Interesse (annual declaration cycle). All with print/export-to-new-tab reports (Auditoria Externa, Board, ANPD).
6. **Psicologia Organizacional** — Visão geral (risco psicossocial NR-1 + mitigation plan), Atendimentos (scheduling, referral to external specialist, outcome/CID registration linked to DP leave records, confidentiality toggle), Pesquisa de Clima, Canal de Escuta, Bem-estar, Avaliação em R&S.
7. **Indicadores** — headcount evolution, cost-per-hire, diversity, turnover by department with target/meta line, flight-risk model (predictive), absenteeism trend + correlation with leave/CAT counts, cross-hub correlation (turnover × psychosocial risk).
8. **Aprovações** — multi-level workflow engine: alçadas (approval thresholds by level), delegation, full audit trail, hub/type filters.
9. **Elo (AI assistant)** — chat with history, agent-mode toggle that executes actions (create task, approve vacation) vs. informational-only mode.
10. **Ferramentas**: Documentos (repository w/ access level), Agenda (calendar view + annual Planner w/ monthly goals/weekly priorities/free-write notes + habit tracker w/ monthly grid & dashboard trend + a lined "Bloco de notas" that Elo can parse into tasks/reminders), Relatórios (pre-configured exports), Comunicação (internal announcements), Configurações (users/roles, company data, dark theme toggle, config change log, 404/403 diagnostic triggers), Integrações (ERP/bank/benefits connectors, public API key management, webhook log).
11. **Portal do Colaborador (ESS)** — employee self-service (vacation request, etc.).
12. **Planner 2026** — annual calendar with month toggle, goals, priorities (mirrored inside Agenda as well).
13. **System states** — 404 (não encontrado) and 403 (acesso negado) screens, both with a "voltar" CTA.
14. **Auth** — email/password login, forgot-password flow, MFA (6-digit code) step.

---

## Design Tokens

### Colors (light theme, CSS custom properties in the prototype)
- `--page-bg`: `#fef9f3`
- `--surface`: `#ffffff`
- `--surface-alt`: `#f6efe7`
- `--text`: `#2f2b26`
- `--text-secondary`: `#706558`
- `--text-tertiary`: `#a89c8d`
- `--border`: `#ece2d6`
- `--border-strong`: `#d9cfc9`
- `--divider`: `#f0e8dd`
- `--tint-blue` (used as a light accent tint): `#e8eef3`
- Primary accent (buttons, active states, brand): `#92adc3` (dusty blue)
- Sidebar background: `#92adc3` solid
- Success/positive: `#6d8a3d`
- Warning: `#c9b27a`
- Danger/critical: `#b06a5e`, deep critical `#8a2e2e`
- Info/neutral accent secondary: `#c9857a`
- Purple accent (used for Board-level reports): `#8a7fb0`

### Dark theme overrides (already specified for the toggle)
- `--page-bg:#1c1a17; --surface:#242019; --surface-alt:#2c2721; --text:#f3ede4; --text-secondary:#b8ab9c; --text-tertiary:#8a7d6e; --border:#3a332c; --border-strong:#4a4239; --divider:#332d27; --tint-blue:#2a3540; --on-accent:#1c1a17;`

### Typography
- Font family: **Work Sans** (400/500/600/700), loaded from Google Fonts.
- Headings/section titles: 15–19px, weight 600.
- KPI big numbers: 20–38px, weight 600–700.
- Body/table text: 12.5–14px.
- Micro labels/eyebrows: 10.5–12px, uppercase, letter-spacing ~0.03–0.06em, `--text-tertiary`.

### Spacing & shape
- Card radius: 10px (12px for larger feature cards, 20px for pills/badges).
- Card padding: 16–24px depending on density.
- Grid gaps: 10–20px depending on context.
- Borders: 1px solid `--border` (or `--border-strong` for inputs/forms).
- Shadows: subtle, e.g. `0 8px 24px rgba(146,173,195,0.45)` for the (removed) floating action button, `0 10px 30px rgba(61,61,61,0.08)` for elevated notebook-style cards, drawer shadow `-8px 0 30px rgba(61,61,61,0.12)`.

---

## Key Interactions & Behavior
- **Drawers**: right-side slide-in panels (440px wide) used consistently for record detail (CAT, exame, caso de ética, colaborador, etc.) with a scrim overlay and audit trail at the bottom.
- **Confidentiality gating**: sensitive records (ethics cases, LGPD incidents, conflict-of-interest declarations, psychology clinical notes) show a 🔒 restricted-access card in place of content when the simulated current role isn't authorized, with a "solicitar acesso" (request access) action that creates a pending request for an authorized role to approve.
- **Reports**: every compliance/SST/training module has an "Exportar relatório" action that opens a print-ready HTML document in a new tab (should become a real PDF/export service server-side).
- **Approvals engine**: multi-level chains with delegate-to-another-approver support, decision notes, and a running audit log per request.
- **Elo agent mode**: toggled on/off; when on, recognized commands ("criar tarefa: X", "aprovar férias de X") execute directly and render a distinct "✓ Ação executada" confirmation bubble instead of a normal chat reply.
- **Habit tracker**: monthly grid (not weekly) per habit, weekday cells count toward a completion percentage, weekend cells never count toward the base score but show a distinct color when completed and award a separate bonus counter. A dashboard view shows a 6-month trend per habit.
- **Notebook/bloco de notas**: paged freeform writing surface (ruled-paper visual treatment) with prev/next page navigation and a "Transformar em ação/lembrete" action that parses each line for actionable intents (same parser as Elo agent mode) and reports back per-line what was created.
- **Theme toggle**: switching light/dark swaps the full CSS custom-property set at the root — implement as a real theme provider (e.g. CSS variables + `data-theme` attribute or a design-token provider), not per-component conditionals.

## State Management (reference only — re-architect for real app)
The prototype keeps one flat client-side state object per session (no persistence). In production, all of this must be **server-backed**: employees, jobs, candidates, CATs, exams, ethics cases, risks, trainings, approvals, habits/planner data, integrations, and audit logs are all real persisted entities scoped by `tenant_id`, not client state.

## Assets
- `assets/elo-logo-cream.png` — Elo (AI assistant) mark, cream color, used on the accent-blue circular badges (nav icon, page header, chat drawer icon).
- `assets/elos-logo-blue.png` — full "elos" wordmark, blue, used on the login screen.
- `assets/elos-e-icon.png` — legacy icon, superseded by `elo-logo-cream.png`; safe to ignore/remove if not referenced.
- All other iconography is inline SVG (nav icons) — recreate as a proper icon set (e.g. Lucide/Heroicons) rather than hand-copying the inline paths.

## Screenshots
`screenshots/` contains a full-page capture of each main hub for quick visual reference alongside this README: `01-painel`, `02-gestao-pessoas`, `03-departamento-pessoal`, `04-sst`, `05-compliance`, `06-psicologia`, `07-indicadores`, `08-aprovacoes`, `09-elo`, `10-agenda`, `11-integracoes`, `12-configuracoes`. For sub-screens (drawers, forms, subpages within each hub), open the live HTML file and navigate directly — it is far more accurate than a static image since every state is interactive.

## Files
- `Plataforma Elos.dc.html` — the full interactive design reference (all hubs/screens/states described above).
