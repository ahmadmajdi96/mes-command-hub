import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import * as data from "./rms-data";

type Store = {
  role: data.Role;
  setRole: (r: data.Role) => void;

  materials: data.Material[];
  recipes: data.Recipe[];
  trials: data.Trial[];
  apiKeys: data.ApiKey[];
  schemas: data.AttributeSchema[];
  units: data.UnitDef[];
  users: data.UserAccount[];
  audit: data.AuditEntry[];
  actor: string;
  can: (p: data.Permission) => boolean;
  rules: data.ValidationRule[];
  executions: data.ExecutionRecord[];
  integrations: data.IntegrationEndpoint[];
  logAudit: (e: Omit<data.AuditEntry, "id" | "ts" | "user">) => void;
  transition: (recipeId: string, action: WorkflowAction, reason: string) => { ok: boolean; error?: string };
  newVersion: (recipeId: string, reason: string) => string | null;
  copyRecipe: (recipeId: string) => string | null;
  addRule: (r: Omit<data.ValidationRule, "id">) => void;
  updateRule: (id: string, patch: Partial<data.ValidationRule>) => void;
  deleteRule: (id: string) => void;
  addExecution: (e: Omit<data.ExecutionRecord, "id">) => void;
  updateExecution: (id: string, patch: Partial<data.ExecutionRecord>) => void;
  updateIntegration: (id: string, patch: Partial<data.IntegrationEndpoint>) => void;
  importRecipes: (rs: data.Recipe[]) => number;

  // Materials
  addMaterial: (m: Omit<data.Material, "id" | "updatedAt">) => void;
  updateMaterial: (id: string, patch: Partial<data.Material>) => void;
  deleteMaterial: (id: string) => void;

  // Recipes
  addRecipe: (r: Omit<data.Recipe, "id" | "updatedAt" | "items" | "process" | "approvedBy"> & { items?: data.RecipeItem[]; process?: data.ProcessStep[] }) => void;
  updateRecipe: (id: string, patch: Partial<data.Recipe>) => void;
  deleteRecipe: (id: string) => void;

  // Recipe items
  addRecipeItem: (recipeId: string, it: Omit<data.RecipeItem, "id">) => void;
  updateRecipeItem: (recipeId: string, itemId: string, patch: Partial<data.RecipeItem>) => void;
  removeRecipeItem: (recipeId: string, itemId: string) => void;

  // Process steps
  addProcessStep: (recipeId: string, p: Omit<data.ProcessStep, "seq">) => void;
  updateProcessStep: (recipeId: string, seq: number, patch: Partial<data.ProcessStep>) => void;
  removeProcessStep: (recipeId: string, seq: number) => void;

  // Trials
  addTrial: (t: Omit<data.Trial, "id" | "loggedAt">) => void;
  updateTrial: (id: string, patch: Partial<data.Trial>) => void;
  deleteTrial: (id: string) => void;

  // API keys
  addApiKey: (k: Omit<data.ApiKey, "id" | "createdAt" | "lastUsed" | "active" | "callsToday" | "tokenPreview">) => void;
  revokeKey: (id: string) => void;
  deleteApiKey: (id: string) => void;

  // Schemas
  addSchema: (s: Omit<data.AttributeSchema, "id" | "fields">) => void;
  updateSchema: (id: string, patch: Partial<data.AttributeSchema>) => void;
  deleteSchema: (id: string) => void;
  addSchemaField: (schemaId: string, f: data.AttributeSchema["fields"][number]) => void;
  updateSchemaField: (schemaId: string, key: string, patch: Partial<data.AttributeSchema["fields"][number]>) => void;
  removeSchemaField: (schemaId: string, key: string) => void;

  // Units
  addUnit: (u: Omit<data.UnitDef, "id">) => void;
  updateUnit: (id: string, patch: Partial<data.UnitDef>) => void;
  deleteUnit: (id: string) => void;

  // Users
  addUser: (u: Omit<data.UserAccount, "id" | "lastActive">) => void;
  updateUser: (id: string, patch: Partial<data.UserAccount>) => void;
  deleteUser: (id: string) => void;

  // Workflow
  moveGate: (recipeId: string, next: data.RecipeStatus) => void;
};

