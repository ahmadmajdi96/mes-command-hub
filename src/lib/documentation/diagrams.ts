// Workflow diagrams per documentation chapter (keyed by section id).
// Each node is a short stage; `alt` lists the side paths that leave a decision node.
export type DiagramNodeKind = "start" | "step" | "decision" | "system" | "end";
export interface DiagramNode { label: string; actor?: string; kind?: DiagramNodeKind; alt?: string[] }
export interface WorkflowDiagram { title: string; nodes: DiagramNode[] }

const n = (label: string, actor?: string, kind: DiagramNodeKind = "step", alt?: string[]): DiagramNode => ({ label, actor, kind, alt });

export const documentationDiagrams: Record<string, WorkflowDiagram> = {
  overview: { title: "Recipe to production data flow", nodes: [
    n("Recipe defined in RMS", "Recipe Engineer", "start"), n("QA review & e-sign", "QA"), n("Released", "Production Manager"),
    n("Published to MES & CORTA QC", "System", "system"), n("Batch executed in MES", "Operator"), n("QC results returned to RMS", "CORTA QC", "end"),
  ] },
  access: { title: "Account access", nodes: [
    n("Request an account", "New user", "start"), n("Confirm email", "New user"), n("Sign in", "User"),
    n("First account?", "System", "decision", ["Yes → becomes RMS Administrator"]), n("Admin assigns role(s)", "Administrator"),
    n("Role assigned?", "System", "decision", ["No → 'Waiting for access' screen", "Disabled → 'Account disabled'"]), n("App unlocked", "User", "end"),
  ] },
  architecture: { title: "Request path", nodes: [
    n("Browser UI", "User", "start"), n("Permission check (useRms().can)", "UI"), n("Server functions / database", "System", "system"),
    n("RLS + security-definer functions", "Database", "system"), n("Audit triggers write audit_log", "Database", "end"),
  ] },
  storage: { title: "Where data is written", nodes: [
    n("User saves a change", "User", "start"), n("Recipe?", "System", "decision", ["No → rms_records (kind + JSON data)"]),
    n("recipes table", "Database", "system"), n("records_guard / can_write_record", "Database", "system"), n("Audit row created", "Database", "end"),
  ] },
  roles: { title: "Permission resolution", nodes: [
    n("User signs in", "User", "start"), n("Load assigned roles", "System", "system"), n("Pick active role", "User"),
    n("Action allowed for role?", "System", "decision", ["No → control hidden / access denied"]), n("Database re-checks", "Database", "system"), n("Action completes", "User", "end"),
  ] },
  navigation: { title: "Finding work", nodes: [
    n("Control Center", "User", "start"), n("Search everywhere (⌘K)", "User"), n("Notification bell", "User"), n("Switch active role", "User"), n("Open record", "User", "end"),
  ] },
  "recipe-library": { title: "Create a recipe", nodes: [
    n("Open Recipes", "Recipe Engineer", "start"), n("Search / filter", "Recipe Engineer"), n("New Draft", "Recipe Engineer"), n("Save draft", "Recipe Engineer"), n("Open recipe profile", "Recipe Engineer", "end"),
  ] },
  formulation: { title: "Build a formulation", nodes: [
    n("Open Draft", "Recipe Engineer", "start"), n("Edit metadata", "Recipe Engineer"), n("Add components", "Recipe Engineer"),
    n("Add process steps", "Recipe Engineer"), n("Review compliance", "Recipe Engineer"),
    n("Validation passes?", "System", "decision", ["No → fix components / steps"]), n("Ready to submit", "Recipe Engineer", "end"),
  ] },
  scaling: { title: "Scale or derive a version", nodes: [
    n("Set scaling target", "Recipe Engineer", "start"), n("Review scaled qty & cost", "Recipe Engineer"),
    n("Change locked recipe?", "Recipe Engineer", "decision", ["Separate product → Copy"]), n("New version (Draft)", "Recipe Engineer"), n("Confirm code / version / branch", "Recipe Engineer", "end"),
  ] },
  lifecycle: { title: "Recipe lifecycle (stage gates)", nodes: [
    n("Draft", "Recipe Engineer", "start"), n("Submit → Under Review", "Recipe Engineer"),
    n("QA decision", "QA", "decision", ["Reject → Rejected (reason)", "Return → Draft (reason)"]), n("Approve + e-sign", "QA"),
    n("Release", "Production Manager"), n("Previous release superseded", "System", "system"), n("Obsolete (reason)", "QA / Production Manager", "end"),
  ] },
  signatures: { title: "Electronic signature", nodes: [
    n("Choose approve / release", "Signer", "start"), n("Re-enter password", "Signer"),
    n("Password valid?", "Server", "decision", ["No → action blocked"]), n("Issue HMAC token", "Server", "system"),
    n("transition_recipe verifies token", "Database", "system"), n("Signed audit row", "Database", "end"),
  ] },
  review: { title: "Review queue", nodes: [
    n("Open Review Queue", "QA", "start"), n("Check aging vs SLA", "QA"), n("Inspect validation & changes", "QA"),
    n("Enough approvals?", "System", "decision", ["No → wait for next approver"]), n("Recipe Approved", "QA", "end"),
  ] },
  branches: { title: "Variant branches", nodes: [
    n("Open Variant Branches", "Recipe Engineer", "start"), n("Filter recipe family", "Recipe Engineer"), n("Inspect baseline & children", "Recipe Engineer"), n("Open node profile", "Recipe Engineer"), n("Compare with parent", "Recipe Engineer", "end"),
  ] },
  comparison: { title: "Compare recipes", nodes: [
    n("Select left & right recipe", "User", "start"), n("Confirm baseline side", "User"), n("Review metric deltas", "User"), n("Review item & step deltas", "User"), n("Export CSV", "User", "end"),
  ] },
  trials: { title: "Log a trial", nodes: [
    n("New trial", "Recipe Engineer", "start"), n("Recipe, batch, operator", "Recipe Engineer"), n("Sensory scores & notes", "Recipe Engineer"), n("Save", "Recipe Engineer"), n("Edit / delete as needed", "Recipe Engineer", "end"),
  ] },
  execution: { title: "Start production", nodes: [
    n("Choose released recipe", "Operator", "start"), n("Order, lot, equipment", "Operator"), n("Start execution", "Operator"), n("Open run", "Operator", "end"),
  ] },
  measurements: { title: "Batch run measurements", nodes: [
    n("Weigh / charge materials", "Operator", "start"), n("Within min/max?", "System", "decision", ["No → shown red, review"]),
    n("Process step actuals", "Operator"), n("Drift > 5%?", "System", "decision", ["Yes → deviation note required"]),
    n("Confirm step", "Operator"), n("Enter yield & complete", "Operator", "decision", ["Abort → reason required"]), n("Run locked", "System", "end"),
  ] },
  traceability: { title: "Trace a batch", nodes: [
    n("Search batch / order / recipe", "QA", "start"), n("Narrow by version & date", "QA"), n("Forward trace", "QA"), n("Export trace CSV", "QA", "end"),
  ] },
  ai: { title: "AI deviation review", nodes: [
    n("Operators log actuals & notes", "Operator", "start"), n("Filter & Analyze batches", "QA / PM / Engineer"),
    n("Role check on server", "Server", "system"), n("Collect up to 200 batches", "Server", "system"),
    n("AI Gateway drafts summary & questions", "AI", "system"), n("Human verifies evidence", "QA", "end"),
  ] },
  materials: { title: "Material catalog", nodes: [
    n("Search catalog", "Recipe Engineer", "start"), n("Create / edit material", "Recipe Engineer"), n("Custom attributes (schema)", "Recipe Engineer"), n("Check unit & cost", "Recipe Engineer", "end"),
  ] },
  schemas: { title: "Attribute schemas", nodes: [
    n("Create schema", "Administrator", "start"), n("Add typed fields", "Administrator"), n("Assign to category", "Administrator"),
    n("Field in use?", "Administrator", "decision", ["Yes → review references first"]), n("Edit / remove", "Administrator", "end"),
  ] },
  units: { title: "Units & conversion", nodes: [
    n("Define unit & base factor", "Administrator", "start"), n("Pick From / To", "User"), n("Same dimension?", "System", "decision", ["No → conversion refused"]),
    n("value × from.base / to.base", "System", "system"), n("Result shown", "User", "end"),
  ] },
  validation: { title: "Validation rules", nodes: [
    n("Create / edit rule", "Administrator", "start"), n("Choose kind & values", "Administrator"), n("Set severity / enable", "Administrator"), n("Rule runs on recipes", "System", "system"), n("Findings shown on profile", "Recipe Engineer", "end"),
  ] },
  exchange: { title: "Import & export", nodes: [
    n("Upload CSV / XLSX / JSON / XML", "Recipe Engineer", "start"), n("Parse & preview", "System", "system"),
    n("Validation errors?", "System", "decision", ["Yes → fix file and re-upload"]), n("Import as Drafts", "Recipe Engineer"), n("Normal review lifecycle", "QA", "end"),
  ] },
  "integration-setup": { title: "MES / QMS integration", nodes: [
    n("Configure base URL", "Administrator", "start"), n("Health check /health", "System", "system"), n("Recipe approved / released", "QA / PM"),
    n("POST /events", "System", "system"), n("Delivered?", "System", "decision", ["No → failed, Retry"]), n("Message logged", "System", "end"),
  ] },
  "api-keys": { title: "API key lifecycle", nodes: [
    n("Generate key & scopes", "Administrator", "start"), n("Copy one-time token", "Administrator"), n("Store hashed", "System", "system"), n("Monitor last use", "Administrator"), n("Revoke / expire", "Administrator", "end"),
  ] },
  api: { title: "Public API call", nodes: [
    n("Request with Bearer key", "MES / QMS", "start"), n("Key valid & not expired?", "API", "decision", ["No → 401"]),
    n("Scope allowed?", "API", "decision", ["No → 403"]), n("Recipe released?", "API", "decision", ["No → 403"]), n("JSON response / record written", "API", "end"),
  ] },
  "api-examples": { title: "MES & QC round trip", nodes: [
    n("GET /recipes/released", "MES", "start"), n("POST /executions", "MES"), n("Execution EX-… (QC pending)", "RMS", "system"), n("POST /quality/results", "CORTA QC"), n("QC status updated", "RMS", "end"),
  ] },
  governance: { title: "User governance & audit", nodes: [
    n("Search users", "Administrator", "start"), n("Assign roles / disable", "Administrator"), n("Users edit own profile", "User"), n("Filter audit trail", "QA / Admin"), n("Export CSV", "QA / Admin", "end"),
  ] },
  settings: { title: "System settings", nodes: [
    n("Organization & timeout", "Administrator", "start"), n("Approvals & SLA", "Administrator"), n("Require signature", "Administrator"), n("Test with real roles", "Administrator", "end"),
  ] },
  retention: { title: "Retention", nodes: [
    n("Open Retention Policy", "Administrator", "start"), n("Set retention periods", "Administrator"), n("Legal hold?", "Administrator", "decision", ["Yes → nothing removed"]), n("Review holdings", "Administrator"), n("Approved archive / removal", "Administrator", "end"),
  ] },
  operations: { title: "Troubleshooting", nodes: [
    n("Issue reported", "User", "start"), n("Permission problem?", "Support", "decision", ["Yes → check roles / account status"]),
    n("Integration problem?", "Support", "decision", ["Yes → health check, message log, retry"]), n("Check audit trail", "Support"), n("Resolve & record", "Support", "end"),
  ] },
  limitations: { title: "Go-live path", nodes: [
    n("Current build", "Team", "start"), n("Enter real MES / QC addresses", "Administrator"), n("Role-separated user testing", "Team"), n("Contract & validation testing", "QA"), n("Pilot go-live", "Team", "end"),
  ] },
};
