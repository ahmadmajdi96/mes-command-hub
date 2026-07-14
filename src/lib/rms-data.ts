// Demo data for the R&D Recipe Management System (RMS).
// Industry-agnostic — materials carry generic attrs; recipes nest sub-recipes.

export type RecipeStatus = "draft" | "review" | "regulatory" | "costing" | "released" | "failed" | "abandoned";
export type Role = "System Admin" | "R&D Lead Scientist" | "Regulatory / QA" | "Procurement / Operations";

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
    status: "regulatory",
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
    approvedBy: [],
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
    approvedBy: ["user_regulatory", "user_rd_director"],
    updatedAt: "2026-06-28",
  },
  {
    id: "REC-0005",
    code: "ECO-COAT-V3",
    name: "EcoCoat Blend (Archived)",
    project: "Project Helios",
    version: "v3.0",
    branchLabel: "Archived",
    status: "abandoned",
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
  { id: "key-01", label: "ERP Nightly Sync", tokenPreview: "rms_live_9f2a3b4c…d0e1", scopes: ["recipes:read", "materials:read"], createdBy: "System Admin", createdAt: "2026-04-02", expiresAt: "2026-10-02", lastUsed: "2026-07-13 02:00", active: true, callsToday: 148 },
  { id: "key-02", label: "MES Push (Line 3)", tokenPreview: "rms_live_1a2b3c4d…9f0e", scopes: ["recipes:read", "recipes:write"], createdBy: "System Admin", createdAt: "2026-06-14", expiresAt: null, lastUsed: "2026-07-14 06:12", active: true, callsToday: 34 },
  { id: "key-03", label: "Legacy LIMS", tokenPreview: "rms_live_deadbeef…c0de", scopes: ["materials:read"], createdBy: "System Admin", createdAt: "2025-11-20", expiresAt: "2026-02-20", lastUsed: "2026-02-19 22:44", active: false, callsToday: 0 },
];

export const auditTrail: AuditEntry[] = [
  { id: "a1", ts: "2026-07-13 14:22:11", user: "M. Fahad", action: "UPDATE", entity: "REC-0001 / item:i1", property: "targetPct", before: "63.0000", after: "65.0000" },
  { id: "a2", ts: "2026-07-13 14:22:11", user: "M. Fahad", action: "UPDATE", entity: "REC-0001 / item:i4", property: "targetPct", before: "22.5000", after: "20.5000" },
  { id: "a3", ts: "2026-07-13 09:15:02", user: "L. Chen", action: "GATE_MOVE", entity: "REC-0003", property: "status", before: "review", after: "regulatory" },
  { id: "a4", ts: "2026-07-12 14:24:00", user: "R. Ito", action: "CREATE", entity: "TR-1041", property: "trial", before: "—", after: "logged" },
  { id: "a5", ts: "2026-07-12 08:00:00", user: "System", action: "TOKEN_USED", entity: "key-01", property: "endpoint", before: "—", after: "GET /materials" },
  { id: "a6", ts: "2026-07-11 17:41:22", user: "System Admin", action: "REVOKE", entity: "key-03", property: "active", before: "true", after: "false" },
];

export const stageGates: StageGateDef[] = [
  {
    id: "sg-default",
    name: "Default R&D Pipeline",
    gates: [
      { key: "draft", label: "Draft / Lab Phase", requiredRole: "R&D Lead Scientist" },
      { key: "review", label: "Peer Review", requiredRole: "R&D Lead Scientist" },
      { key: "regulatory", label: "Regulatory Checklist", requiredRole: "Regulatory / QA" },
      { key: "costing", label: "Costing Sign-Off", requiredRole: "Procurement / Operations" },
      { key: "released", label: "Released / Handover", requiredRole: "System Admin" },
    ],
  },
];

export const users: UserAccount[] = [
  { id: "u1", name: "M. Fahad", email: "fahad@rms.io", role: "R&D Lead Scientist", status: "active", lastActive: "2026-07-14 07:02" },
  { id: "u2", name: "L. Chen", email: "chen@rms.io", role: "R&D Lead Scientist", status: "active", lastActive: "2026-07-13 22:11" },
  { id: "u3", name: "S. Al-Rashid", email: "salma@rms.io", role: "Regulatory / QA", status: "active", lastActive: "2026-07-14 06:44" },
  { id: "u4", name: "P. Novak", email: "novak@rms.io", role: "Procurement / Operations", status: "active", lastActive: "2026-07-13 18:22" },
  { id: "u5", name: "R. Admin", email: "admin@rms.io", role: "System Admin", status: "active", lastActive: "2026-07-14 08:00" },
  { id: "u6", name: "R. Ito", email: "ito@rms.io", role: "R&D Lead Scientist", status: "invited", lastActive: "—" },
];

// Role permission matrix (from spec §14)
export const roleMatrix: { capability: string; perms: Record<Role, boolean> }[] = [
  { capability: "Manage API Keys & Security Settings", perms: { "System Admin": true, "R&D Lead Scientist": false, "Regulatory / QA": false, "Procurement / Operations": false } },
  { capability: "Configure System Retention Policies", perms: { "System Admin": true, "R&D Lead Scientist": false, "Regulatory / QA": false, "Procurement / Operations": false } },
  { capability: "Create / Modify Raw Material Masters", perms: { "System Admin": true, "R&D Lead Scientist": true, "Regulatory / QA": false, "Procurement / Operations": false } },
  { capability: "Update Ingredient Unit Market Costs", perms: { "System Admin": true, "R&D Lead Scientist": false, "Regulatory / QA": false, "Procurement / Operations": true } },
  { capability: "Create & Edit Formula Working Drafts", perms: { "System Admin": true, "R&D Lead Scientist": true, "Regulatory / QA": false, "Procurement / Operations": false } },
  { capability: "Log Laboratory Trial Outcomes", perms: { "System Admin": true, "R&D Lead Scientist": true, "Regulatory / QA": false, "Procurement / Operations": false } },
  { capability: "Approve Regulatory Gate", perms: { "System Admin": true, "R&D Lead Scientist": false, "Regulatory / QA": true, "Procurement / Operations": false } },
  { capability: "Approve Costing Gate", perms: { "System Admin": true, "R&D Lead Scientist": false, "Regulatory / QA": false, "Procurement / Operations": true } },
  { capability: "Release Master Recipe", perms: { "System Admin": true, "R&D Lead Scientist": false, "Regulatory / QA": false, "Procurement / Operations": false } },
  { capability: "Configure Attribute Schemas", perms: { "System Admin": true, "R&D Lead Scientist": true, "Regulatory / QA": false, "Procurement / Operations": false } },
  { capability: "View Audit Trail", perms: { "System Admin": true, "R&D Lead Scientist": true, "Regulatory / QA": true, "Procurement / Operations": true } },
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
  return ({ draft: "Draft", review: "Peer Review", regulatory: "Regulatory", costing: "Costing", released: "Released", failed: "Failed", abandoned: "Abandoned" } as const)[s];
}

export function statusTone(s: RecipeStatus): string {
  return ({ draft: "info", review: "warning", regulatory: "accent", costing: "accent", released: "success", failed: "destructive", abandoned: "muted-foreground" } as const)[s];
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
  inReview: recipes.filter((r) => ["review", "regulatory", "costing"].includes(r.status)).length,
  failed: recipes.filter((r) => ["failed", "abandoned"].includes(r.status)).length,
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
