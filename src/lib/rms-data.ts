// Demo data for the R&D Recipe Management System (RMS).
// Industry-agnostic — materials carry generic attrs; recipes nest sub-recipes.

export type RecipeStatus = "draft" | "review" | "rejected" | "approved" | "released" | "superseded" | "obsolete";
export type Role = "Recipe Engineer" | "QA / Quality Manager" | "Production Manager" | "Operator" | "RMS Administrator";
export const ROLES: Role[] = ["Recipe Engineer", "QA / Quality Manager", "Production Manager", "Operator", "RMS Administrator"];
export const LIFECYCLE: RecipeStatus[] = ["draft", "review", "approved", "released"];
export const ALL_STATUSES: RecipeStatus[] = ["draft", "review", "rejected", "approved", "released", "superseded", "obsolete"];

export interface AttributeSchema {
  id: string;
  name: string;
  domain: string;               // Food & Beverage, Chemical, Cosmetics …
  fields: { key: string; label: string; type: "number" | "text" | "enum"; unit?: string; options?: string[] }[];
}

export interface UnitDef {
  id: string;
  name: string;
  dimension: "Mass" | "Volume" | "Count" | "Discrete";
  baseMultiplier: number;   // to base unit of dimension (g / mL / ea)
  symbol: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  physicalState: "Solid" | "Liquid" | "Powder" | "Gas";
  baseCost: number;         // per base unit
  unit: string;             // symbol
  schemaId: string;
  attrs: Record<string, string | number>;
  supplier?: string;
  updatedAt: string;
}

export interface RecipeItem {
  id: string;
  refType: "material" | "recipe";
  refId: string;            // material id or child recipe id
  name: string;
  targetPct: number;
  minPct: number;
  maxPct: number;
  unit: string;
  scaling: "proportional" | "fixed";
}

export interface ProcessStep {
  seq: number;
  phase: string;
  parameter: string;
  targetValue: number;
  unit: string;
  durationMin: number;
}

export interface Recipe {
  id: string;
  code: string;
  name: string;
  project: string;
  version: string;
  parentId?: string;
  branchLabel?: string;
  status: RecipeStatus;
  classification: string;
  targetYield: { value: number; unit: string };
  items: RecipeItem[];
  process: ProcessStep[];
  compliance: {
    hazards: string[];
    allergens: string[];
    storageMaxC: number;
    shelfLifeDays: number;
  };
  createdBy: string;
  approvedBy: string[];
  updatedAt: string;
}

export interface Trial {
  id: string;
  recipeId: string;
  recipeName: string;
  batchCode: string;
  operator: string;
  observation: string;
  outcome: "pass" | "fail" | "inconclusive";
  sensory: { color: number; smell: number; texture: number };
  analytics: { key: string; value: number; unit: string }[];
  loggedAt: string;
}

export interface ApiKey {
  id: string;
  label: string;
  tokenPreview: string;
  scopes: string[];
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
  active: boolean;
  callsToday: number;
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  action: string;
  entity: string;
  property: string;
  before: string;
  after: string;
  reason?: string;
  version?: string;
}

