import { useEffect, useState, type ReactNode } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";

export type FieldSpec =
  | { key: string; label: string; type: "text" | "textarea" | "number"; required?: boolean; placeholder?: string; step?: number; min?: number; max?: number; help?: string; col?: 1 | 2 }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean; help?: string; col?: 1 | 2 }
  | { key: string; label: string; type: "multiselect"; options: { value: string; label: string }[]; help?: string; col?: 1 | 2 }
  | { key: string; label: string; type: "tags"; placeholder?: string; help?: string; col?: 1 | 2 }
  | { key: string; label: string; type: "checkbox"; help?: string; col?: 1 | 2 }
  | { key: string; label: string; type: "kv"; help?: string; col?: 1 | 2 }; // key/value string map

export interface EntityFormDialogProps<T extends Record<string, any>> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: FieldSpec[];
  initial?: Partial<T>;
  submitLabel?: string;
  onSubmit: (values: T) => void;
  extra?: ReactNode;
}

function defaultFor(f: FieldSpec) {
  switch (f.type) {
    case "number": return 0;
    case "checkbox": return false;
    case "multiselect": case "tags": return [] as string[];
    case "kv": return {} as Record<string, string>;
    default: return "";
  }
}

export function EntityFormDialog<T extends Record<string, any>>({
  open, onClose, title, subtitle, fields, initial, submitLabel = "Save", onSubmit, extra,
}: EntityFormDialogProps<T>) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const seeded: Record<string, any> = {};
    for (const f of fields) seeded[f.key] = (initial as any)?.[f.key] ?? defaultFor(f);
    setValues(seeded);
    setErrors({});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const set = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if ("required" in f && f.required) {
        const v = values[f.key];
        if (v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0)) errs[f.key] = "Required";
      }
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(values as T);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}
        className="glass-panel w-full max-w-2xl rounded-2xl border border-border/60 shadow-2xl">
        <div className="flex items-start justify-between border-b border-border/40 p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.col === 2 || f.type === "textarea" || f.type === "kv" || f.type === "multiselect" || f.type === "tags" ? "sm:col-span-2" : ""}>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{f.label}</label>

                {f.type === "text" && (
                  <input value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder}
                    className="mt-1 w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:border-primary/50 focus:outline-none" />
                )}
                {f.type === "number" && (
                  <input type="number" step={f.step ?? "any"} min={f.min} max={f.max}
                    value={values[f.key] ?? 0} onChange={(e) => set(f.key, e.target.value === "" ? 0 : Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm font-mono focus:border-primary/50 focus:outline-none" />
                )}
                {f.type === "textarea" && (
                  <textarea rows={3} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder}
                    className="mt-1 w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:border-primary/50 focus:outline-none" />
                )}
                {f.type === "select" && (
                  <select value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}
                    className="mt-1 w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:border-primary/50 focus:outline-none">
                    <option value="">— select —</option>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {f.type === "multiselect" && (
                  <div className="mt-1 flex flex-wrap gap-1.5 rounded-md border border-border/60 bg-background p-2">
                    {f.options.map((o) => {
                      const arr: string[] = values[f.key] ?? [];
                      const active = arr.includes(o.value);
                      return (
                        <button type="button" key={o.value}
                          onClick={() => set(f.key, active ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                          className={`rounded px-2 py-1 text-[11px] transition ${active ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {f.type === "tags" && (
                  <TagsInput value={values[f.key] ?? []} onChange={(v) => set(f.key, v)} placeholder={f.placeholder} />
                )}
                {f.type === "checkbox" && (
                  <label className="mt-1 flex items-center gap-2 text-sm">
                    <input type="checkbox" className="accent-primary" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
                    <span className="text-muted-foreground">{f.help ?? "Enabled"}</span>
                  </label>
                )}
                {f.type === "kv" && (
                  <KvEditor value={values[f.key] ?? {}} onChange={(v) => set(f.key, v)} />
                )}

                {f.help && f.type !== "checkbox" && <div className="mt-1 text-[10px] text-muted-foreground">{f.help}</div>}
                {errors[f.key] && <div className="mt-1 text-[10px] text-destructive">{errors[f.key]}</div>}
              </div>
            ))}
          </div>
          {extra && <div className="mt-4 border-t border-border/40 pt-4">{extra}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/40 p-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
            <Save className="h-3.5 w-3.5" /> {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => { const t = draft.trim(); if (t && !value.includes(t)) onChange([...value, t]); setDraft(""); };
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-background p-2">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="text-primary/60 hover:text-primary"><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input value={draft} placeholder={placeholder ?? "Add and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={commit}
        className="min-w-[8ch] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
    </div>
  );
}

function KvEditor({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const entries = Object.entries(value);
  const set = (i: number, k: string, v: string) => {
    const next = entries.map(([kk, vv], idx) => idx === i ? [k, v] as [string, string] : [kk, vv] as [string, string]);
    onChange(Object.fromEntries(next));
  };
  const remove = (i: number) => onChange(Object.fromEntries(entries.filter((_, idx) => idx !== i)));
  const add = () => onChange({ ...value, [`field_${entries.length + 1}`]: "" });
  return (
    <div className="mt-1 space-y-1.5 rounded-md border border-border/60 bg-background p-2">
      {entries.length === 0 && <div className="py-2 text-center text-[11px] text-muted-foreground">No custom attributes yet.</div>}
      {entries.map(([k, v], i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input value={k} onChange={(e) => set(i, e.target.value, v)} placeholder="key" className="w-1/3 rounded border border-border/60 bg-card/60 px-2 py-1 font-mono text-xs" />
          <input value={v} onChange={(e) => set(i, k, e.target.value)} placeholder="value" className="flex-1 rounded border border-border/60 bg-card/60 px-2 py-1 text-xs" />
          <button type="button" onClick={() => remove(i)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded border border-dashed border-border/60 px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary">
        <Plus className="h-3 w-3" /> Add attribute
      </button>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Delete" }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-md rounded-2xl border border-border/60 p-5">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90">
            <Trash2 className="h-3.5 w-3.5" /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