export type WorkflowAction = "submit" | "approve" | "reject" | "return" | "release" | "obsolete";
export const ACTION_META: Record<WorkflowAction, { label: string; from: data.RecipeStatus[]; to: data.RecipeStatus; perm: data.Permission }> = {
  submit: { label: "Submit for review", from: ["draft", "rejected"], to: "review", perm: "recipe.submit" },
  approve: { label: "Approve", from: ["review"], to: "approved", perm: "recipe.approve" },
  reject: { label: "Reject", from: ["review"], to: "rejected", perm: "recipe.reject" },
  return: { label: "Return for correction", from: ["review", "approved"], to: "draft", perm: "recipe.return" },
  release: { label: "Release to production", from: ["approved"], to: "released", perm: "recipe.release" },
  obsolete: { label: "Mark obsolete", from: ["released", "approved", "superseded"], to: "obsolete", perm: "recipe.obsolete" },
};

const Ctx = createContext<Store | null>(null);

const nowStamp = () => new Date().toISOString().slice(0, 10);
const nowStampFull = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function RmsStoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<data.Role>("Recipe Engineer");
  const [materials, setMaterials] = useState<data.Material[]>(data.materials);
  const [recipes, setRecipes] = useState<data.Recipe[]>(data.recipes);
  const [trials, setTrials] = useState<data.Trial[]>(data.trials);
  const [apiKeys, setApiKeys] = useState<data.ApiKey[]>(data.apiKeys);
  const [schemas, setSchemas] = useState<data.AttributeSchema[]>(data.schemas);
  const [units, setUnits] = useState<data.UnitDef[]>(data.units);
  const [users, setUsers] = useState<data.UserAccount[]>(data.users);
  const [audit, setAudit] = useState<data.AuditEntry[]>(data.auditTrail);
  const [rules, setRules] = useState<data.ValidationRule[]>(data.validationRules);
  const [executions, setExecutions] = useState<data.ExecutionRecord[]>(data.executions);
  const [integrations, setIntegrations] = useState<data.IntegrationEndpoint[]>(data.integrations);
  const actor = data.roleActor[role];

  const logAudit = (e: Omit<data.AuditEntry, "id" | "ts" | "user">) =>
    setAudit((prev) => [{ ...e, id: rid("a"), ts: new Date().toISOString().slice(0, 19).replace("T", " "), user: actor }, ...prev]);

  const value = useMemo<Store>(() => ({
    role, setRole,
    materials, recipes, trials, apiKeys, schemas, units, users, audit,
    actor, can: (p) => data.can(role, p), rules, executions, integrations, logAudit,
    transition: (recipeId, action, reason) => {
      const r = recipes.find((x) => x.id === recipeId);
      const meta = ACTION_META[action];
      if (!r) return { ok: false, error: "Recipe not found" };
      if (!data.can(role, meta.perm)) return { ok: false, error: `Role "${role}" is not permitted to ${action}` };
      if (!meta.from.includes(r.status)) return { ok: false, error: `Cannot ${action} from ${data.statusLabel(r.status)}` };
      if ((action === "approve" || action === "release") && r.createdBy === actor) return { ok: false, error: "Segregation of duties: authors cannot approve or release their own recipe" };
      if (["reject", "return", "obsolete"].includes(action) && !reason.trim()) return { ok: false, error: "A reason is required" };
      if (action === "submit" || action === "approve" || action === "release") {
        const errs = data.validateRecipe(r, rules, materials, recipes).filter((i) => i.severity === "error");
        if (errs.length) return { ok: false, error: `Validation failed: ${errs[0].message}${errs.length > 1 ? ` (+${errs.length - 1} more)` : ""}` };
      }
      setRecipes((prev) => prev.map((x) => {
        if (x.id === recipeId) return { ...x, status: meta.to, updatedAt: nowStamp(), approvedBy: action === "approve" ? [...x.approvedBy, actor] : x.approvedBy };
        // releasing a version supersedes the previously released version of the same code family
        if (action === "release" && x.status === "released" && x.code === r.code) return { ...x, status: "superseded" };
        return x;
      }));
      logAudit({ action: action.toUpperCase(), entity: recipeId, property: "status", before: r.status, after: meta.to, reason: reason || undefined, version: r.version });
      return { ok: true };
    },
    newVersion: (recipeId, reason) => {
      const r = recipes.find((x) => x.id === recipeId);
      if (!r || !data.can(role, "recipe.version")) return null;
      const id = rid("REC");
      const m = r.version.match(/^v(\d+)\.(\d+)/);
      const version = m ? `v${m[1]}.${Number(m[2]) + 1}` : `${r.version}.1`;
      setRecipes((prev) => [{ ...structuredClone(r), id, version, status: "draft", approvedBy: [], createdBy: actor, updatedAt: nowStamp() }, ...prev]);
      logAudit({ action: "NEW_VERSION", entity: id, property: "version", before: r.version, after: version, reason, version });
      return id;
    },
    copyRecipe: (recipeId) => {
      const r = recipes.find((x) => x.id === recipeId);
      if (!r || !data.can(role, "recipe.copy")) return null;
      const id = rid("REC");
      setRecipes((prev) => [{ ...structuredClone(r), id, code: `${r.code}-COPY`, name: `${r.name} (copy)`, version: "v1.0", parentId: undefined, status: "draft", approvedBy: [], createdBy: actor, updatedAt: nowStamp() }, ...prev]);
      logAudit({ action: "COPY", entity: id, property: "source", before: "—", after: recipeId });
      return id;
    },
    addRule: (r) => { setRules((p) => [...p, { ...r, id: rid("VR") }]); logAudit({ action: "CREATE", entity: "validation_rule", property: "name", before: "—", after: r.name }); },
    updateRule: (id, patch) => setRules((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r)),
    deleteRule: (id) => setRules((p) => p.filter((r) => r.id !== id)),
    addExecution: (e) => { const id = rid("EX"); setExecutions((p) => [{ ...e, id }, ...p]); logAudit({ action: "EXECUTE", entity: e.recipeId, property: "batch", before: "—", after: `${e.batch} / ${e.productionOrder}`, version: e.version }); },
    updateExecution: (id, patch) => setExecutions((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x)),
    updateIntegration: (id, patch) => setIntegrations((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x)),
    importRecipes: (rs) => {
      setRecipes((prev) => [...rs.map((r) => ({ ...r, id: rid("REC"), status: "draft" as const, approvedBy: [], createdBy: actor, updatedAt: nowStamp() })), ...prev]);
      logAudit({ action: "IMPORT", entity: "recipes", property: "count", before: "0", after: String(rs.length) });
      return rs.length;
    },

    addMaterial: (m) => setMaterials((prev) => [{ ...m, id: rid("MAT"), updatedAt: nowStamp() }, ...prev]),
    updateMaterial: (id, patch) => setMaterials((prev) => prev.map((x) => x.id === id ? { ...x, ...patch, updatedAt: nowStamp() } : x)),
    deleteMaterial: (id) => setMaterials((prev) => prev.filter((x) => x.id !== id)),

    addRecipe: (r) => setRecipes((prev) => [{
      ...r, id: rid("REC"), updatedAt: nowStamp(),
      items: r.items ?? [], process: r.process ?? [], approvedBy: [],
    } as data.Recipe, ...prev]),
    updateRecipe: (id, patch) => setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, ...patch, updatedAt: nowStamp() } : r)),
    deleteRecipe: (id) => setRecipes((prev) => prev.filter((r) => r.id !== id)),

    addRecipeItem: (recipeId, it) => setRecipes((prev) => prev.map((r) => r.id !== recipeId ? r : {
      ...r, updatedAt: nowStamp(),
      items: [...r.items, { ...it, id: `it_${Date.now().toString(36)}` }],
    })),
    updateRecipeItem: (recipeId, itemId, patch) => setRecipes((prev) => prev.map((r) => r.id !== recipeId ? r : {
      ...r, updatedAt: nowStamp(),
      items: r.items.map((it) => it.id === itemId ? { ...it, ...patch } : it),
    })),
    removeRecipeItem: (recipeId, itemId) => setRecipes((prev) => prev.map((r) => r.id !== recipeId ? r : {
      ...r, updatedAt: nowStamp(), items: r.items.filter((it) => it.id !== itemId),
    })),

    addProcessStep: (recipeId, p) => setRecipes((prev) => prev.map((r) => r.id !== recipeId ? r : {
      ...r, updatedAt: nowStamp(),
      process: [...r.process, { ...p, seq: (r.process.at(-1)?.seq ?? 0) + 1 }],
    })),
    updateProcessStep: (recipeId, seq, patch) => setRecipes((prev) => prev.map((r) => r.id !== recipeId ? r : {
      ...r, updatedAt: nowStamp(),
      process: r.process.map((p) => p.seq === seq ? { ...p, ...patch } : p),
    })),
    removeProcessStep: (recipeId, seq) => setRecipes((prev) => prev.map((r) => r.id !== recipeId ? r : {
      ...r, updatedAt: nowStamp(),
      process: r.process.filter((p) => p.seq !== seq).map((p, i) => ({ ...p, seq: i + 1 })),
    })),

    addTrial: (t) => setTrials((prev) => [{ ...t, id: rid("TR"), loggedAt: nowStampFull() }, ...prev]),
    updateTrial: (id, patch) => setTrials((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t)),
    deleteTrial: (id) => setTrials((prev) => prev.filter((t) => t.id !== id)),

    addApiKey: (k) => setApiKeys((prev) => [{
      ...k, id: rid("KEY"), createdAt: nowStamp(), lastUsed: null, active: true, callsToday: 0,
      tokenPreview: `rms_live_${Math.random().toString(36).slice(2, 10)}…${Math.random().toString(36).slice(2, 6)}`,
    }, ...prev]),
    revokeKey: (id) => setApiKeys((prev) => prev.map((k) => k.id === id ? { ...k, active: false } : k)),
    deleteApiKey: (id) => setApiKeys((prev) => prev.filter((k) => k.id !== id)),

    addSchema: (s) => setSchemas((prev) => [...prev, { ...s, id: rid("sch"), fields: [] }]),
    updateSchema: (id, patch) => setSchemas((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s)),
    deleteSchema: (id) => setSchemas((prev) => prev.filter((s) => s.id !== id)),
    addSchemaField: (schemaId, f) => setSchemas((prev) => prev.map((s) => s.id !== schemaId ? s : { ...s, fields: [...s.fields, f] })),
    updateSchemaField: (schemaId, key, patch) => setSchemas((prev) => prev.map((s) => s.id !== schemaId ? s : {
      ...s, fields: s.fields.map((f) => f.key === key ? { ...f, ...patch } : f),
    })),
    removeSchemaField: (schemaId, key) => setSchemas((prev) => prev.map((s) => s.id !== schemaId ? s : {
      ...s, fields: s.fields.filter((f) => f.key !== key),
    })),

    addUnit: (u) => setUnits((prev) => [...prev, { ...u, id: rid("u") }]),
    updateUnit: (id, patch) => setUnits((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u)),
    deleteUnit: (id) => setUnits((prev) => prev.filter((u) => u.id !== id)),

    addUser: (u) => setUsers((prev) => [...prev, { ...u, id: rid("u"), lastActive: "—" }]),
    updateUser: (id, patch) => setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u)),
    deleteUser: (id) => setUsers((prev) => prev.filter((u) => u.id !== id)),

    moveGate: (recipeId, next) => setRecipes((prev) => prev.map((r) => r.id === recipeId ? { ...r, status: next, updatedAt: nowStamp() } : r)),
  }), [role, actor, materials, recipes, trials, apiKeys, schemas, units, users, audit, rules, executions, integrations]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRms(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRms outside provider");
  return c;
}