export interface StageGateDef {
  id: string;
  name: string;
  gates: { key: string; label: string; requiredRole: Role }[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  lastActive: string;
}

// ---------- SEED ----------
export const schemas: AttributeSchema[] = [
  {
    id: "sch-food",
    name: "Food & Beverage",
    domain: "F&B",
    fields: [
      { key: "allergens", label: "Allergens", type: "text" },
      { key: "calories", label: "Calories", type: "number", unit: "kcal/100g" },
      { key: "fat", label: "Fat", type: "number", unit: "g/100g" },
      { key: "brix", label: "Brix", type: "number", unit: "°Bx" },
    ],
  },
  {
    id: "sch-chem",
    name: "Chemical / Cosmetics",
    domain: "Chemical",
    fields: [
      { key: "cas", label: "CAS Number", type: "text" },
      { key: "viscosity", label: "Viscosity", type: "number", unit: "cP" },
      { key: "ph", label: "pH Level", type: "number" },
      { key: "flashPoint", label: "Flash Point", type: "number", unit: "°C" },
    ],
  },
];

export const units: UnitDef[] = [
  { id: "u-g", name: "Gram", dimension: "Mass", baseMultiplier: 1, symbol: "g" },
  { id: "u-kg", name: "Kilogram", dimension: "Mass", baseMultiplier: 1000, symbol: "kg" },
  { id: "u-mg", name: "Milligram", dimension: "Mass", baseMultiplier: 0.001, symbol: "mg" },
  { id: "u-ml", name: "Milliliter", dimension: "Volume", baseMultiplier: 1, symbol: "mL" },
  { id: "u-l", name: "Liter", dimension: "Volume", baseMultiplier: 1000, symbol: "L" },
  { id: "u-ea", name: "Each", dimension: "Count", baseMultiplier: 1, symbol: "ea" },
  { id: "u-pallet", name: "Pallet", dimension: "Discrete", baseMultiplier: 1, symbol: "plt" },
];

export const materials: Material[] = [
  { id: "MAT-0042", name: "Bio-Based Resin Carrier", category: "Polymer", physicalState: "Liquid", baseCost: 4.85, unit: "kg", schemaId: "sch-chem", attrs: { cas: "9003-35-4", viscosity: 850, ph: 6.8, flashPoint: 62 }, supplier: "Helios Chemicals", updatedAt: "2026-07-08" },
  { id: "MAT-0891", name: "UV-Stabilizer Powder", category: "Additive", physicalState: "Powder", baseCost: 22.4, unit: "kg", schemaId: "sch-chem", attrs: { cas: "2440-22-4", viscosity: 0, ph: 7, flashPoint: 210 }, supplier: "NovaSpec", updatedAt: "2026-07-11" },
  { id: "MAT-0103", name: "Titanium Dioxide", category: "Pigment", physicalState: "Powder", baseCost: 3.2, unit: "kg", schemaId: "sch-chem", attrs: { cas: "13463-67-7", ph: 7.2, flashPoint: 0 }, supplier: "Kronos", updatedAt: "2026-06-30" },
  { id: "MAT-0210", name: "Deionized Water", category: "Solvent", physicalState: "Liquid", baseCost: 0.02, unit: "L", schemaId: "sch-chem", attrs: { cas: "7732-18-5", ph: 7, viscosity: 1 }, updatedAt: "2026-07-01" },
  { id: "MAT-0311", name: "Cocoa Butter", category: "Fat", physicalState: "Solid", baseCost: 12.5, unit: "kg", schemaId: "sch-food", attrs: { allergens: "None", calories: 899, fat: 99.9, brix: 0 }, supplier: "Barry Callebaut", updatedAt: "2026-07-05" },
  { id: "MAT-0312", name: "Cane Sugar", category: "Sweetener", physicalState: "Powder", baseCost: 0.9, unit: "kg", schemaId: "sch-food", attrs: { allergens: "None", calories: 387, fat: 0, brix: 99 }, updatedAt: "2026-06-28" },
  { id: "MAT-0313", name: "Whole Milk Powder", category: "Dairy", physicalState: "Powder", baseCost: 4.1, unit: "kg", schemaId: "sch-food", attrs: { allergens: "Milk", calories: 496, fat: 26, brix: 0 }, updatedAt: "2026-07-02" },
  { id: "MAT-0314", name: "Vanilla Extract", category: "Flavor", physicalState: "Liquid", baseCost: 78, unit: "L", schemaId: "sch-food", attrs: { allergens: "None", calories: 288, fat: 0.1, brix: 20 }, updatedAt: "2026-07-09" },
];

export const recipes: Recipe[] = [
  {
    id: "REC-0001",
    code: "ECO-COAT-V4",
    name: "EcoCoat Blend",
    project: "Project Helios",
    version: "v4.2",
    branchLabel: "Baseline",
    status: "draft",
    classification: "Industrial Coating",
    targetYield: { value: 1000, unit: "kg" },
    items: [
      { id: "i1", refType: "material", refId: "MAT-0042", name: "Bio-Based Resin Carrier", targetPct: 65, minPct: 64.5, maxPct: 65.5, unit: "kg", scaling: "proportional" },
      { id: "i2", refType: "material", refId: "MAT-0891", name: "UV-Stabilizer Powder", targetPct: 2.5, minPct: 2.45, maxPct: 2.55, unit: "kg", scaling: "fixed" },
      { id: "i3", refType: "material", refId: "MAT-0103", name: "Titanium Dioxide", targetPct: 12, minPct: 11.8, maxPct: 12.2, unit: "kg", scaling: "proportional" },
      { id: "i4", refType: "material", refId: "MAT-0210", name: "Deionized Water", targetPct: 20.5, minPct: 20, maxPct: 21, unit: "L", scaling: "proportional" },
    ],
    process: [
      { seq: 1, phase: "High-Shear Mixing", parameter: "RPM", targetValue: 1200, unit: "rpm", durationMin: 25 },
      { seq: 2, phase: "Thermal Curing", parameter: "Target Temperature", targetValue: 85, unit: "°C", durationMin: 45 },
      { seq: 3, phase: "Cool-Down", parameter: "Target Temperature", targetValue: 25, unit: "°C", durationMin: 30 },
    ],
    compliance: { hazards: ["Flammable Liquids - Category 3"], allergens: [], storageMaxC: 25, shelfLifeDays: 365 },
    createdBy: "M. Fahad",
    approvedBy: [],
    updatedAt: "2026-07-13",
  },
  {
    id: "REC-0002",
    code: "ECO-COAT-LOW",
    name: "EcoCoat — Low Cost Variant",
    project: "Project Helios",
    version: "v4.2-A",
    parentId: "REC-0001",
    branchLabel: "Low Cost",
    status: "review",
    classification: "Industrial Coating",
    targetYield: { value: 1000, unit: "kg" },
    items: [
      { id: "i1", refType: "material", refId: "MAT-0042", name: "Bio-Based Resin Carrier", targetPct: 60, minPct: 59.5, maxPct: 60.5, unit: "kg", scaling: "proportional" },
      { id: "i2", refType: "material", refId: "MAT-0891", name: "UV-Stabilizer Powder", targetPct: 1.5, minPct: 1.45, maxPct: 1.55, unit: "kg", scaling: "fixed" },
      { id: "i3", refType: "material", refId: "MAT-0103", name: "Titanium Dioxide", targetPct: 15, minPct: 14.7, maxPct: 15.3, unit: "kg", scaling: "proportional" },
      { id: "i4", refType: "material", refId: "MAT-0210", name: "Deionized Water", targetPct: 23.5, minPct: 23, maxPct: 24, unit: "L", scaling: "proportional" },
    ],
    process: [
      { seq: 1, phase: "High-Shear Mixing", parameter: "RPM", targetValue: 1000, unit: "rpm", durationMin: 30 },
      { seq: 2, phase: "Thermal Curing", parameter: "Target Temperature", targetValue: 80, unit: "°C", durationMin: 50 },
    ],
    compliance: { hazards: ["Flammable Liquids - Category 3"], allergens: [], storageMaxC: 25, shelfLifeDays: 300 },
    createdBy: "M. Fahad",
    approvedBy: [],
    updatedAt: "2026-07-12",
  },
  {
    id: "REC-0003",
    code: "ECO-COAT-PREM",
    name: "EcoCoat — Premium Plasticizer",
    project: "Project Helios",
    version: "v4.2-B",
    parentId: "REC-0001",
    branchLabel: "Premium",
    status: "approved",
    classification: "Industrial Coating",
    targetYield: { value: 500, unit: "kg" },
    items: [
      { id: "i1", refType: "material", refId: "MAT-0042", name: "Bio-Based Resin Carrier", targetPct: 68, minPct: 67.5, maxPct: 68.5, unit: "kg", scaling: "proportional" },
      { id: "i2", refType: "material", refId: "MAT-0891", name: "UV-Stabilizer Powder", targetPct: 3.5, minPct: 3.4, maxPct: 3.6, unit: "kg", scaling: "fixed" },
      { id: "i3", refType: "material", refId: "MAT-0103", name: "Titanium Dioxide", targetPct: 10, minPct: 9.8, maxPct: 10.2, unit: "kg", scaling: "proportional" },
      { id: "i4", refType: "material", refId: "MAT-0210", name: "Deionized Water", targetPct: 18.5, minPct: 18, maxPct: 19, unit: "L", scaling: "proportional" },
    ],
    process: [
      { seq: 1, phase: "High-Shear Mixing", parameter: "RPM", targetValue: 1400, unit: "rpm", durationMin: 20 },
      { seq: 2, phase: "Thermal Curing", parameter: "Target Temperature", targetValue: 90, unit: "°C", durationMin: 40 },
    ],
    compliance: { hazards: ["Flammable Liquids - Category 3"], allergens: [], storageMaxC: 25, shelfLifeDays: 540 },
    createdBy: "L. Chen",
    approvedBy: ["S. Al-Rashid"],
    updatedAt: "2026-07-13",
  },
  {
    id: "REC-0004",
    code: "CHOC-GANACHE-V1",
    name: "Dark Ganache Base",
    project: "Confection R&D",
    version: "v1.0",
    branchLabel: "Baseline",
    status: "released",
    classification: "Food — Filling",
    targetYield: { value: 25, unit: "kg" },
    items: [
      { id: "i1", refType: "material", refId: "MAT-0311", name: "Cocoa Butter", targetPct: 45, minPct: 44.5, maxPct: 45.5, unit: "kg", scaling: "proportional" },
      { id: "i2", refType: "material", refId: "MAT-0312", name: "Cane Sugar", targetPct: 30, minPct: 29.8, maxPct: 30.2, unit: "kg", scaling: "proportional" },
      { id: "i3", refType: "material", refId: "MAT-0313", name: "Whole Milk Powder", targetPct: 22, minPct: 21.8, maxPct: 22.2, unit: "kg", scaling: "proportional" },
      { id: "i4", refType: "material", refId: "MAT-0314", name: "Vanilla Extract", targetPct: 3, minPct: 2.9, maxPct: 3.1, unit: "L", scaling: "fixed" },
    ],
    process: [
      { seq: 1, phase: "Tempering", parameter: "Target Temperature", targetValue: 45, unit: "°C", durationMin: 15 },
      { seq: 2, phase: "Emulsify", parameter: "RPM", targetValue: 600, unit: "rpm", durationMin: 10 },
    ],
    compliance: { hazards: [], allergens: ["Milk"], storageMaxC: 18, shelfLifeDays: 180 },
    createdBy: "N. Al-Sabah",
    approvedBy: ["S. Al-Rashid"],
    updatedAt: "2026-06-28",
  },
  {
    id: "REC-0005",
    code: "ECO-COAT-V3",
    name: "EcoCoat Blend (Archived)",
    project: "Project Helios",
    version: "v3.0",
    branchLabel: "Archived",
    status: "superseded",
    classification: "Industrial Coating",
    targetYield: { value: 1000, unit: "kg" },
    items: [
      { id: "i1", refType: "material", refId: "MAT-0042", name: "Bio-Based Resin Carrier", targetPct: 70, minPct: 69, maxPct: 71, unit: "kg", scaling: "proportional" },
      { id: "i2", refType: "material", refId: "MAT-0210", name: "Deionized Water", targetPct: 30, minPct: 29, maxPct: 31, unit: "L", scaling: "proportional" },
    ],
    process: [],
    compliance: { hazards: [], allergens: [], storageMaxC: 25, shelfLifeDays: 120 },
    createdBy: "M. Fahad",
    approvedBy: [],
    updatedAt: "2026-05-10",
  },
];

export const trials: Trial[] = [
  { id: "TR-1041", recipeId: "REC-0001", recipeName: "EcoCoat Blend v4.2", batchCode: "LAB-24-0812", operator: "R. Ito", observation: "Batch separated at 40°C after 12 min mixing.", outcome: "fail", sensory: { color: 7, smell: 6, texture: 3 }, analytics: [{ key: "Viscosity", value: 920, unit: "cP" }, { key: "pH", value: 6.9, unit: "" }], loggedAt: "2026-07-12 14:22" },
  { id: "TR-1042", recipeId: "REC-0002", recipeName: "EcoCoat Low Cost v4.2-A", batchCode: "LAB-24-0813", operator: "R. Ito", observation: "Texture within spec, slight sedimentation after 48h.", outcome: "inconclusive", sensory: { color: 8, smell: 7, texture: 7 }, analytics: [{ key: "Viscosity", value: 780, unit: "cP" }], loggedAt: "2026-07-13 09:15" },
  { id: "TR-1043", recipeId: "REC-0004", recipeName: "Dark Ganache Base v1.0", batchCode: "PILOT-25-0311", operator: "N. Al-Sabah", observation: "Smooth emulsion, glossy finish, target Brix reached.", outcome: "pass", sensory: { color: 9, smell: 9, texture: 9 }, analytics: [{ key: "Brix", value: 62, unit: "°Bx" }], loggedAt: "2026-06-28 10:04" },
  { id: "TR-1044", recipeId: "REC-0003", recipeName: "EcoCoat Premium v4.2-B", batchCode: "LAB-24-0820", operator: "L. Chen", observation: "Cure time exceeded target by 6 min. Flow visibly higher.", outcome: "pass", sensory: { color: 9, smell: 8, texture: 8 }, analytics: [{ key: "Viscosity", value: 1150, unit: "cP" }], loggedAt: "2026-07-13 16:41" },
];

export const apiKeys: ApiKey[] = [
  { id: "key-01", label: "ERP Nightly Sync", tokenPreview: "rms_live_9f2a3b4c…d0e1", scopes: ["recipes:read", "materials:read"], createdBy: "R. Admin", createdAt: "2026-04-02", expiresAt: "2026-10-02", lastUsed: "2026-07-13 02:00", active: true, callsToday: 148 },
  { id: "key-02", label: "MES Push (Line 3)", tokenPreview: "rms_live_1a2b3c4d…9f0e", scopes: ["recipes:read", "recipes:write"], createdBy: "R. Admin", createdAt: "2026-06-14", expiresAt: null, lastUsed: "2026-07-14 06:12", active: true, callsToday: 34 },
  { id: "key-03", label: "Legacy LIMS", tokenPreview: "rms_live_deadbeef…c0de", scopes: ["materials:read"], createdBy: "R. Admin", createdAt: "2025-11-20", expiresAt: "2026-02-20", lastUsed: "2026-02-19 22:44", active: false, callsToday: 0 },
];

export const auditTrail: AuditEntry[] = [
  { id: "a1", ts: "2026-07-13 14:22:11", user: "M. Fahad", action: "UPDATE", entity: "REC-0001 / item:i1", property: "targetPct", before: "63.0000", after: "65.0000" },
  { id: "a2", ts: "2026-07-13 14:22:11", user: "M. Fahad", action: "UPDATE", entity: "REC-0001 / item:i4", property: "targetPct", before: "22.5000", after: "20.5000" },
  { id: "a3", ts: "2026-07-13 09:15:02", user: "L. Chen", action: "APPROVE", entity: "REC-0003", property: "status", before: "review", after: "approved", reason: "Meets QA spec QS-114", version: "v4.2-B" },
  { id: "a4", ts: "2026-07-12 14:24:00", user: "R. Ito", action: "CREATE", entity: "TR-1041", property: "trial", before: "—", after: "logged" },
  { id: "a5", ts: "2026-07-12 08:00:00", user: "System", action: "TOKEN_USED", entity: "key-01", property: "endpoint", before: "—", after: "GET /materials" },
  { id: "a6", ts: "2026-07-11 17:41:22", user: "R. Admin", action: "REVOKE", entity: "key-03", property: "active", before: "true", after: "false" },
];

export const stageGates: StageGateDef[] = [
  {
    id: "sg-default",
    name: "Controlled Recipe Lifecycle",
    gates: [
      { key: "draft", label: "Draft · Authoring", requiredRole: "Recipe Engineer" },
      { key: "review", label: "Under Review", requiredRole: "QA / Quality Manager" },
      { key: "approved", label: "Approved", requiredRole: "QA / Quality Manager" },
      { key: "released", label: "Released to Production", requiredRole: "Production Manager" },
    ],
  },
];

export const users: UserAccount[] = [
  { id: "u1", name: "M. Fahad", email: "fahad@rms.io", role: "Recipe Engineer", status: "active", lastActive: "2026-07-14 07:02" },
  { id: "u2", name: "L. Chen", email: "chen@rms.io", role: "Recipe Engineer", status: "active", lastActive: "2026-07-13 22:11" },
  { id: "u3", name: "S. Al-Rashid", email: "salma@rms.io", role: "QA / Quality Manager", status: "active", lastActive: "2026-07-14 06:44" },
  { id: "u4", name: "P. Novak", email: "novak@rms.io", role: "Production Manager", status: "active", lastActive: "2026-07-13 18:22" },
  { id: "u5", name: "R. Ito", email: "ito@rms.io", role: "Operator", status: "active", lastActive: "2026-07-14 06:10" },
  { id: "u6", name: "R. Admin", email: "admin@rms.io", role: "RMS Administrator", status: "active", lastActive: "2026-07-14 08:00" },
];

/** Acting identity per simulated role (used for segregation-of-duties checks). */
export const roleActor: Record<Role, string> = {
  "Recipe Engineer": "M. Fahad",
  "QA / Quality Manager": "S. Al-Rashid",
  "Production Manager": "P. Novak",
  "Operator": "R. Ito",
  "RMS Administrator": "R. Admin",
};

export type Permission =
  | "recipe.create" | "recipe.edit" | "recipe.submit" | "recipe.copy" | "recipe.version" | "recipe.compare"
  | "recipe.review" | "recipe.approve" | "recipe.reject" | "recipe.return"
  | "recipe.release" | "recipe.obsolete" | "recipe.execute" | "recipe.download" | "recipe.viewDraft"
  | "execution.record" | "trace.view" | "audit.view" | "validation.configure" | "master.manage"
  | "users.manage" | "integration.manage" | "data.import" | "data.export" | "settings.manage";

const P: Record<Role, Permission[]> = {
  "Recipe Engineer": ["recipe.create", "recipe.edit", "recipe.submit", "recipe.copy", "recipe.version", "recipe.compare", "recipe.viewDraft", "audit.view", "trace.view", "master.manage", "data.export", "data.import"],
  "QA / Quality Manager": ["recipe.review", "recipe.approve", "recipe.reject", "recipe.return", "recipe.compare", "recipe.viewDraft", "recipe.obsolete", "audit.view", "trace.view", "data.export"],
  "Production Manager": ["recipe.release", "recipe.compare", "recipe.download", "recipe.execute", "recipe.obsolete", "trace.view", "audit.view", "data.export"],
  "Operator": ["recipe.execute", "recipe.download", "execution.record", "trace.view"],
  "RMS Administrator": ["users.manage", "validation.configure", "master.manage", "integration.manage", "data.import", "data.export", "settings.manage", "audit.view", "trace.view", "recipe.viewDraft"],
};
export function can(role: Role, perm: Permission): boolean { return P[role].includes(perm); }

export const roleDescriptions: Record<Role, string> = {
  "Recipe Engineer": "Creates and maintains recipes, versions and parameters. Cannot approve or release own recipes.",
  "QA / Quality Manager": "Reviews, approves, rejects or returns recipes; verifies compliance and change history.",
  "Production Manager": "Releases approved recipes to production and monitors production usage.",
  "Operator": "Views and executes released recipes only; records execution data. No modifications.",
  "RMS Administrator": "Configures users, roles, master data, validation rules and integrations. Does not participate in business approvals.",
};

// Role permission matrix (from RMS Features & Roles spec)
const CAPS: [string, Permission][] = [
  ["Create & edit draft recipes / parameters", "recipe.edit"],
  ["Create new versions & copy recipes", "recipe.version"],
  ["Submit recipe for review", "recipe.submit"],
  ["Compare versions & view change history", "recipe.compare"],
  ["Review / approve recipes", "recipe.approve"],
  ["Reject / return recipes for correction", "recipe.reject"],
  ["Release approved recipes to production", "recipe.release"],
  ["Mark recipe obsolete", "recipe.obsolete"],
  ["View & download released recipes", "recipe.download"],
  ["Execute released recipes", "recipe.execute"],
  ["Record execution / batch data", "execution.record"],
  ["View production traceability", "trace.view"],
  ["View audit trail", "audit.view"],
  ["Configure validation rules", "validation.configure"],
  ["Manage master data (materials, units, schemas)", "master.manage"],
  ["Manage users & role assignments", "users.manage"],
  ["Configure MES / QMS / ERP integrations", "integration.manage"],
  ["Import recipes (CSV / Excel / JSON / XML)", "data.import"],
  ["Export recipes & reports", "data.export"],
];
export const roleMatrix: { capability: string; perms: Record<Role, boolean> }[] = CAPS.map(([capability, perm]) => ({
  capability,
  perms: Object.fromEntries(ROLES.map((r) => [r, can(r, perm)])) as Record<Role, boolean>,
}));

// ---------- Validation rules ----------
export type RuleKind = "required_param" | "min_max" | "data_type" | "required_step" | "required_ref" | "sum_100" | "equipment_compat";
export interface ValidationRule {
  id: string; name: string; kind: RuleKind; enabled: boolean; severity: "error" | "warning";
  config: Record<string, string | number>;
}
export const validationRules: ValidationRule[] = [
  { id: "VR-01", name: "Composition sums to 100%", kind: "sum_100", enabled: true, severity: "error", config: { tolerance: 0.01 } },
  { id: "VR-02", name: "Target within min / max limits", kind: "min_max", enabled: true, severity: "error", config: {} },
  { id: "VR-03", name: "At least one process step", kind: "required_step", enabled: true, severity: "error", config: { minSteps: 1 } },
  { id: "VR-04", name: "Mixing step required", kind: "required_step", enabled: false, severity: "warning", config: { phaseContains: "Mix" } },
  { id: "VR-05", name: "All references exist in master data", kind: "required_ref", enabled: true, severity: "error", config: {} },
  { id: "VR-06", name: "Process parameter values numeric & > 0 duration", kind: "data_type", enabled: true, severity: "error", config: {} },
  { id: "VR-07", name: "Temperature ≤ equipment max", kind: "equipment_compat", enabled: true, severity: "warning", config: { maxTempC: 120 } },
  { id: "VR-08", name: "Required parameter: shelf life", kind: "required_param", enabled: true, severity: "warning", config: { field: "shelfLifeDays" } },
];

export interface ValidationIssue { ruleId: string; rule: string; severity: "error" | "warning"; message: string }
export function validateRecipe(r: Recipe, rules: ValidationRule[], mats: Material[], all: Recipe[]): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  for (const rule of rules.filter((x) => x.enabled)) {
    const push = (message: string) => out.push({ ruleId: rule.id, rule: rule.name, severity: rule.severity, message });
    switch (rule.kind) {
      case "sum_100": {
        const t = r.items.reduce((a, i) => a + i.targetPct, 0);
        if (Math.abs(t - 100) > Number(rule.config.tolerance ?? 0.01)) push(`Composition totals ${t.toFixed(3)}%`);
        break;
      }
      case "min_max": r.items.forEach((i) => { if (i.targetPct < i.minPct || i.targetPct > i.maxPct) push(`${i.name} target ${i.targetPct}% outside ${i.minPct}–${i.maxPct}%`); }); break;
      case "required_step": {
        const min = Number(rule.config.minSteps ?? 0);
        if (min && r.process.length < min) push(`Requires ≥ ${min} process step(s)`);
        const pc = rule.config.phaseContains as string | undefined;
        if (pc && !r.process.some((p) => p.phase.toLowerCase().includes(pc.toLowerCase()))) push(`Missing step containing "${pc}"`);
        break;
      }
      case "required_ref": r.items.forEach((i) => {
        const ok = i.refType === "material" ? mats.some((m) => m.id === i.refId) : all.some((x) => x.id === i.refId);
        if (!ok) push(`Reference ${i.refId} not found`);
      }); break;
      case "data_type": r.process.forEach((p) => { if (!Number.isFinite(p.targetValue) || p.durationMin <= 0) push(`Step ${p.seq} has invalid value/duration`); }); break;
      case "equipment_compat": r.process.forEach((p) => { if (p.unit === "°C" && p.targetValue > Number(rule.config.maxTempC ?? 999)) push(`Step ${p.seq} ${p.targetValue}°C exceeds equipment max ${rule.config.maxTempC}°C`); }); break;
      case "required_param": {
        const f = String(rule.config.field ?? "");
        const v = (r.compliance as Record<string, unknown>)[f];
        if (v === undefined || v === null || v === "" || v === 0) push(`Parameter "${f}" is required`);
        break;
      }
    }
  }
  return out;
}

