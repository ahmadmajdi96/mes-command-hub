import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as data from "./rms-data";

export type WorkflowAction = "submit" | "approve" | "reject" | "return" | "release" | "obsolete";
export const ACTION_META: Record<WorkflowAction, { label: string; from: data.RecipeStatus[]; to: data.RecipeStatus; perm: data.Permission }> = {
  submit: { label: "Submit for review", from: ["draft", "rejected"], to: "review", perm: "recipe.submit" },
  approve: { label: "Approve", from: ["review"], to: "approved", perm: "recipe.approve" },
  reject: { label: "Reject", from: ["review"], to: "rejected", perm: "recipe.reject" },
  return: { label: "Return for correction", from: ["review", "approved"], to: "draft", perm: "recipe.return" },
  release: { label: "Release to production", from: ["approved"], to: "released", perm: "recipe.release" },
  obsolete: { label: "Mark obsolete", from: ["released", "approved", "superseded"], to: "obsolete", perm: "recipe.obsolete" },
};

type DbRole = "recipe_engineer" | "qa_manager" | "production_manager" | "operator" | "admin";
export const ROLE_TO_DB: Record<data.Role, DbRole> = {
  "Recipe Engineer": "recipe_engineer",
  "QA / Quality Manager": "qa_manager",
  "Production Manager": "production_manager",
  "Operator": "operator",
  "RMS Administrator": "admin",
};
const DB_TO_ROLE = Object.fromEntries(Object.entries(ROLE_TO_DB).map(([k, v]) => [v, k])) as Record<DbRole, data.Role>;

export interface AppUser { id: string; name: string; email: string; status: string; roles: data.Role[] }

type Kind = "material" | "unit" | "schema" | "trial" | "api_key" | "validation_rule" | "execution" | "integration" | "setting";

export interface ApiKeyRow { id: string; label: string; prefix: string; scopes: string[]; expires_at: string | null; active: boolean; created_by_name: string; created_at: string; last_used_at: string | null; call_count: number }
export interface NotificationRow { id: number; title: string; body: string; link: string | null; read: boolean; created_at: string }
export interface IntegrationMessage { id: number; integration_id: string; direction: string; event: string; status: string; response: string | null; attempts: number; created_at: string; payload: unknown }
export type Settings = { workflow: { qaApprovalsRequired: number; reviewSlaDays: number; requireSignature: boolean }; organization: { name: string; timezone: string; codePrefix: string; defaultUnit: string; sessionTimeoutMin: number }; retention: { auditYears: number; releasedRecipes: string; draftIdleDays: number; trialYears: number; executionYears: number; legalHold: boolean } };

