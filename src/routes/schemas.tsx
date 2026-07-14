import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Database, Hash, Type, ListFilter, Layers, Pencil, Trash2 } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { EntityFormDialog, ConfirmDialog, type FieldSpec } from "@/components/entity-form-dialog";
import type { AttributeSchema } from "@/lib/rms-data";

export const Route = createFileRoute("/schemas")({
  head: () => ({ meta: [{ title: "Attribute Schemas · Cortanex RMS" }, { name: "description", content: "Custom attribute schema builder for industry-agnostic material profiling." }] }),
  component: Schemas,
});

type Field = AttributeSchema["fields"][number];

const typeIcon = (t: string) => t === "number" ? Hash : t === "enum" ? ListFilter : Type;
const typeTone = (t: string) => t === "number" ? "text-info" : t === "enum" ? "text-accent" : "text-primary";

function Schemas() {
  const { schemas, addSchema, updateSchema, deleteSchema, addSchemaField, updateSchemaField, removeSchemaField } = useRms();
  const totalFields = schemas.reduce((a, s) => a + s.fields.length, 0);
  const domains = new Set(schemas.map((s) => s.domain)).size;

  const [creatingSchema, setCreatingSchema] = useState(false);
  const [editingSchema, setEditingSchema] = useState<AttributeSchema | null>(null);
  const [deleteSchemaId, setDeleteSchemaId] = useState<string | null>(null);

  const [fieldTarget, setFieldTarget] = useState<{ schemaId: string; field?: Field } | null>(null);

  const schemaFields = useMemo<FieldSpec[]>(() => [
    { key: "name", label: "Schema name", type: "text", required: true, placeholder: "e.g. Pharmaceutical" },
    { key: "domain", label: "Domain", type: "text", required: true, placeholder: "e.g. Pharma" },
  ], []);

  const fieldFormFields = useMemo<FieldSpec[]>(() => [
    { key: "key", label: "Field key", type: "text", required: true, placeholder: "e.g. viscosity" },
    { key: "label", label: "Display label", type: "text", required: true },
    { key: "type", label: "Type", type: "select", required: true, options: [
      { value: "text", label: "Text" }, { value: "number", label: "Number" }, { value: "enum", label: "Enum" },
    ] },
    { key: "unit", label: "Unit (optional)", type: "text", placeholder: "e.g. cP, °C" },
    { key: "options", label: "Enum options (only for enum)", type: "tags", placeholder: "add option, Enter" },
  ], []);

  return (
    <div className="space-y-5">
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-info">Extensible metadata</div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Attribute Schemas</h1>
            <p className="mt-1 text-sm text-muted-foreground">Inject industry-specific fields (allergens, CAS, pH…) onto generic materials.</p>
          </div>
          <button onClick={() => setCreatingSchema(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New schema
          </button>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Schemas", value: schemas.length, icon: Database, tone: "text-primary" },
            { label: "Domains", value: domains, icon: Layers, tone: "text-info" },
            { label: "Total fields", value: totalFields, icon: Hash, tone: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <s.icon className={`h-3.5 w-3.5 ${s.tone}`} />
              </div>
              <div className="mt-1 font-mono text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {schemas.map((s) => (
          <div key={s.id} className="glass-panel rounded-2xl p-5">
            <div className="mb-4 flex items-start justify-between border-b border-border/40 pb-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-info/20 text-primary">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.domain}</div>
                  <h3 className="mt-0.5 text-sm font-semibold">{s.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">{s.id}</span>
                    <span>·</span>
                    <span>{s.fields.length} fields</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditingSchema(s)} className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteSchemaId(s.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="space-y-2">
              {s.fields.map((f) => {
                const Icon = typeIcon(f.type); const tone = typeTone(f.type);
                return (
                  <div key={f.key} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2">
                    <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-md bg-card/60 ${tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary">{f.key}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${tone} bg-card/60`}>{f.type}</span>
                        {f.unit && <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{f.unit}</span>}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{f.label}</div>
                      {f.options && f.options.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {f.options.map((o) => <span key={o} className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">{o}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setFieldTarget({ schemaId: s.id, field: f })} className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => removeSchemaField(s.id, f.key)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setFieldTarget({ schemaId: s.id })} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 py-2 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary">
              <Plus className="h-3 w-3" /> Append field
            </button>
          </div>
        ))}
      </div>

      <EntityFormDialog<Partial<AttributeSchema>>
        open={creatingSchema || !!editingSchema}
        onClose={() => { setCreatingSchema(false); setEditingSchema(null); }}
        title={editingSchema ? `Edit ${editingSchema.name}` : "New attribute schema"}
        fields={schemaFields}
        initial={editingSchema ?? undefined}
        onSubmit={(v: any) => {
          if (editingSchema) updateSchema(editingSchema.id, v);
          else addSchema(v);
          setCreatingSchema(false); setEditingSchema(null);
        }}
      />

      <EntityFormDialog
        open={!!fieldTarget}
        onClose={() => setFieldTarget(null)}
        title={fieldTarget?.field ? `Edit field ${fieldTarget.field.key}` : "New field"}
        fields={fieldFormFields}
        initial={fieldTarget?.field ?? { type: "text", options: [] }}
        onSubmit={(v: any) => {
          if (!fieldTarget) return;
          const payload: Field = {
            key: v.key, label: v.label, type: v.type,
            unit: v.unit || undefined,
            options: v.type === "enum" ? (v.options ?? []) : undefined,
          };
          if (fieldTarget.field) updateSchemaField(fieldTarget.schemaId, fieldTarget.field.key, payload);
          else addSchemaField(fieldTarget.schemaId, payload);
          setFieldTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteSchemaId}
        onClose={() => setDeleteSchemaId(null)}
        onConfirm={() => deleteSchemaId && deleteSchema(deleteSchemaId)}
        title="Delete schema?"
        message="Materials referencing this schema will keep their attributes but lose validation."
      />
    </div>
  );
}