// ---------- Production execution / traceability ----------
export interface ExecutionRecord {
  id: string; recipeId: string; recipeCode: string; version: string;
  productionOrder: string; batch: string; equipment: string; line: string;
  operator: string; startedAt: string; finishedAt: string | null;
  status: "dispatched" | "running" | "completed" | "aborted";
  source: "MES" | "Manual"; qcStatus: "pending" | "passed" | "failed";
  actualYield?: number; notes?: string;
}
export const executions: ExecutionRecord[] = [
  { id: "EX-3001", recipeId: "REC-0004", recipeCode: "CHOC-GANACHE-V1", version: "v1.0", productionOrder: "PO-26-1182", batch: "B-260701-01", equipment: "Mixer MX-04", line: "Line 2", operator: "R. Ito", startedAt: "2026-07-01 06:10", finishedAt: "2026-07-01 07:02", status: "completed", source: "MES", qcStatus: "passed", actualYield: 24.6 },
  { id: "EX-3002", recipeId: "REC-0004", recipeCode: "CHOC-GANACHE-V1", version: "v1.0", productionOrder: "PO-26-1207", batch: "B-260709-02", equipment: "Mixer MX-04", line: "Line 2", operator: "R. Ito", startedAt: "2026-07-09 13:40", finishedAt: "2026-07-09 14:35", status: "completed", source: "MES", qcStatus: "failed", actualYield: 23.1, notes: "Viscosity OOS — NCR raised in CORTA QC" },
  { id: "EX-3003", recipeId: "REC-0004", recipeCode: "CHOC-GANACHE-V1", version: "v1.0", productionOrder: "PO-26-1231", batch: "B-260714-01", equipment: "Mixer MX-02", line: "Line 1", operator: "R. Ito", startedAt: "2026-07-14 06:00", finishedAt: null, status: "running", source: "MES", qcStatus: "pending" },
];