type Store = {
  session: Session | null;
  ready: boolean;
  userId: string | null;
  roles: data.Role[];
  role: data.Role | null;
  setRole: (r: data.Role) => void;
  actor: string;
  can: (p: data.Permission) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;

  materials: data.Material[];
  recipes: data.Recipe[];
  trials: data.Trial[];
  apiKeys: ApiKeyRow[];
  notifications: NotificationRow[];
  messages: IntegrationMessage[];
  settings: Settings;
  updateSetting: <K extends keyof Settings>(id: K, patch: Partial<Settings[K]>) => Promise<void>;
  markNotificationsRead: (ids?: number[]) => Promise<void>;
  createApiKey: (label: string, scopes: string[], expiresAt: string | null) => Promise<string | null>;
  loadMessages: () => Promise<void>;
  schemas: data.AttributeSchema[];
  units: data.UnitDef[];
  users: AppUser[];
  audit: data.AuditEntry[];
  rules: data.ValidationRule[];
  executions: data.ExecutionRecord[];
  integrations: data.IntegrationEndpoint[];

  logAudit: (e: Omit<data.AuditEntry, "id" | "ts" | "user">) => void;
  transition: (recipeId: string, action: WorkflowAction, reason: string, sig?: string) => Promise<{ ok: boolean; error?: string }>;
  newVersion: (recipeId: string, reason: string) => Promise<string | null>;
  copyRecipe: (recipeId: string) => Promise<string | null>;

  addMaterial: (m: Omit<data.Material, "id" | "updatedAt">) => void;
  updateMaterial: (id: string, patch: Partial<data.Material>) => void;
  deleteMaterial: (id: string) => void;

  addRecipe: (r: Omit<data.Recipe, "id" | "updatedAt" | "items" | "process" | "approvedBy"> & { items?: data.RecipeItem[]; process?: data.ProcessStep[] }) => void;
  updateRecipe: (id: string, patch: Partial<data.Recipe>) => void;
  deleteRecipe: (id: string) => void;
  addRecipeItem: (recipeId: string, it: Omit<data.RecipeItem, "id">) => void;
  updateRecipeItem: (recipeId: string, itemId: string, patch: Partial<data.RecipeItem>) => void;
  removeRecipeItem: (recipeId: string, itemId: string) => void;
  addProcessStep: (recipeId: string, p: Omit<data.ProcessStep, "seq">) => void;
  updateProcessStep: (recipeId: string, seq: number, patch: Partial<data.ProcessStep>) => void;
  removeProcessStep: (recipeId: string, seq: number) => void;

  addTrial: (t: Omit<data.Trial, "id" | "loggedAt">) => void;
  updateTrial: (id: string, patch: Partial<data.Trial>) => void;
  deleteTrial: (id: string) => void;

  revokeKey: (id: string) => void;
  deleteApiKey: (id: string) => void;

  addSchema: (s: Omit<data.AttributeSchema, "id" | "fields">) => void;
  updateSchema: (id: string, patch: Partial<data.AttributeSchema>) => void;
  deleteSchema: (id: string) => void;
  addSchemaField: (schemaId: string, f: data.AttributeSchema["fields"][number]) => void;
  updateSchemaField: (schemaId: string, key: string, patch: Partial<data.AttributeSchema["fields"][number]>) => void;
  removeSchemaField: (schemaId: string, key: string) => void;

  addUnit: (u: Omit<data.UnitDef, "id">) => void;
  updateUnit: (id: string, patch: Partial<data.UnitDef>) => void;
  deleteUnit: (id: string) => void;

  setUserRole: (userId: string, role: data.Role, on: boolean) => Promise<void>;
  updateUser: (id: string, patch: { name?: string; status?: string }) => Promise<void>;

  addRule: (r: Omit<data.ValidationRule, "id">) => void;
  updateRule: (id: string, patch: Partial<data.ValidationRule>) => void;
  deleteRule: (id: string) => void;
  addExecution: (e: Omit<data.ExecutionRecord, "id">) => Promise<boolean>;
  updateExecution: (id: string, patch: Partial<data.ExecutionRecord>) => void;
  updateIntegration: (id: string, patch: Partial<data.IntegrationEndpoint>) => void;
  importRecipes: (rs: data.Recipe[]) => Promise<number>;
};

const Ctx = createContext<Store | null>(null);

const nowStamp = () => new Date().toISOString().slice(0, 10);
const nowStampFull = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

type RecipeRow = {
  id: string; code: string; name: string; project: string; version: string; parent_id: string | null; branch_label: string | null;
  status: string; classification: string; target_yield: unknown; items: unknown; process: unknown; compliance: unknown;
  created_by_name: string; approved_by: string[]; updated_at: string;
};
const fromRow = (r: RecipeRow): data.Recipe => ({
  id: r.id, code: r.code, name: r.name, project: r.project, version: r.version,
  parentId: r.parent_id ?? undefined, branchLabel: r.branch_label ?? undefined,
  status: r.status as data.RecipeStatus, classification: r.classification,
  targetYield: r.target_yield as data.Recipe["targetYield"], items: (r.items ?? []) as data.RecipeItem[],
  process: (r.process ?? []) as data.ProcessStep[], compliance: r.compliance as data.Recipe["compliance"],
  createdBy: r.created_by_name, approvedBy: r.approved_by ?? [], updatedAt: r.updated_at.slice(0, 10),
});

const errMsg = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Something went wrong");

