import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import * as data from "./rms-data";

interface Store {
  role: data.Role;
  setRole: (r: data.Role) => void;
  materials: data.Material[];
  recipes: data.Recipe[];
  trials: data.Trial[];
  apiKeys: data.ApiKey[];
  audit: data.AuditEntry[];
  schemas: data.AttributeSchema[];
  units: data.UnitDef[];
  users: data.UserAccount[];
  updateRecipeItem: (recipeId: string, itemId: string, patch: Partial<data.RecipeItem>) => void;
  addTrial: (t: Omit<data.Trial, "id" | "loggedAt">) => void;
  revokeKey: (id: string) => void;
  moveGate: (recipeId: string, next: data.RecipeStatus) => void;
}

const Ctx = createContext<Store | null>(null);

export function RmsStoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<data.Role>("R&D Lead Scientist");
  const [recipes, setRecipes] = useState(data.recipes);
  const [trials, setTrials] = useState(data.trials);
  const [apiKeys, setApiKeys] = useState(data.apiKeys);

  const value = useMemo<Store>(() => ({
    role, setRole,
    materials: data.materials,
    recipes, trials, apiKeys,
    audit: data.auditTrail,
    schemas: data.schemas,
    units: data.units,
    users: data.users,
    updateRecipeItem: (recipeId, itemId, patch) => {
      setRecipes((rs) => rs.map((r) => r.id !== recipeId ? r : {
        ...r,
        items: r.items.map((it) => it.id === itemId ? { ...it, ...patch } : it),
      }));
    },
    addTrial: (t) => {
      const id = `TR-${1050 + trials.length}`;
      setTrials((prev) => [{ ...t, id, loggedAt: new Date().toISOString().slice(0, 16).replace("T", " ") }, ...prev]);
    },
    revokeKey: (id) => setApiKeys((ks) => ks.map((k) => k.id === id ? { ...k, active: false } : k)),
    moveGate: (recipeId, next) => setRecipes((rs) => rs.map((r) => r.id === recipeId ? { ...r, status: next } : r)),
  }), [role, recipes, trials, apiKeys]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRms(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRms outside provider");
  return c;
}