// ---------- Integrations ----------
export interface IntegrationEndpoint {
  id: string; system: string; kind: "MES" | "QMS" | "ERP" | "Equipment"; direction: "outbound" | "inbound" | "bidirectional";
  baseUrl: string; status: "connected" | "degraded" | "disconnected"; lastSync: string;
  events: string[]; messagesToday: number;
}
export const integrations: IntegrationEndpoint[] = [
  { id: "INT-MES", system: "MES Command Center", kind: "MES", direction: "bidirectional", baseUrl: "https://mes.cortanex.local/api/v1", status: "connected", lastSync: "2026-07-14 08:02", events: ["recipe.released → MES", "recipe.obsoleted → MES", "execution.started ← MES", "execution.completed ← MES"], messagesToday: 212 },
  { id: "INT-QMS", system: "CORTA QC System", kind: "QMS", direction: "bidirectional", baseUrl: "https://qc.cortanex.local/api/v1", status: "connected", lastSync: "2026-07-14 07:55", events: ["recipe.approved → QMS (spec sync)", "inspection.result ← QMS", "ncr.raised ← QMS", "change.request ↔ QMS"], messagesToday: 87 },
  { id: "INT-ERP", system: "ERP (Materials & Orders)", kind: "ERP", direction: "inbound", baseUrl: "https://erp.cortanex.local/odata", status: "degraded", lastSync: "2026-07-14 02:00", events: ["material.master ← ERP", "production.order ← ERP"], messagesToday: 148 },
  { id: "INT-EQ", system: "Equipment / PLC Gateway", kind: "Equipment", direction: "outbound", baseUrl: "opc.tcp://plc-gw.cortanex.local:4840", status: "disconnected", lastSync: "2026-07-12 18:20", events: ["recipe.download → PLC"], messagesToday: 0 },
];