export function RmsStoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [roles, setRoles] = useState<data.Role[]>([]);
  const [role, setRole] = useState<data.Role | null>(null);
  const [actor, setActor] = useState("");
  const [recipes, setRecipes] = useState<data.Recipe[]>([]);
  const [records, setRecords] = useState<Record<Kind, unknown[]>>({ material: [], unit: [], schema: [], trial: [], api_key: [], validation_rule: [], execution: [], integration: [], setting: [] });
  const [users, setUsers] = useState<AppUser[]>([]);
  const [audit, setAudit] = useState<data.AuditEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [messages, setMessages] = useState<IntegrationMessage[]>([]);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) setReady(true); });
    supabase.auth.getSession().then(({ data: d }) => { setSession(d.session); if (!d.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadRecipes = useCallback(async () => {
    const { data: rows, error } = await supabase.from("recipes").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    setRecipes((rows as RecipeRow[]).map(fromRow));
  }, []);
  const loadRecords = useCallback(async () => {
    const { data: rows, error } = await supabase.from("rms_records").select("kind, data").order("updated_at", { ascending: false });
    if (error) throw error;
    const next: Record<Kind, unknown[]> = { material: [], unit: [], schema: [], trial: [], api_key: [], validation_rule: [], execution: [], integration: [], setting: [] };
    (rows ?? []).forEach((r) => next[r.kind as Kind]?.push(r.data));
    next.unit.reverse(); next.schema.reverse(); next.validation_rule.sort((a, b) => String((a as { id: string }).id).localeCompare(String((b as { id: string }).id)));
    setRecords(next);
  }, []);
  const loadAudit = useCallback(async () => {
    const { data: rows } = await supabase.from("audit_log").select("*").order("ts", { ascending: false }).limit(500);
    setAudit((rows ?? []).map((a) => ({
      id: String(a.id), ts: a.ts.slice(0, 19).replace("T", " "), user: a.actor_name, action: a.action, entity: a.entity,
      property: a.property, before: a.before_value, after: a.after_value, reason: a.reason ?? undefined, version: a.version ?? undefined, signed: a.signed,
    })));
  }, []);
  const loadUsers = useCallback(async () => {
    const [{ data: profs }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setUsers((profs ?? []).map((p) => ({
      id: p.id, name: p.full_name, email: p.email, status: p.status,
      roles: (rs ?? []).filter((r) => r.user_id === p.id).map((r) => DB_TO_ROLE[r.role as DbRole]),
    })));
  }, []);

  const loadExtras = useCallback(async () => {
    const [{ data: keys }, { data: notes }] = await Promise.all([
      supabase.from("api_keys").select("id, label, prefix, scopes, expires_at, active, created_by_name, created_at, last_used_at, call_count").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setApiKeys((keys ?? []) as ApiKeyRow[]);
    setNotifications((notes ?? []) as NotificationRow[]);
  }, []);
  const loadMessages = useCallback(async () => {
    const { data: rows } = await supabase.from("integration_messages").select("*").order("created_at", { ascending: false }).limit(200);
    setMessages((rows ?? []) as IntegrationMessage[]);
  }, []);

  const refresh = useCallback(async () => {
    try { await Promise.all([loadRecipes(), loadRecords(), loadAudit(), loadUsers(), loadExtras(), loadMessages()]); }
    catch (e) { toast.error(errMsg(e)); }
  }, [loadRecipes, loadRecords, loadAudit, loadUsers, loadExtras, loadMessages]);

  // live notifications + periodic refresh of shared data
  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => { loadExtras(); }, 30000);
    return () => clearInterval(t);
  }, [userId, loadExtras]);

  useEffect(() => {
    if (!userId) { setRoles([]); setRole(null); return; }
    let cancelled = false;
    (async () => {
      const meta = session?.user.user_metadata as { full_name?: string; name?: string } | undefined;
      await supabase.rpc("ensure_profile", { _full_name: meta?.full_name ?? meta?.name ?? "" });
      const [{ data: myRoles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const held = (myRoles ?? []).map((r) => DB_TO_ROLE[r.role as DbRole]).filter(Boolean);
      setRoles(held);
      setRole((cur) => (cur && held.includes(cur) ? cur : held[0] ?? null));
      setActor(prof?.full_name || prof?.email || session?.user.email || "");
      await refresh();
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const can = useCallback((p: data.Permission) => roles.some((r) => data.can(r, p)), [roles]);

  // ---- generic record helpers ----
  const upsert = useCallback(async (kind: Kind, obj: { id: string; [k: string]: unknown }) => {
    const { error } = await supabase.from("rms_records").upsert({ kind, id: obj.id, data: obj as never, created_by: userId });
    if (error) toast.error(errMsg(error));
    await Promise.all([loadRecords(), loadAudit()]);
    return !error;
  }, [userId, loadRecords, loadAudit]);
  const remove = useCallback(async (kind: Kind, id: string) => {
    const { error } = await supabase.from("rms_records").delete().eq("kind", kind).eq("id", id);
    if (error) toast.error(errMsg(error));
    await Promise.all([loadRecords(), loadAudit()]);
  }, [loadRecords, loadAudit]);
  const find = <T,>(kind: Kind, id: string) => (records[kind] as (T & { id: string })[]).find((x) => x.id === id);

  const patchRecipe = useCallback(async (id: string, fn: (r: data.Recipe) => Partial<data.Recipe>) => {
    const r = recipes.find((x) => x.id === id);
    if (!r) return;
    const p = fn(r);
    const row: Record<string, unknown> = {};
    if (p.name !== undefined) row.name = p.name;
    if (p.code !== undefined) row.code = p.code;
    if (p.version !== undefined) row.version = p.version;
    if (p.project !== undefined) row.project = p.project;
    if (p.branchLabel !== undefined) row.branch_label = p.branchLabel;
    if (p.classification !== undefined) row.classification = p.classification;
    if (p.targetYield !== undefined) row.target_yield = p.targetYield;
    if (p.items !== undefined) row.items = p.items;
    if (p.process !== undefined) row.process = p.process;
    if (p.compliance !== undefined) row.compliance = p.compliance;
    setRecipes((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const { error } = await supabase.from("recipes").update(row as never).eq("id", id);
    if (error) { toast.error(errMsg(error)); await loadRecipes(); }
    else loadAudit();
  }, [recipes, loadRecipes, loadAudit]);

  const value = useMemo<Store>(() => ({
    session, ready, userId, roles, role, setRole, actor, can,
    signOut: async () => { await supabase.auth.signOut(); setRecipes([]); setUsers([]); setAudit([]); },
    refresh,
    materials: records.material as data.Material[],
    recipes,
    trials: records.trial as data.Trial[],
    apiKeys, notifications, messages, loadMessages,
    settings: (() => {
      const get = (id: string) => (records.setting as { id: string }[]).find((x) => x.id === id) as Record<string, unknown> | undefined;
      return {
        workflow: { qaApprovalsRequired: 1, reviewSlaDays: 3, requireSignature: true, ...(get("workflow") ?? {}) },
        organization: { name: "", timezone: "UTC", codePrefix: "REC", defaultUnit: "kg", sessionTimeoutMin: 30, ...(get("organization") ?? {}) },
        retention: { auditYears: 10, releasedRecipes: "forever", draftIdleDays: 180, trialYears: 5, executionYears: 10, legalHold: false, ...(get("retention") ?? {}) },
      } as Settings;
    })(),
    updateSetting: async (id, patch) => {
      const cur = (records.setting as { id: string }[]).find((x) => x.id === id) ?? { id };
      await upsert("setting", { ...cur, ...patch, id });
    },
    markNotificationsRead: async (ids) => {
      const q = supabase.from("notifications").update({ read: true }).eq("read", false);
      const { error } = ids?.length ? await q.in("id", ids) : await q;
      if (error) toast.error(errMsg(error));
      await loadExtras();
    },
    createApiKey: async (label, scopes, expiresAt) => {
      const { data: token, error } = await supabase.rpc("create_api_key", { _label: label, _scopes: scopes, _expires_at: expiresAt ?? undefined });
      if (error) { toast.error(errMsg(error)); return null; }
      await Promise.all([loadExtras(), loadAudit()]);
      return token as string;
    },
    schemas: records.schema as data.AttributeSchema[],
    units: records.unit as data.UnitDef[],
    users, audit,
    rules: records.validation_rule as data.ValidationRule[],
    executions: records.execution as data.ExecutionRecord[],
    integrations: records.integration as data.IntegrationEndpoint[],

    logAudit: (e) => {
      if (["DOWNLOAD", "EXPORT", "IMPORT", "SYNC"].includes(e.action)) {
        supabase.rpc("log_event", { _action: e.action, _entity: e.entity, _property: e.property, _after: e.after, _version: e.version ?? undefined }).then(() => loadAudit());
      }
    },
    transition: async (recipeId, action, reason, sig) => {
      const { error } = await supabase.rpc("transition_recipe", { _id: recipeId, _action: action, _reason: reason, _sig: sig });
      await Promise.all([loadRecipes(), loadAudit(), loadExtras()]);
      return error ? { ok: false, error: errMsg(error) } : { ok: true };
    },
    newVersion: async (recipeId) => {
      const { data: id, error } = await supabase.rpc("new_recipe_version", { _id: recipeId, _copy: false });
      if (error) { toast.error(errMsg(error)); return null; }
      await Promise.all([loadRecipes(), loadAudit()]);
      return id as string;
    },
    copyRecipe: async (recipeId) => {
      const { data: id, error } = await supabase.rpc("new_recipe_version", { _id: recipeId, _copy: true });
      if (error) { toast.error(errMsg(error)); return null; }
      await Promise.all([loadRecipes(), loadAudit()]);
      return id as string;
    },

    addMaterial: (m) => { upsert("material", { ...m, id: rid("MAT"), updatedAt: nowStamp() }); },
    updateMaterial: (id, patch) => { const x = find<data.Material>("material", id); if (x) upsert("material", { ...x, ...patch, updatedAt: nowStamp() }); },
    deleteMaterial: (id) => { remove("material", id); },

    addRecipe: async (r) => {
      const { error } = await supabase.from("recipes").insert({
        code: r.code, name: r.name, project: r.project, version: r.version, parent_id: r.parentId ?? null, branch_label: r.branchLabel ?? null,
        status: "draft", classification: r.classification, target_yield: r.targetYield as never, items: (r.items ?? []) as never,
        process: (r.process ?? []) as never, compliance: r.compliance as never, created_by: userId,
      });
      if (error) toast.error(errMsg(error));
      await Promise.all([loadRecipes(), loadAudit()]);
    },
    updateRecipe: (id, patch) => { patchRecipe(id, () => patch); },
    deleteRecipe: async (id) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) toast.error(errMsg(error));
      await Promise.all([loadRecipes(), loadAudit()]);
    },
    addRecipeItem: (recipeId, it) => { patchRecipe(recipeId, (r) => ({ items: [...r.items, { ...it, id: `it_${Date.now().toString(36)}` }] })); },
    updateRecipeItem: (recipeId, itemId, patch) => { patchRecipe(recipeId, (r) => ({ items: r.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) })); },
    removeRecipeItem: (recipeId, itemId) => { patchRecipe(recipeId, (r) => ({ items: r.items.filter((it) => it.id !== itemId) })); },
    addProcessStep: (recipeId, p) => { patchRecipe(recipeId, (r) => ({ process: [...r.process, { ...p, seq: (r.process.at(-1)?.seq ?? 0) + 1 }] })); },
    updateProcessStep: (recipeId, seq, patch) => { patchRecipe(recipeId, (r) => ({ process: r.process.map((p) => (p.seq === seq ? { ...p, ...patch } : p)) })); },
    removeProcessStep: (recipeId, seq) => { patchRecipe(recipeId, (r) => ({ process: r.process.filter((p) => p.seq !== seq).map((p, i) => ({ ...p, seq: i + 1 })) })); },

    addTrial: (t) => { upsert("trial", { ...t, id: rid("TR"), loggedAt: nowStampFull() }); },
    updateTrial: (id, patch) => { const x = find<data.Trial>("trial", id); if (x) upsert("trial", { ...x, ...patch }); },
    deleteTrial: (id) => { remove("trial", id); },

    revokeKey: async (id) => { const { error } = await supabase.from("api_keys").update({ active: false }).eq("id", id); if (error) toast.error(errMsg(error)); await Promise.all([loadExtras(), loadAudit()]); },
    deleteApiKey: async (id) => { const { error } = await supabase.from("api_keys").delete().eq("id", id); if (error) toast.error(errMsg(error)); await Promise.all([loadExtras(), loadAudit()]); },

    addSchema: (s) => { upsert("schema", { ...s, id: rid("sch"), fields: [] }); },
    updateSchema: (id, patch) => { const x = find<data.AttributeSchema>("schema", id); if (x) upsert("schema", { ...x, ...patch }); },
    deleteSchema: (id) => { remove("schema", id); },
    addSchemaField: (schemaId, f) => { const x = find<data.AttributeSchema>("schema", schemaId); if (x) upsert("schema", { ...x, fields: [...x.fields, f] }); },
    updateSchemaField: (schemaId, key, patch) => { const x = find<data.AttributeSchema>("schema", schemaId); if (x) upsert("schema", { ...x, fields: x.fields.map((f) => (f.key === key ? { ...f, ...patch } : f)) }); },
    removeSchemaField: (schemaId, key) => { const x = find<data.AttributeSchema>("schema", schemaId); if (x) upsert("schema", { ...x, fields: x.fields.filter((f) => f.key !== key) }); },

    addUnit: (u) => { upsert("unit", { ...u, id: rid("u") }); },
    updateUnit: (id, patch) => { const x = find<data.UnitDef>("unit", id); if (x) upsert("unit", { ...x, ...patch }); },
    deleteUnit: (id) => { remove("unit", id); },

    setUserRole: async (uid, r, on) => {
      const dbRole = ROLE_TO_DB[r];
      const { error } = on
        ? await supabase.from("user_roles").insert({ user_id: uid, role: dbRole })
        : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", dbRole);
      if (error) toast.error(errMsg(error));
      await Promise.all([loadUsers(), loadAudit()]);
    },
    updateUser: async (id, patch) => {
      const { error } = await supabase.from("profiles").update({ ...(patch.name !== undefined ? { full_name: patch.name } : {}), ...(patch.status ? { status: patch.status } : {}) }).eq("id", id);
      if (error) toast.error(errMsg(error));
      await loadUsers();
    },

    addRule: (r) => { upsert("validation_rule", { ...r, id: rid("VR") }); },
    updateRule: (id, patch) => { const x = find<data.ValidationRule>("validation_rule", id); if (x) upsert("validation_rule", { ...x, ...patch }); },
    deleteRule: (id) => { remove("validation_rule", id); },
    addExecution: (e) => upsert("execution", { ...e, id: rid("EX") }),
    updateExecution: (id, patch) => { const x = find<data.ExecutionRecord>("execution", id); if (x) upsert("execution", { ...x, ...patch }); },
    updateIntegration: (id, patch) => { const x = find<data.IntegrationEndpoint>("integration", id); if (x) upsert("integration", { ...x, ...patch }); },
    importRecipes: async (rs) => {
      const { error } = await supabase.from("recipes").insert(rs.map((r) => ({
        code: r.code, name: r.name, project: r.project || "Imported", version: r.version || "v1.0", status: "draft",
        classification: r.classification || "Imported", target_yield: (r.targetYield ?? { value: 100, unit: "kg" }) as never,
        items: (r.items ?? []) as never, process: (r.process ?? []) as never,
        compliance: (r.compliance ?? { hazards: [], allergens: [], storageMaxC: 25, shelfLifeDays: 0 }) as never, created_by: userId,
      })));
      if (error) { toast.error(errMsg(error)); return 0; }
      supabase.rpc("log_event", { _action: "IMPORT", _entity: "recipes", _property: "count", _after: String(rs.length) });
      await Promise.all([loadRecipes(), loadAudit()]);
      return rs.length;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [session, ready, userId, roles, role, actor, can, refresh, records, recipes, users, audit, apiKeys, notifications, messages, upsert, remove, patchRecipe, loadRecipes, loadAudit, loadUsers, loadExtras, loadMessages]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRms(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRms outside provider");
  return c;
}
