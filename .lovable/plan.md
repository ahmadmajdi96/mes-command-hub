# Cortanex RMS — Production Readiness Review (page by page)

Goal: turn the current demo (sample data that resets on reload, simulated role picker) into a real, multi-user system that is safe to use in a plant and integrates with MES Command Center and CORTA QC.

## 0. Platform foundations (required before any page is "production")

| # | Feature | Why |
|---|---|---|
| F1 | Real sign-in (email + Google), sign-out, password reset, session-aware top bar | Every action must be tied to a real person |
| F2 | Roles stored securely on the server (5 roles, a user can hold several) and checked on the server for every action | The role picker is for demo only; anyone could change it |
| F3 | Database for all records (recipes, versions, items, steps, materials, units, schemas, rules, trials, executions, audit, users, API keys, integrations, settings) | Data must persist |
| F4 | Recipe versions are frozen once submitted; edits create a new version | Regulatory integrity |
| F5 | Tamper-proof audit trail written by the server (who, when, before/after, reason, version), never editable or deletable | Compliance (21 CFR Part 11 / ISO style) |
| F6 | Electronic signature on approve / reject / release / obsolete (re-enter password + reason) | Approval accountability |
| F7 | Segregation of duties enforced by the server (author can't approve or release) | Spec requirement |
| F8 | Notifications: bell inbox + email for "needs your review", "approved", "rejected", "released", integration failures | Workflow doesn't stall |
| F9 | Real external API with API keys (hashed, scoped, expiring, rate-limited) | MES / QMS / ERP integration |
| F10 | Empty states, loading states, error states, confirm dialogs, pagination, mobile layout on every page | Usability |
| F11 | Remove all fake text ("Sandbox live", "Active project · Helios", random KPIs/trends) — compute from real data | Credibility |

## 1. R&D Control Center (home)
- Role-specific dashboards: Engineer (my drafts, rejected to fix), QA (review queue, aging), Production (approved awaiting release, executions today), Operator (released recipes, my running batches), Admin (users, integration health).
- KPIs from real data; "My tasks" list with one-click open; recent activity from audit.
- Alerts: validation failures, QC failures on batches, integration down.

## 2. Recipes (repository)
- Server-side search, filters (status, project, classification, owner, date), sort, pagination, saved views.
- Columns: code, name, version, status, owner, last change, validation state.
- Bulk actions: export, compare selected.
- Operators see Released only (server-enforced).
- Create wizard: header → components → process → compliance → validate → save as draft.

## 3. Recipe profile
- Header: status, version selector (all versions of this code), author/approvers, lock badge.
- Tabs: Formulation, Process, Parameters & Equipment, Compliance, Validation, Versions & History, Executions, Quality results, Attachments (SDS/specs).
- Editing only in Draft by author/engineers; autosave with conflict warning if someone else edits.
- Workflow panel with e-signature dialogs; required reason on reject/return/obsolete.
- Version diff vs. previous released version before submit/approve.
- Download released recipe (JSON/XML/PDF recipe sheet) — logged.
- Scaling calculator kept, with save-as-scaled-batch option.

## 4. Variant Branches
- Tree built from real parent/child version links; branch from any version.
- Actions: compare branch with parent, promote branch to main line, archive branch.
- Show status and owner per node.

## 5. Comparison Engine
- Pick any 2–4 versions/recipes; side-by-side items, steps, parameters, compliance, cost.
- Highlight added/removed/changed with % deltas; filter "differences only".
- Export comparison (PDF/Excel); link from approval screens.

## 6. Trial Logs
- Linked to a recipe version (draft or approved); sensory + analytics with units from Units page.
- Attach files/photos; outcome; trend chart per recipe across trials.
- Engineers create/edit own trials; QA can view and comment.

## 7. Approval Workflow (stage gates)
- Kanban by real status: Draft, Under Review, Rejected, Approved, Released, Superseded, Obsolete.
- QA review queue with aging (SLA days), assignee, filters.
- Admin-configurable: number of approvers per stage, required roles, SLA, mandatory checklist items per stage.
- Drag-to-move only where the user's role allows; otherwise read-only.

## 8. Production Execution
- Released recipes only; start from MES production order (pulled from MES) or manual.
- Execution screen: step-by-step guidance, record actual quantities/parameters vs. targets with tolerance alerts, deviations, sign-off.
- Complete / abort with reason; auto request QC sample in CORTA QC.

## 9. Traceability
- Search by batch, order, recipe, equipment, operator, date range.
- Genealogy view: recipe version → approvals → order → batch → equipment → operator → QC result/NCR.
- Forward/backward trace ("which batches used version X?") for recalls; export trace report.

## 10. Integrations (MES · QMS · ERP · Equipment)
- Configure endpoint URL, credentials (stored as secrets), event subscriptions, retry policy.
- Outbound events: recipe released/obsoleted → MES; recipe approved → CORTA QC (specs).
- Inbound endpoints: execution started/completed (MES), inspection result & NCR (CORTA QC), materials & orders (ERP).
- Message log with payload, status, retry button; health check; failure alerts.
- Interactive API documentation page.

## 11. Import & Export
- Downloadable templates (CSV/Excel/JSON/XML); real Excel (.xlsx) support.
- Preview + row-level validation report before import; imported items land as Draft.
- Import history with who/when/file/result.

## 12. Material Catalog
- Linked to attribute schemas; required attributes enforced; supplier, cost history, status (active/blocked).
- "Where used" list; blocking a material warns on recipes using it.
- ERP sync indicator.

## 13. Attribute Schemas
- Field types incl. number with unit, enum, text, date, boolean; required flag; min/max.
- Versioned; cannot delete a field in use.

## 14. Units & Conversions
- Base units per dimension, conversion factors, density-based mass↔volume per material.
- Prevent deleting units in use.

## 15. Validation Rules
- Admin CRUD with typed parameter editors per rule type (no free text key/value).
- Scope rules by classification/project; test a rule against a recipe before enabling.
- Rule changes are audited.

## 16. API Keys
- Generate key shown once, stored hashed; scopes; expiry; IP allow-list; revoke; usage chart.

## 17. Audit Trail
- Server-written, read-only; filters (user, action, entity, date), full-text, export CSV/PDF.
- Shows reason and signature meaning for each approval.

## 18. Retention Policy
- Configurable retention per record type; legal hold; archive (never hard-delete released recipes or audit).

## 19. Users & Roles / Role Matrix
- Invite by email, activate/deactivate, assign one or more roles, last sign-in.
- Role matrix generated from the same server permission table that enforces access.
- Admin cannot grant themselves approval roles without a second admin (optional setting).

## 20. Settings
- Organization profile, numbering schemes (recipe codes, versions), default units, e-signature policy, notification preferences, session timeout.

## 21. Global
- Search everywhere hits the database and respects permissions.
- Personal profile page (name, signature, notification settings).
- 404/403 pages ("You don't have access").

## Delivery phases

```text
Phase 1  Foundations: sign-in, roles, database, server-enforced workflow + audit, real data on all pages
Phase 2  Workflow depth: e-signature, version freeze/diff, notifications, QA queue, configurable gates
Phase 3  Production: execution screen, traceability search, import/export templates + preview
Phase 4  Integrations: MES/CORTA QC/ERP endpoints, message log/retries, external API + keys
Phase 5  Polish: role dashboards, retention/legal hold, settings, mobile, empty/error states
```

## Technical details
- Lovable Cloud tables with RLS; roles in a separate `user_roles` table with a `has_role` security-definer function; permissions table mirroring `can()`.
- Workflow transitions, version creation, signatures and audit inserts run in server functions (and DB triggers for audit), never trusted from the browser.
- Released/approved versions immutable via trigger; edits only on drafts.
- Inbound integration endpoints under `/api/public/*` with API-key / signature verification; outbound calls from server functions with retry log table.
- React Query for all reads; the in-memory store is replaced page by page.

Phase 1 is the recommended next step once this is approved.