export const apiCatalog: { method: "GET" | "POST" | "PUT" | "DELETE"; path: string; desc: string }[] = [
  { method: "GET", path: "/recipes", desc: "List / search recipes" },
  { method: "POST", path: "/recipes", desc: "Create recipe draft" },
  { method: "GET", path: "/recipes/{id}", desc: "Retrieve recipe" },
  { method: "PUT", path: "/recipes/{id}", desc: "Update draft (403 RECIPE_STATE_LOCKED otherwise)" },
  { method: "POST", path: "/recipes/{id}/versions", desc: "Create new version" },
  { method: "POST", path: "/recipes/{id}/status", desc: "Workflow transition (submit/approve/reject/return/release/obsolete)" },
  { method: "POST", path: "/recipes/{id}/validate", desc: "Run validation rules" },
  { method: "GET", path: "/recipes/released", desc: "Released recipes for MES / equipment" },
  { method: "GET", path: "/recipes/{id}/download", desc: "Download released recipe (JSON/XML)" },
  { method: "GET", path: "/recipes/{id}/history", desc: "Version & audit history" },
  { method: "POST", path: "/executions", desc: "Record production execution (from MES)" },
  { method: "POST", path: "/quality/results", desc: "Receive QC results (from CORTA QC)" },
];

// Small computed helpers
export function recipeCost(r: Recipe, mats: Material[]): number {
  const yieldKg = r.targetYield.value;
  return r.items.reduce((acc, it) => {
    const m = mats.find((x) => x.id === it.refId);
    if (!m) return acc;
    return acc + (yieldKg * it.targetPct) / 100 * m.baseCost;
  }, 0);
}

