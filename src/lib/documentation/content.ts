export type DocumentationGroup = "Foundation" | "Workflows" | "Technical" | "Operations";
export interface DocumentationSection { id: string; title: string; group: DocumentationGroup; summary: string; paragraphs: string[]; steps: string[]; fields: string[][]; notes: string[]; image: string | null; path: string | null; }
export const documentationSections: DocumentationSection[] = [
  {
    "id": "overview",
    "title": "Cortanex RMS technical handbook",
    "group": "Foundation",
    "summary": "A source-grounded reference for formulation, quality review, production execution and connected systems.",
    "paragraphs": [
      "This handbook describes the implementation reviewed on 12 October 2026. It covers the current application, not a certification or a promise that every production-readiness requirement is complete. Screenshots are real captures of the signed-in application using existing records; they demonstrate screen layout, not end-to-end validation of every transaction.",
      "RMS is the recipe definition and version-control system. MES Command Center is intended to consume released recipes and exchange production execution information. CORTA QC is intended to receive approved recipe specifications and return batch quality results. The current connectors expose HTTP requests and message logs; real receiving-system configuration and contract testing are still required.",
      "Use the workflow chapters for exact actions and inputs, the technical chapters for storage and API contracts, and the operations chapters for troubleshooting and release limitations. Existing example records and equipment choices must be replaced or reviewed against your plant before operational use."
    ],
    "steps": [],
    "fields": [],
    "notes": [
      "Documentation does not modify recipes, batch records, permissions, or connector configuration.",
      "Screenshots exclude the top-bar account identity where practical. Reference data may be illustrative rather than plant-qualified."
    ],
    "image": "control-center",
    "path": "/"
  },
  {
    "id": "access",
    "title": "Sign-in, onboarding & account access",
    "group": "Foundation",
    "summary": "Email/password access, role assignment and account recovery.",
    "paragraphs": [],
    "steps": [
      "Open the app. Choose Request an account and enter the details requested by the account form. Google sign-in is intentionally absent.",
      "Follow the account confirmation instructions if required by the configured authentication service. The code does not establish the current hosted email-confirmation policy.",
      "Sign in with your email and password. The store loads your profile and assigned roles. An account with no roles sees Waiting for access instead of operational content.",
      "The first profile initialized through ensure_profile() is assigned the RMS Administrator role. Subsequent users require administrator-assigned roles.",
      "An administrator opens Users & Roles, searches for the person and checks the roles they need. A user can hold several roles; the top bar switches the active UI role.",
      "Use Forgot password? for recovery and the reset-password page for the new password. Use the profile page for your name and password changes; sign out from the top bar."
    ],
    "fields": [],
    "notes": [
      "UI role switching only chooses among assigned roles; it does not grant a role. Database checks consider stored role memberships.",
      "An active session, roles and the account-disabled presentation gate are separate checks. Full disabled-account revocation at every database/API boundary needs additional verification.",
      "No default password or shared operator credentials are embedded in the app."
    ],
    "image": "sign-in",
    "path": null
  },
  {
    "id": "architecture",
    "title": "Architecture & trust boundaries",
    "group": "Technical",
    "summary": "React UI, authenticated server functions and PostgreSQL enforcement.",
    "paragraphs": [
      "The app uses React 19, TanStack Start v1, TanStack Router, Vite 7 and Tailwind CSS v4. Shared chrome is rendered by src/routes/__root.tsx. RmsStoreProvider owns session, roles, recipes, supporting records, audit and settings. Page routes live in src/routes; the route tree is generated automatically.",
      "Ordinary reads and writes use the browser database client with row-level security. useRms().can controls the active-role UI, while public.has_role, has_any_role, can_write_record and transition_recipe enforce database permissions. Hidden buttons must never be treated as authorization.",
      "Password verification, AI analysis and integration delivery use createServerFn with requireSupabaseAuth. The middleware validates bearer authentication and supplies the caller-scoped client, user ID and claims. Privileged clients are dynamically imported inside handlers after permission checks.",
      "External callers use src/routes/api/public/v1/$.ts, mapped to /api/public/v1/*. This public prefix does not rely on site sign-in: each supported endpoint checks an API key and required scope. The API uses a privileged database client after key authentication.",
      "Published server logic runs in the Cloudflare Worker runtime. The current signing and external API modules import crypto; worker compatibility, error handling and published behavior must be explicitly tested rather than inferred from local preview success."
    ],
    "steps": [],
    "fields": [
      [
        "Browser",
        "Route pages → useRms → caller-scoped database client → RLS"
      ],
      [
        "Internal server",
        "createServerFn → requireSupabaseAuth → role verification → service operation"
      ],
      [
        "External server",
        "HTTP request → x-api-key → SHA-256 lookup → active/expiry/scope check → handler"
      ],
      [
        "Database",
        "Constraints, RLS, triggers and security-definer functions remain the authority"
      ]
    ],
    "notes": [
      "No privileged keys, passwords, session cookies or internal database URLs are shown in this documentation."
    ],
    "image": null,
    "path": null
  },
  {
    "id": "storage",
    "title": "Database dictionary & record shapes",
    "group": "Technical",
    "summary": "Relational recipe versions and typed JSON supporting records.",
    "paragraphs": [
      "Recipe item shape: id, refType (material or recipe), refId, name, targetPct, minPct, maxPct, unit and scaling (proportional or fixed). Process shape: seq, phase, parameter, targetValue, unit and durationMin. Compliance contains hazards[], allergens[], storageMaxC and shelfLifeDays.",
      "Execution data contains recipeId/code/version, productionOrder, batch, equipment, line, operator, startedAt, finishedAt, status, source, qcStatus, actualYield, notes and steps[]. Each step stores seq, phase, parameter, target, actual, unit, optional deviation and doneAt.",
      "JSONB makes the supporting schema flexible but does not enforce all field types or reference relationships as foreign keys. parent_id, recipe references and record-embedded IDs require application-level consistency checks. Migration files are the source for initial schema and literal seeded records."
    ],
    "steps": [],
    "fields": [
      [
        "profiles",
        "id UUID, full_name, email, status, created_at. User-facing account profile; readable by authenticated users under the current policy."
      ],
      [
        "user_roles",
        "id UUID, user_id UUID, role app_role, created_at; unique (user_id, role). Only administrators insert/delete role rows."
      ],
      [
        "recipes",
        "id text, code, name, project, version, parent_id, branch_label, status, classification; target_yield/items/process/compliance JSONB; created_by, created_by_name, approved_by[], created_at, updated_at."
      ],
      [
        "rms_records",
        "Composite primary key (kind, id); data JSONB, created_by UUID and updated_at. Kinds: material, unit, schema, trial, validation_rule, execution, integration, setting and legacy api_key."
      ],
      [
        "audit_log",
        "id bigint, ts, actor_id, actor_name, action, entity, property, before_value, after_value, reason, version, signed. Authenticated users receive SELECT only, with role restrictions."
      ],
      [
        "notifications",
        "id, user_id, title, body, link, read and created_at. A user can read/update/delete their own notifications."
      ],
      [
        "api_keys",
        "id UUID, label, prefix, key_hash, scopes[], expires_at, active, created_by/name, created_at, last_used_at, call_count. Plaintext generated tokens are not persisted."
      ],
      [
        "integration_messages",
        "id, integration_id, direction, event, payload JSONB, status, response, attempts, created_at, updated_at. Staff-readable; service-managed writes."
      ],
      [
        "app_config",
        "Private key/value configuration used by the signing service. No client-accessible policy. Values must never be returned to the UI."
      ]
    ],
    "notes": [],
    "image": null,
    "path": null
  },
  {
    "id": "roles",
    "title": "Roles, permissions & segregation of duties",
    "group": "Foundation",
    "summary": "Five roles, independently assigned and enforced at multiple boundaries.",
    "paragraphs": [
      "The Role Matrix page derives capabilities from the same frontend permission map used by useRms().can. Database policies are separately defined and must be regression-tested for parity. The UI uses the selected role; a caller with multiple stored roles may pass server checks based on any assigned role.",
      "Current RLS permits all engineers to update drafts, but deletion is restricted to their own drafts. Non-operators may read non-released recipes at the database level. The polymorphic supporting-record table is broadly readable by authenticated users, with a legacy API-key-kind exception. Do not assume each page visibility rule also restricts all underlying supporting records.",
      "The transition function rejects approve/release if the author UUID matches the signer or author display name matches the current actor name. It also rejects a second approval by an actor name already present in approved_by. Actor-name matching is an implementation detail requiring identity-collision testing."
    ],
    "steps": [],
    "fields": [
      [
        "Recipe Engineer",
        "Create/edit drafts; submit; copy/new version; compare; view drafts; manage materials/units/schemas; import/export; view trace and audit. Trial writes are engineer-scoped."
      ],
      [
        "QA / Quality Manager",
        "Review, approve, reject and return; compare/view drafts; obsolete; trace/audit/export. Cannot approve a recipe they authored."
      ],
      [
        "Production Manager",
        "Release, obsolete, compare, released downloads, trace/audit/export and execution visibility. Manual batch recording/start still requires Operator permission."
      ],
      [
        "Operator",
        "Execute/download released recipes; record batch data; trace visibility. No recipe editing, approval, audit or QA AI access."
      ],
      [
        "RMS Administrator",
        "Users/roles, validation configuration, master data, integrations, settings, import/export, draft visibility, trace and audit. Admin alone is not an approval or batch-recording role."
      ]
    ],
    "notes": [
      "The current system does not implement a second-admin approval requirement for role grants.",
      "Self-admin revocation and self-disable are disabled in the Users UI, not proven as an equivalent database-wide invariant."
    ],
    "image": "roles",
    "path": "/roles"
  },
  {
    "id": "navigation",
    "title": "Control center, global search & notifications",
    "group": "Workflows",
    "summary": "Locate work, monitor the pipeline and open records quickly.",
    "paragraphs": [],
    "steps": [
      "Open R&D Control Center for recipe counts, pipeline distribution, recent changes and role-specific My tasks links.",
      "Use Search everywhere in the top bar; type a recipe code/name, material, trial, person or API-key label and choose a result. Results are derived from loaded records and respect what the current database session can read.",
      "Open the bell to read workflow notifications. Follow the record link and mark items read. Notifications are loaded periodically, with a 30-second refresh interval.",
      "Choose your active assigned role in the top bar when you need another role-specific action. The profile control opens personal details and password management."
    ],
    "fields": [],
    "notes": [
      "Global search is not a full server-side indexed search service.",
      "The app loads audit entries up to 500, notifications up to 50 and integration messages up to 200. Counts and search coverage may therefore differ from the entire database.",
      "Do not infer production analytics completeness from overview charts; validate each aggregation and historical series."
    ],
    "image": "control-center",
    "path": "/"
  },
  {
    "id": "recipe-library",
    "title": "Recipe repository: create & find drafts",
    "group": "Workflows",
    "summary": "Browse recipes and begin a new formulation.",
    "paragraphs": [],
    "steps": [
      "Open Recipes and use text search across name, code, project and branch. Narrow by status and choose the available grid/list presentation.",
      "With Recipe Engineer active, choose New Draft. Enter name, code, version, project, classification and target yield with its unit.",
      "Save the draft and open its recipe profile. Components and process are maintained in the profile rather than a complete multi-stage creation wizard.",
      "Use a recipe card/row to open the exact record and version. Operators should work from Released records; use Production Execution for batch actions."
    ],
    "fields": [
      [
        "Identity",
        "Code identifies the recipe family; id identifies one stored recipe record. Version is stored text, not a global automatic sequence."
      ],
      [
        "Yield",
        "Target yield value and unit establish nominal formulation scaling."
      ],
      [
        "Ownership",
        "The create action records the signed-in author. Draft mutation and deletion are subject to RLS."
      ]
    ],
    "notes": [
      "Filtering is on currently loaded recipes, not server-side pagination or saved views.",
      "Bulk repository compare/export workflows, conflict-aware autosave and a complete creation wizard are not implemented."
    ],
    "image": "recipes",
    "path": "/recipes"
  },
  {
    "id": "formulation",
    "title": "Recipe profile: formulation, process & compliance",
    "group": "Workflows",
    "summary": "Maintain the exact recipe definition before submission.",
    "paragraphs": [],
    "steps": [
      "Open a Draft as a Recipe Engineer. Inspect name/version/status, author, yield, component count, cost and total target percentage.",
      "Use Edit for metadata: recipe name, code, version, project, branch label, classification, target yield/unit, storage maximum, shelf life, hazards and allergens.",
      "In Formulation add a component. Choose Reference type and Reference; enter Display name, Target %, Min %, Max %, Unit and Scaling. Edit or remove existing components through their row actions.",
      "In Process add sequential steps with Phase, Parameter, Target value, Unit and Duration (min). Edit/delete through the corresponding actions.",
      "Inspect Compliance for hazards, allergens, storage and shelf life; use the header metadata editor to change these values.",
      "Review validation findings, property rollups and calculated costs. Choose Submit for review only after the formula is complete. Non-draft versions display Fields locked."
    ],
    "fields": [
      [
        "Target composition",
        "Sum targetPct should be 100%; server transition tolerance is ±0.01 percentage points."
      ],
      [
        "Component range",
        "minPct ≤ targetPct ≤ maxPct is checked by the configured application validator."
      ],
      [
        "References",
        "Materials and sub-recipes are selectable; self-reference is excluded from the picker. Broader cycle integrity requires additional review."
      ],
      [
        "Process duration",
        "Duration is in minutes; configured data-type validation requires a finite target and duration greater than zero."
      ]
    ],
    "notes": [
      "Costs use catalog base costs and the UI currently displays a dollar symbol; no plant currency policy is configured here.",
      "The profile has Formulation, Process and Compliance tabs, not full attachments/equipment/quality tabs.",
      "Metadata and row saves persist changes; there is no reliable concurrent-edit conflict detection."
    ],
    "image": "recipes-REC-0001",
    "path": "/recipes/REC-0001"
  },
  {
    "id": "scaling",
    "title": "Recipe scaling, copies & new versions",
    "group": "Workflows",
    "summary": "Calculate new quantities while preserving approved definitions.",
    "paragraphs": [],
    "steps": [
      "Open the recipe profile and adjust the scaling target. Use proportional mode for uniform scaling or the locked/anchor mode for the supported anchor calculation.",
      "Review the scaled quantities and theoretical cost; scaling is a calculator and does not automatically create a production batch.",
      "Use New version when changing a submitted or released definition. The database function clones it to Draft, records the parent relationship and clears approval state.",
      "Use Copy when starting a separate recipe based on an existing one. The new recipe is Draft and attributed to the current user.",
      "Open the new Draft, confirm code/version/branch metadata and re-run validation before submission."
    ],
    "fields": [],
    "notes": [
      "Save-as-scaled-batch, branch promotion and archival are not complete workflows.",
      "New-version numbering and the reason argument are not a comprehensive configurable numbering/reason-history system.",
      "Validate nested-recipe unit consistency and fixed-component scaling against engineering expectations."
    ],
    "image": "branches",
    "path": "/branches"
  },
  {
    "id": "lifecycle",
    "title": "Approval lifecycle: submit, review & release",
    "group": "Workflows",
    "summary": "The server controls state, approvals and author restrictions.",
    "paragraphs": [],
    "steps": [
      "Engineer submits Draft or Rejected → Under Review. Submission checks composition total and current role/state.",
      "QA opens Review Queue, inspects validation and change comparison, and opens the recipe profile for the detailed action.",
      "QA chooses Approve and confirms their password when signatures are required. Distinct approvals accumulate; status stays Under Review until qaApprovalsRequired is reached.",
      "QA can Reject → Rejected or Return for correction → Draft. Reject and Return require a reason. Rejected content is locked until it is returned to Draft or a new Draft version is created.",
      "Production Manager releases Approved → Released, confirming password if required. The author cannot release their own recipe. Existing Released records with the same code become Superseded.",
      "QA or Production Manager can mark Approved, Released or Superseded → Obsolete with a reason and configured signature. Obsolete versions are no longer available as released production recipes."
    ],
    "fields": [
      [
        "Submit",
        "draft/rejected → review · recipe_engineer"
      ],
      [
        "Approve",
        "review → approved (or review pending additional approvals) · qa_manager"
      ],
      [
        "Reject",
        "review → rejected · qa_manager · reason required"
      ],
      [
        "Return",
        "review/approved → draft · qa_manager · reason required"
      ],
      [
        "Release",
        "approved → released · production_manager"
      ],
      [
        "Obsolete",
        "released/approved/superseded → obsolete · qa_manager or production_manager"
      ]
    ],
    "notes": [
      "Composition total is independently enforced by the database for submit, approve and release. Other configured validation rules are application-side checks, not all database invariants.",
      "The workflow kanban is a grouped view, not a drag-to-transition board.",
      "An approval or release can succeed while outbound delivery fails; inspect the integration log separately."
    ],
    "image": "workflows",
    "path": "/workflows"
  },
  {
    "id": "signatures",
    "title": "Electronic signatures & immutable history",
    "group": "Technical",
    "summary": "Password re-verification signs a specific user, recipe and action.",
    "paragraphs": [
      "signRecipeAction accepts recipeId, action (approve/reject/release/obsolete) and password. It verifies the signed-in caller’s email/password through a separate non-persistent auth client and confirms the resulting user ID matches the authenticated caller.",
      "The service computes HMAC-SHA256 over userId:recipeId:action using private app_config. transition_recipe checks the token when workflow.requireSignature is true, enforces role/state/reason constraints and writes a signed audit row.",
      "The current HMAC has no timestamp, expiry, nonce or one-use store. Do not describe it as a time-limited, non-replayable or legally qualified digital signature. Secret rotation changes validity, but does not substitute for expiry or one-time consumption.",
      "Database triggers write recipe creation/deletion, selected field changes, supporting-record changes and role grants/revokes. transition_recipe explicitly writes status actions, reason, actor and version. API-key create/revoke/delete also write audit history.",
      "Audit is read-only to ordinary clients. Supporting-record before/after JSON is truncated to 500 characters, and recipe header entries summarize rather than capture every field. A fully complete forensic before/after record and formal regulatory compliance are not established."
    ],
    "steps": [],
    "fields": [],
    "notes": [
      "Batch Complete & sign off does not perform the recipe electronic-signature password flow.",
      "Audit read-only for app users is not an absolute tamper-proof guarantee against privileged database administration."
    ],
    "image": "audit",
    "path": "/audit"
  },
  {
    "id": "review",
    "title": "Review Queue & gate monitoring",
    "group": "Workflows",
    "summary": "Prioritize approvals using aging and configured SLA.",
    "paragraphs": [],
    "steps": [
      "Open Review Queue as QA or a relevant staff role. Inspect recipes waiting for review or release and their author, age, validation state and approval count.",
      "Compare aging against workflow.reviewSlaDays to prioritize overdue records. Open a recipe for full review rather than approving from an incomplete summary.",
      "Use Approval Workflow to see stage counts and recipes grouped under Draft, Under Review, Rejected, Approved, Released, Superseded and Obsolete.",
      "Follow a recipe from the gate column to its profile. Actual transitions remain in the recipe workflow action panel."
    ],
    "fields": [],
    "notes": [
      "No assignee management, mandatory stage checklist or configurable required role per stage is implemented.",
      "Only QA approval count, review SLA and signature requirement are persisted workflow settings."
    ],
    "image": "review-queue",
    "path": "/review-queue"
  },
  {
    "id": "branches",
    "title": "Variant Branches & lineage",
    "group": "Workflows",
    "summary": "Trace parent-child versions for parallel formulation work.",
    "paragraphs": [],
    "steps": [
      "Open Variant Branches and search/filter the family or project.",
      "Inspect baseline/root records and child versions. The tree uses recipe parentId / parent_id links, with version/status information.",
      "Open a node to view the corresponding recipe profile. Use New version there to derive a new Draft.",
      "Use Comparison Engine to compare the child with its parent; validate the chosen pair before interpreting the deltas."
    ],
    "fields": [],
    "notes": [
      "Branches are derived views of recipes, not an independent CRUD entity.",
      "Promotion to a main line and branch archival are not implemented.",
      "Existing parent links are not backed by a database foreign-key lineage model."
    ],
    "image": "branches",
    "path": "/branches"
  },
  {
    "id": "comparison",
    "title": "Comparison Engine & change review",
    "group": "Workflows",
    "summary": "Compare two recipes and inspect directional differences.",
    "paragraphs": [],
    "steps": [
      "Open Comparison Engine and select the two recipes/versions you want to compare.",
      "Check that the left/right selection represents the intended baseline and candidate; swap variants when needed.",
      "Review header metrics, formulation item deltas, process parameters, cost and compliance differences. Inspect added, removed and changed components.",
      "Use the CSV export action for a spreadsheet-oriented comparison record. In a recipe approval panel, also inspect the change comparison against its last released version."
    ],
    "fields": [],
    "notes": [
      "The current comparison is a two-selection experience, not a fully implemented 2–4-way comparison.",
      "Comparison output is not a signed approval decision; QA must inspect source records.",
      "PDF/Excel comparison export and every planned differences-only filter are not established."
    ],
    "image": "compare",
    "path": "/compare"
  },
  {
    "id": "trials",
    "title": "Trial Logs: record bench results",
    "group": "Workflows",
    "summary": "Link observations and sensory outcomes to a recipe record.",
    "paragraphs": [],
    "steps": [
      "Open Trial Logs as a Recipe Engineer and create a New trial entry.",
      "Select Recipe, enter Batch code and Operator, select Outcome (Pass, Fail or Inconclusive), and describe the Observation.",
      "Enter the optional Color, Smell and Texture scores from 1 to 10. Save and inspect the trial card.",
      "Use edit/delete actions to maintain trial records subject to engineer-scoped writes. Review results before advancing a recipe."
    ],
    "fields": [],
    "notes": [
      "No file/photo attachment pipeline or QA commenting workflow is implemented.",
      "Trial numeric analytics with unit-controlled fields and per-recipe trend charting are not complete.",
      "Current write policy is engineer-role scoped, not proven as ownership-only editing."
    ],
    "image": "trials",
    "path": "/trials"
  },
  {
    "id": "execution",
    "title": "Production Execution: dispatch a batch",
    "group": "Workflows",
    "summary": "Only released recipe definitions can start production records.",
    "paragraphs": [],
    "steps": [
      "Open Production Execution as an Operator. Choose a Released recipe and click Start execution.",
      "Enter Production order and Batch / lot. Choose Equipment and Line, and choose Dispatch via (MES Command Center or Manual / paper).",
      "Save Start. The new running execution links the released recipe record/code/version and current operator; process targets initialize the step list.",
      "Open the execution ID or Open run for guided measurement entry. Inspect the order, batch, equipment and version before recording."
    ],
    "fields": [
      [
        "recipeId",
        "Must refer to a Released recipe; the database trigger checks on execution creation."
      ],
      [
        "Equipment / Line",
        "Current manual selectors contain example choices. They are not a live equipment/order catalog."
      ],
      [
        "Dispatch via",
        "Source metadata only. Selecting MES does not itself pull a production order from MES."
      ]
    ],
    "notes": [
      "The UI requires both recipe.execute and execution.record to start a manual run; Production Manager alone cannot record.",
      "Production-order synchronization and automatic QC sample requests are not implemented end-to-end."
    ],
    "image": "execution",
    "path": "/execution"
  },
  {
    "id": "measurements",
    "title": "Batch run: measurements, deviations & closure",
    "group": "Workflows",
    "summary": "Record process actuals sequentially and explain significant drift.",
    "paragraphs": [],
    "steps": [
      "Open a running batch as Operator. In Weigh / charge materials, inspect target and allowed range and enter Actual quantity for each component.",
      "In Process steps, the first unfinished step is active. Enter Actual and a Deviation note when the process is off target.",
      "For a nonzero process target, absolute drift greater than 5% requires a nonblank deviation note before Confirm step. Example: target 600 rpm, actual 640 rpm → 6.7% drift → note required.",
      "Choose Confirm step. Actual, note and timestamp are saved into execution.steps; the next unfinished step becomes active.",
      "After all steps are done, enter Actual yield and choose Complete & sign off. Alternatively enter a required reason and choose Abort.",
      "Closed batches display a lock notice. Their ordinary authenticated updates are rejected by records_guard. QA result updates through privileged integration handling are a separate path."
    ],
    "fields": [],
    "notes": [
      "Material quantity out-of-range warnings are visual only: no mandatory material deviation note or all-material completion guard exists.",
      "Material quantity inputs are local state and become formatted notes on completion; they are not independently structured persisted measurements and do not restore on reload.",
      "Zero targets produce no relative deviation check in the current process logic. Numeric plausibility and yield ranges need stricter validation.",
      "The completion success message mentions a QC request, but no actual automatic sample-request delivery is wired by this action.",
      "The screenshot shows an existing closed batch in read-only mode, not a newly executed live production batch."
    ],
    "image": "batch-run",
    "path": null
  },
  {
    "id": "traceability",
    "title": "Traceability & batch investigation",
    "group": "Workflows",
    "summary": "Follow recipe version → order → batch → equipment → quality.",
    "paragraphs": [],
    "steps": [
      "Open Traceability and search by batch, order, recipe, equipment or operator using the available text filter.",
      "Narrow by recipe/version and date controls. Select a record to inspect the linked recipe, production metadata and QC status.",
      "Use the forward trace view to identify executions associated with a selected recipe version.",
      "Export the trace CSV for offline review. Verify the exact recipe/version and date scope before using it in a recall or investigation."
    ],
    "fields": [],
    "notes": [
      "The existing view links stored execution metadata; it is not a complete material-lot genealogy, NCR linkage or bidirectional recall engine.",
      "Date filtering follows the current implementation’s stored date strings; timezone-aware plant reporting requires verification."
    ],
    "image": "traceability",
    "path": "/traceability"
  },
  {
    "id": "ai",
    "title": "QA Deviation Insights & AI Gateway",
    "group": "Workflows",
    "summary": "Generate draft trend summaries and investigation questions from recorded batches.",
    "paragraphs": [],
    "steps": [
      "Operators record process actuals and deviation notes through the batch run; they do not access the AI analysis page.",
      "QA, Production Manager, Recipe Engineer or Administrator opens QA Insights. Choose a recipe or all available batches and inspect the selection.",
      "Click Analyze batches. The authenticated server re-checks allowed stored roles and reads up to 200 execution records, optionally filtered by recipeId.",
      "The service extracts batch, recipe/version, equipment, line, operator, status, QC, yield, notes and actual-bearing process steps. It computes signed drift percentage for nonzero targets.",
      "AI Gateway requests openai/gpt-6-astra. The prompt asks for Summary, Out-of-spec trends, 5–8 Investigation questions for QA and Suggested next checks, using only supplied data and under 450 words.",
      "Read the report as a draft. Confirm trend evidence against execution records, reject unsupported links, and use questions to guide human QA investigation. The result does not approve/release recipes or disposition batches."
    ],
    "fields": [],
    "notes": [
      "The analysis is capped at 200 records without a guaranteed chronological sort; it is not an exhaustive historical study.",
      "Reports are not saved as controlled investigation records and do not provide a human approval/audit trail for generated text.",
      "Operator identity and deviation notes are included in the AI input. Assess organizational privacy and approved AI-processing policies.",
      "Model requests use workspace AI credits. Empty data, missing AI configuration, exhausted credits (402), rate limiting (429) and request failures are shown as errors.",
      "No causal inference, validated statistical process control or regulatory investigation qualification is implied."
    ],
    "image": "qa-insights",
    "path": "/qa-insights"
  },
  {
    "id": "materials",
    "title": "Material Catalog & supplier data",
    "group": "Workflows",
    "summary": "Maintain component identities, costs and custom attributes.",
    "paragraphs": [],
    "steps": [
      "Open Material Catalog and use search/category controls or the grid/table presentation.",
      "Create or edit a material with Name, Category, Physical state (Solid/Liquid/Powder/Gas), Base unit, Base cost, Supplier and Attribute schema.",
      "Enter Custom attributes as key-value pairs matching the intended schema and save.",
      "Check the material’s selected unit and cost before using it in a recipe. Confirm recipe references manually before deletion."
    ],
    "fields": [],
    "notes": [
      "The current store deleteMaterial directly removes a record. Do not rely on a server-enforced where-used deletion block.",
      "Material blocked/active status, ERP synchronization and supplier cost history are not complete features.",
      "Required schema field enforcement and dynamic typed attribute inputs are not database-enforced."
    ],
    "image": "materials",
    "path": "/materials"
  },
  {
    "id": "schemas",
    "title": "Attribute Schemas & field definitions",
    "group": "Workflows",
    "summary": "Configure reusable text, numeric and enum metadata.",
    "paragraphs": [],
    "steps": [
      "Open Attribute Schemas and create a schema with Schema name and Domain.",
      "Add a field with Field key, Display label, Type (Text/Number/Enum), optional Unit and Enum options when appropriate.",
      "Edit/remove fields through their actions. Assign a material to the schema and maintain corresponding attribute keys.",
      "Before renaming/removing a field or schema, inspect existing materials using it and plan migration of their attribute data."
    ],
    "fields": [],
    "notes": [
      "Schema versioning, required flags, min/max constraints, date/boolean field types and in-use deletion prevention are not implemented as planned.",
      "Changing the field key does not automatically migrate existing material attribute values."
    ],
    "image": "schemas",
    "path": "/schemas"
  },
  {
    "id": "units",
    "title": "Units & Conversions",
    "group": "Workflows",
    "summary": "Define dimensions and base multipliers for conversions.",
    "paragraphs": [],
    "steps": [
      "Open Units & Conversions. Define Name, Symbol, Dimension (Mass/Volume/Count/Discrete) and Base multiplier.",
      "Choose From and To units in the conversion sandbox and enter the numeric value.",
      "The same-dimension calculation is value × from.baseMultiplier ÷ to.baseMultiplier. Inspect compatibility before using the result.",
      "Review existing recipe/material references before changing symbols/multipliers or deleting a unit."
    ],
    "fields": [],
    "notes": [
      "Cross-dimension conversions are not supported; material-density mass↔volume conversion is not implemented.",
      "There is no complete server-side in-use unit deletion guard.",
      "A zero or incorrect multiplier can invalidate calculations; engineering validation is required."
    ],
    "image": "units",
    "path": "/units"
  },
  {
    "id": "validation",
    "title": "Validation Rules: configuration & enforcement",
    "group": "Workflows",
    "summary": "Configure application-level checks without confusing them with server invariants.",
    "paragraphs": [],
    "steps": [
      "As Administrator open Validation Rules. Create/edit a rule, choose its kind and severity and toggle enabled state.",
      "Supported kinds are sum_100, min_max, required_step, required_ref, data_type, equipment_compat and required_param.",
      "Configure the kind-specific values through the current generic key-value editor: tolerance, minSteps, phaseContains, maxTempC or field as applicable.",
      "Open a recipe to review enabled-rule findings. Correct errors before submission and evaluate warnings as part of QA review."
    ],
    "fields": [
      [
        "sum_100",
        "Total composition within configured tolerance (server independently uses 0.01)."
      ],
      [
        "min_max",
        "Each component target within min/max bounds."
      ],
      [
        "required_step",
        "Minimum step count and/or phase substring."
      ],
      [
        "required_ref",
        "Material/sub-recipe references exist in loaded data."
      ],
      [
        "data_type",
        "Finite process targets and positive duration."
      ],
      [
        "equipment_compat",
        "°C target does not exceed configured maximum."
      ],
      [
        "required_param",
        "Required compliance parameter is present."
      ]
    ],
    "notes": [
      "Typed per-kind editors, rule scoping by project/classification and a dedicated test-before-enabling workflow are not complete.",
      "The database transition function enforces composition total, not the entire configurable validator."
    ],
    "image": "validation",
    "path": "/validation"
  },
  {
    "id": "exchange",
    "title": "Import & Export: formats, preview & draft safety",
    "group": "Workflows",
    "summary": "Move recipes through a reviewable import preview.",
    "paragraphs": [],
    "steps": [
      "Open Import & Export. For export choose Released only or All recipes (draft visibility is separately required), then CSV, Excel, JSON or XML.",
      "For import download a CSV/JSON/XML template or prepare the matching data structure. Select the file with Choose CSV, Excel (.xlsx), JSON or XML file.",
      "Excel reads the first worksheet and converts it to CSV. CSV/TSV group item rows by recipe code. JSON accepts an array or single recipe with code/name/items. XML reads recipe and item attributes.",
      "Review Preview findings for each recipe. Items with issues may still be imported as drafts for later correction.",
      "Choose Import as drafts. Generated IDs and current author are assigned; status/approval state is reset. Open imported recipes and validate before submitting."
    ],
    "fields": [
      [
        "CSV/XLSX columns",
        "recipe_id,code,name,version,status,item_ref,item_name,target_pct,min_pct,max_pct,unit"
      ],
      [
        "JSON",
        "Full recipe-like objects; code/name/items required. JSON retains more definition detail than the tabular/XML formats."
      ],
      [
        "XML",
        "recipes → recipe (code/version) → item (ref/pct/unit). Header/process/compliance fidelity is limited."
      ]
    ],
    "notes": [
      "CSV parsing is simple delimiter splitting and not robust for quoted commas/newlines. Use clean template data and verify preview.",
      "Tabular/XML formats omit parts of the complete recipe definition; they are not guaranteed lossless round-trip backups.",
      "There is no dedicated import history table or fully reliable export audit path: the store logAudit is intentionally a client no-op.",
      "No XLSX template is generated; XLSX import/export itself is implemented via SheetJS."
    ],
    "image": "data-exchange",
    "path": "/data-exchange"
  },
  {
    "id": "integration-setup",
    "title": "MES & CORTA QC integration setup",
    "group": "Workflows",
    "summary": "Configure reachable endpoints and confirm actual delivery.",
    "paragraphs": [],
    "steps": [
      "An Administrator opens Integrations and edits the real receiver base URL for the relevant endpoint. Replace example .local addresses before testing.",
      "Health check requests {baseUrl}/health with a 6-second timeout. HTTP success marks connected; HTTP errors mark degraded; fetch failures mark disconnected.",
      "After an approval/release/obsoletion action, inspect the message log. Approved events target INT-QMS; released/obsoleted events target INT-MES and INT-QMS.",
      "Delivery POSTs to {baseUrl}/events with JSON containing event, payload and sentAt, and x-rms-event in the header. It uses an 8-second timeout.",
      "Inspect direction, event, status, response and attempts. Retry a failed message manually after correcting configuration or the receiver.",
      "Confirm receiver-side persistence and read the result back in MES/CORTA QC; HTTP 2xx alone is not a full business transaction guarantee."
    ],
    "fields": [],
    "notes": [
      "Outbound delivery does not currently attach receiver credentials or a cryptographic event signature. Secure receiver authentication must be designed before production.",
      "No automatic retry queue, exponential backoff, idempotency contract or scheduler is implemented.",
      "ERP/material/order inbound synchronization and equipment telemetry endpoints are not implemented.",
      "The UI remains the trigger for lifecycle publishing rather than a transactional database outbox; delivery can be missed if the client flow is interrupted."
    ],
    "image": "integrations",
    "path": "/integrations"
  },
  {
    "id": "api-keys",
    "title": "API keys: generation, scopes & revocation",
    "group": "Workflows",
    "summary": "Issue a separate least-privilege key for each connected system.",
    "paragraphs": [],
    "steps": [
      "As Administrator open API Keys and generate a key with label, allowed scopes and optional expiry.",
      "Copy the one-time plaintext token into the receiving system’s approved secret storage. Do not paste it into documents, screenshots, source code or chat.",
      "Use recipes:read for released recipe/history reads, executions:write for MES execution creation and quality:write for CORTA QC results.",
      "Inspect prefix, created/expiry/last-used and call count. Revoke a key when no longer needed; delete only according to your access-record policy.",
      "Test missing/revoked/expired credentials and insufficient scopes before enabling a connection."
    ],
    "fields": [],
    "notes": [
      "Keys use random bytes with an rms_ prefix; only a SHA-256 hash is stored.",
      "Rate limits and IP allow-lists are not implemented. Call count is a read-then-update counter and can lose increments under concurrent calls."
    ],
    "image": "api-keys",
    "path": "/api-keys"
  },
  {
    "id": "api",
    "title": "External API reference & payload contracts",
    "group": "Technical",
    "summary": "Relative URL contracts implemented under /api/public/v1.",
    "paragraphs": [
      "All paths above are relative to /api/public/v1. Send x-api-key with the generated secret; send Content-Type: application/json for POST. Responses use JSON and cache-control: no-store. No actual credentials are included in the examples.",
      "Execution body fields: recipeId, productionOrder and batch are required strings (1–64); equipment and operator required strings (1–100); line optional string (≤50, defaults empty); status optional running/completed/aborted (defaults running); actualYield optional number. The recipe must currently be Released. Each request creates a new EX-* ID and initializes steps to an empty array.",
      "Quality body: batch required string (1–64), result passed/failed, notes optional string (≤1000). Missing batches return 404 BATCH_NOT_FOUND. Updates use privileged access and may modify closed records; individual update errors are not checked before the reported count, which needs hardening.",
      "Common errors: 401 INVALID_AUTH_TOKEN (missing/invalid/revoked/expired), 403 SCOPE_INSUFFICIENT, 403 RECIPE_NOT_RELEASED, 400 INVALID_JSON, 422 VALIDATION with issues, 404 NOT_FOUND/BATCH_NOT_FOUND and 500 WRITE_FAILED. Unsupported methods do not have an application-defined contract.",
      "Published endpoint tests, CORS policy, error propagation, replay prevention, batch uniqueness, idempotency, rate limits and contract versioning remain production checks. Earlier local checks returned valid JSON for released reads and exercised execution creation and QC updates; they do not certify deployed MES/CORTA QC compatibility."
    ],
    "steps": [],
    "fields": [
      [
        "GET /recipes/released",
        "Scope recipes:read. JSON {data:[{id,code,name,version,status,updated_at}]}; only status released."
      ],
      [
        "GET /recipes/{id}",
        "Scope recipes:read. JSON {data: recipeRow}; only released, else 403 RECIPE_NOT_RELEASED."
      ],
      [
        "GET /recipes/{id}/download",
        "Same scope and released check; returns the same JSON row, not a PDF/XML document."
      ],
      [
        "GET /recipes/{id}/history",
        "Scope recipes:read. Returns audit rows for entity=id. Current code serves history before checking released status; review this access scope."
      ],
      [
        "POST /executions",
        "Scope executions:write. Creates a new execution; success 201 {id}. It is not an upsert or update endpoint."
      ],
      [
        "POST /quality/results",
        "Scope quality:write. Updates matching batch records; success 200 {updated:n}. Non-unique batches can affect several executions."
      ]
    ],
    "notes": [],
    "image": null,
    "path": null
  },
  {
    "id": "api-examples",
    "title": "API request examples",
    "group": "Technical",
    "summary": "Illustrative values only; replace identifiers with your own released record and batch.",
    "paragraphs": [
      "Example execution: {\"recipeId\":\"YOUR_RELEASED_RECIPE_ID\",\"productionOrder\":\"PO-EXAMPLE-001\",\"batch\":\"B-EXAMPLE-001\",\"equipment\":\"Mixer-01\",\"line\":\"Line 1\",\"operator\":\"Operator reference\",\"status\":\"running\"}. This creates a new record; repeating it can create duplicates.",
      "Example quality result: {\"batch\":\"B-EXAMPLE-001\",\"result\":\"failed\",\"notes\":\"Temperature result requires QA investigation.\"}. Verify batch uniqueness and receiver response before treating the update as complete.",
      "Outbound envelope: {\"event\":\"recipe.released\",\"payload\":{...recipeRow},\"sentAt\":\"ISO-8601 timestamp\"}. Receiver endpoints must implement the matching /events contract; do not infer compatibility from their product name alone."
    ],
    "steps": [],
    "fields": [],
    "notes": [],
    "image": null,
    "path": null
  },
  {
    "id": "governance",
    "title": "Users, profile & audit review",
    "group": "Workflows",
    "summary": "Administer role memberships and review recorded changes.",
    "paragraphs": [],
    "steps": [
      "Open Users & Roles as Administrator and search by name/email. Toggle role checkboxes to grant/revoke stored roles. Each role change is audited.",
      "For another person choose active or disabled in the Status selector. Confirm disabled behavior with a session/access test; do not assume this presentation setting revokes every API or database path.",
      "Open your Profile to change your display name/password and review assigned roles and recent activity.",
      "Open Audit Trail as permitted staff. Filter by action/entity/user/date/text using available controls; inspect before/after, reason, version and signed marker.",
      "Use CSV export to review the currently loaded/filtered history. Preserve a full server-side evidence export separately for regulated retention needs."
    ],
    "fields": [],
    "notes": [
      "Users join through signup; there is no administrator invitation email workflow or last-sign-in column.",
      "Audit export covers the loaded limit (up to 500), not a guaranteed complete archive.",
      "Profile update audit coverage is not equivalent to role-grant trigger coverage."
    ],
    "image": "audit",
    "path": "/audit"
  },
  {
    "id": "settings",
    "title": "Organization & workflow settings",
    "group": "Workflows",
    "summary": "Persist operating defaults and approval configuration.",
    "paragraphs": [],
    "steps": [
      "Open Settings as Administrator. Update organization name, timezone, code prefix, default unit and session timeout using the available inputs; save organization settings.",
      "Set QA approvals required and review SLA days. Choose whether password signatures are required for approve/reject/release/obsolete; save workflow settings.",
      "Test the updated values using real role-separated accounts and a disposable recipe before relying on them.",
      "Idle sign-out resets its timer on mousemove, keydown, click and touchstart. A configured nonzero timeout signs out the UI after inactivity."
    ],
    "fields": [],
    "notes": [
      "Stored numbering/unit/timezone defaults are not uniformly wired into all forms and date calculations.",
      "Session timeout is a browser activity timer, not a universal server token-expiry policy.",
      "Disabling signatures changes assurance for future actions; change control and explicit organizational policy are required."
    ],
    "image": "settings",
    "path": "/settings"
  },
  {
    "id": "retention",
    "title": "Retention & legal hold",
    "group": "Workflows",
    "summary": "Store policy values without assuming automated archival.",
    "paragraphs": [],
    "steps": [
      "Open Retention Policy with the appropriate administrative permission.",
      "Review/update audit years, released-recipe policy, draft-idle days, trial years and execution years; use Legal hold according to organization policy.",
      "Review the holdings shown by the page. Keep operational archival/backup procedures separate from the stored settings.",
      "Before removing or archiving regulated evidence, confirm legal hold and apply an approved database-side procedure."
    ],
    "fields": [],
    "notes": [
      "Retention values are persisted configuration. No automated archive/purge scheduler or complete legal-hold enforcement at every delete path is implemented.",
      "Draft deletion remains possible under its RLS policy; policy settings alone do not prevent it.",
      "Backup schedule, recovery-point objectives and restore drills are not configured by this page."
    ],
    "image": "retention",
    "path": "/retention"
  },
  {
    "id": "operations",
    "title": "Troubleshooting & operating checklist",
    "group": "Operations",
    "summary": "Use the observable result, not a success message alone.",
    "paragraphs": [
      "Before a plant pilot: qualify master data and units; replace example equipment/lines; create separate engineer/QA/production/operator accounts; rehearse a complete draft→review→approval→release→batch→QC trace; confirm persistence by reload and fresh session; test unauthorized actions directly, not only through hidden buttons.",
      "Before integration rollout: configure authenticated receiver endpoints; test key expiry/revocation/scopes; verify published JSON responses; confirm receiver records read back correctly; exercise outage/retry/duplicate delivery and late quality results; preserve logs without including plaintext keys.",
      "Before production release: approve a security review; define backups/restores, retention and legal hold; validate audit completeness, signature replay protection, disabled-user enforcement, import escaping and all list limits. Obtain operational acceptance from engineering, QA and plant owners."
    ],
    "steps": [],
    "fields": [
      [
        "Waiting for access",
        "Administrator must assign a role to the signed-in account; sign out/in or refresh after assignment."
      ],
      [
        "Fields locked",
        "The record is not Draft or the active role lacks edit permission. Return through QA or create a new Draft version."
      ],
      [
        "Approval denied",
        "Check role, status, reason, previous approval and author segregation; verify password when required."
      ],
      [
        "Validation failed",
        "Inspect sum target %, item ranges, references and process steps. Server total tolerance is fixed at ±0.01."
      ],
      [
        "Cannot start/record",
        "Use Operator permission and a Released recipe; closed records cannot be updated through ordinary authenticated writes."
      ],
      [
        "Integration failed",
        "Check real base URL, /health and /events contracts, connectivity, response and attempts. Retry after resolving the root cause."
      ],
      [
        "AI failure",
        "Check eligible role, actual execution data, AI configuration, credits/rate limit and error details. Do not silently substitute invented data."
      ],
      [
        "Import mismatch",
        "Use template columns, clean CSV values and JSON for higher fidelity. Review every preview recipe and re-open saved drafts."
      ]
    ],
    "notes": [],
    "image": null,
    "path": null
  },
  {
    "id": "limitations",
    "title": "Readiness boundaries & known gaps",
    "group": "Operations",
    "summary": "Implemented screens are not equivalent to validated production readiness.",
    "paragraphs": [
      "These limitations intentionally supersede broad earlier “everything built” statements. This handbook describes source behavior and observed screens. Screenshot captures do not verify writes, author separation, all error paths or the published external systems. Treat the current application as a system requiring pilot qualification and targeted hardening before regulated production use."
    ],
    "steps": [],
    "fields": [
      [
        "Access & security",
        "Disabled-user server enforcement, role parity, self-role escalation/second-admin controls, replay-resistant expiring signatures and published worker behavior require hardening/verification."
      ],
      [
        "Workflow depth",
        "Assignees, mandatory stage checklists, role-configurable gates, stage drag/drop, controlled notification emails and full autosave conflict handling are incomplete."
      ],
      [
        "Formulation & master data",
        "Attachments, material where-used/blocking, supplier price history, schema versioning/required fields, unit in-use guard and density conversion are incomplete."
      ],
      [
        "Production",
        "Structured persistent material measurements, stricter numeric validation, electronic batch signatures, live order/equipment integration, automatic QC sampling and full lot genealogy are incomplete."
      ],
      [
        "Integrations",
        "Receiver credentials/signatures, durable transactional outbox, automatic retries, idempotency, rate limits/IP restriction, ERP endpoints and full contract testing are incomplete."
      ],
      [
        "Governance & reporting",
        "Email invites, last sign-in, complete audit export, server-side pagination/search, automated archival/legal-hold enforcement and verified backup/restore procedures are incomplete."
      ],
      [
        "AI",
        "Human QA review remains mandatory; controlled persistence, investigation approvals and exhaustive/ordered historical selection are not implemented."
      ]
    ],
    "notes": [],
    "image": null,
    "path": null
  }
];