export function statusLabel(s: RecipeStatus): string {
  return ({ draft: "Draft", review: "Under Review", rejected: "Rejected", approved: "Approved", released: "Released", superseded: "Superseded", obsolete: "Obsolete" } as const)[s];
}

export function statusTone(s: RecipeStatus): string {
  return ({ draft: "info", review: "warning", rejected: "destructive", approved: "accent", released: "success", superseded: "muted-foreground", obsolete: "muted-foreground" } as const)[s];
}

// projects grouping
export function groupedProjects(rs: Recipe[]) {
  const map = new Map<string, Recipe[]>();
  rs.forEach((r) => {
    const arr = map.get(r.project) ?? [];
    arr.push(r);
    map.set(r.project, arr);
  });
  return Array.from(map.entries()).map(([project, items]) => ({ project, items }));
}

// KPI-ish
export const rmsKpis = {
  totalRecipes: recipes.length,
  released: recipes.filter((r) => r.status === "released").length,
  inReview: recipes.filter((r) => ["review", "approved"].includes(r.status)).length,
  failed: recipes.filter((r) => ["rejected", "obsolete", "superseded"].includes(r.status)).length,
  materials: materials.length,
  trials: trials.length,
  activeKeys: apiKeys.filter((k) => k.active).length,
};

export const activityTrend = Array.from({ length: 12 }, (_, i) => ({
  day: `D-${11 - i}`,
  drafts: Math.round(6 + Math.sin(i / 2) * 3 + Math.random() * 2),
  trials: Math.round(4 + Math.cos(i / 2) * 2 + Math.random() * 3),
  releases: Math.round(1 + Math.random() * 2),
}));
