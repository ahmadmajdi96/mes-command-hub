CREATE TYPE public.app_role AS ENUM ('recipe_engineer', 'qa_manager', 'production_manager', 'operator', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE POLICY "Profiles readable by signed-in users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile, admins any" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read own roles or admin reads all" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins grant roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins revoke roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.recipes (
  id text PRIMARY KEY DEFAULT ('REC-' || upper(substr(md5(random()::text), 1, 6))),
  code text NOT NULL,
  name text NOT NULL,
  project text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT 'v1.0',
  parent_id text,
  branch_label text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','rejected','approved','released','superseded','obsolete')),
  classification text NOT NULL DEFAULT '',
  target_yield jsonb NOT NULL DEFAULT '{"value":100,"unit":"kg"}'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  process jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance jsonb NOT NULL DEFAULT '{"hazards":[],"allergens":[],"storageMaxC":25,"shelfLifeDays":0}'::jsonb,
  created_by uuid,
  created_by_name text NOT NULL DEFAULT '',
  approved_by text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Released visible to all; drafts to non-operators" ON public.recipes FOR SELECT TO authenticated
  USING (status = 'released' OR public.has_any_role(auth.uid(), ARRAY['recipe_engineer','qa_manager','production_manager','admin']::public.app_role[]));
CREATE POLICY "Engineers create drafts" ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'recipe_engineer') AND status = 'draft' AND created_by = auth.uid());
CREATE POLICY "Engineers edit drafts only" ON public.recipes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'recipe_engineer') AND status = 'draft')
  WITH CHECK (public.has_role(auth.uid(), 'recipe_engineer') AND status = 'draft');
CREATE POLICY "Engineers delete own drafts" ON public.recipes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'recipe_engineer') AND status = 'draft' AND created_by = auth.uid());

CREATE TABLE public.rms_records (
  kind text NOT NULL CHECK (kind IN ('material','unit','schema','trial','api_key','validation_rule','execution','integration')),
  id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rms_records TO authenticated;
GRANT ALL ON public.rms_records TO service_role;
ALTER TABLE public.rms_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_write_record(_kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _kind
    WHEN 'material' THEN public.has_any_role(auth.uid(), ARRAY['recipe_engineer','admin']::public.app_role[])
    WHEN 'unit' THEN public.has_any_role(auth.uid(), ARRAY['recipe_engineer','admin']::public.app_role[])
    WHEN 'schema' THEN public.has_any_role(auth.uid(), ARRAY['recipe_engineer','admin']::public.app_role[])
    WHEN 'trial' THEN public.has_role(auth.uid(), 'recipe_engineer')
    WHEN 'execution' THEN public.has_role(auth.uid(), 'operator')
    ELSE public.has_role(auth.uid(), 'admin')
  END
$$;

CREATE POLICY "Signed-in users read records" ON public.rms_records FOR SELECT TO authenticated
  USING (kind <> 'api_key' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Role-scoped insert" ON public.rms_records FOR INSERT TO authenticated WITH CHECK (public.can_write_record(kind));
CREATE POLICY "Role-scoped update" ON public.rms_records FOR UPDATE TO authenticated USING (public.can_write_record(kind)) WITH CHECK (public.can_write_record(kind));
CREATE POLICY "Role-scoped delete" ON public.rms_records FOR DELETE TO authenticated USING (public.can_write_record(kind) AND kind <> 'execution');

CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'System',
  action text NOT NULL,
  entity text NOT NULL,
  property text NOT NULL DEFAULT '',
  before_value text NOT NULL DEFAULT '—',
  after_value text NOT NULL DEFAULT '—',
  reason text,
  version text
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Non-operators read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['recipe_engineer','qa_manager','production_manager','admin']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.current_actor_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF((SELECT full_name FROM public.profiles WHERE id = auth.uid()), ''), (SELECT email FROM public.profiles WHERE id = auth.uid()), 'System')
$$;

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _entity text, _property text, _before text, _after text, _reason text, _version text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_log (actor_id, actor_name, action, entity, property, before_value, after_value, reason, version)
  VALUES (auth.uid(), public.current_actor_name(), _action, _entity, COALESCE(_property, ''), COALESCE(_before, '—'), COALESCE(_after, '—'), _reason, _version)
$$;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recipes_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by_name := COALESCE(NULLIF(NEW.created_by_name, ''), public.current_actor_name());
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_by_name := OLD.created_by_name;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER recipes_before_write BEFORE INSERT OR UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.recipes_before_write();

CREATE OR REPLACE FUNCTION public.recipes_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit('CREATE', NEW.id, 'recipe', '—', NEW.code || ' ' || NEW.version, NULL, NEW.version);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit('DELETE', OLD.id, 'recipe', OLD.code || ' ' || OLD.version, '—', NULL, OLD.version);
    RETURN OLD;
  ELSIF NEW.status = OLD.status THEN
    IF NEW.items IS DISTINCT FROM OLD.items THEN PERFORM public.write_audit('UPDATE', NEW.id, 'items', OLD.items::text, NEW.items::text, NULL, NEW.version); END IF;
    IF NEW.process IS DISTINCT FROM OLD.process THEN PERFORM public.write_audit('UPDATE', NEW.id, 'process', OLD.process::text, NEW.process::text, NULL, NEW.version); END IF;
    IF NEW.name IS DISTINCT FROM OLD.name OR NEW.code IS DISTINCT FROM OLD.code OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.compliance IS DISTINCT FROM OLD.compliance OR NEW.target_yield IS DISTINCT FROM OLD.target_yield THEN
      PERFORM public.write_audit('UPDATE', NEW.id, 'header', OLD.code || ' ' || OLD.version, NEW.code || ' ' || NEW.version, NULL, NEW.version);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER recipes_audit AFTER INSERT OR UPDATE OR DELETE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.recipes_audit();

CREATE OR REPLACE FUNCTION public.records_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'execution' AND NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = NEW.data->>'recipeId' AND status = 'released') THEN
      RAISE EXCEPTION 'Only released recipes can be executed';
    END IF;
    PERFORM public.write_audit('CREATE', NEW.kind || ':' || NEW.id, NEW.kind, '—', left(NEW.data::text, 500), NULL, NEW.data->>'version');
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit('UPDATE', NEW.kind || ':' || NEW.id, NEW.kind, left(OLD.data::text, 500), left(NEW.data::text, 500), NULL, NULL);
  ELSE
    PERFORM public.write_audit('DELETE', OLD.kind || ':' || OLD.id, OLD.kind, left(OLD.data::text, 500), '—', NULL, NULL);
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER records_audit BEFORE INSERT OR UPDATE OR DELETE ON public.rms_records FOR EACH ROW EXECUTE FUNCTION public.records_audit();

CREATE OR REPLACE FUNCTION public.roles_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit('GRANT_ROLE', 'user:' || NEW.user_id, 'role', '—', NEW.role::text, NULL, NULL);
    RETURN NEW;
  END IF;
  PERFORM public.write_audit('REVOKE_ROLE', 'user:' || OLD.user_id, 'role', OLD.role::text, '—', NULL, NULL);
  RETURN OLD;
END $$;
CREATE TRIGGER roles_audit AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.roles_audit();

CREATE OR REPLACE FUNCTION public.transition_recipe(_id text, _action text, _reason text DEFAULT '')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.recipes;
  _to text;
  _from text[];
  _role public.app_role;
  _total numeric;
  _actor text := public.current_actor_name();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO r FROM public.recipes WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recipe not found'; END IF;

  CASE _action
    WHEN 'submit'   THEN _to := 'review';   _from := ARRAY['draft','rejected']; _role := 'recipe_engineer';
    WHEN 'approve'  THEN _to := 'approved'; _from := ARRAY['review'];           _role := 'qa_manager';
    WHEN 'reject'   THEN _to := 'rejected'; _from := ARRAY['review'];           _role := 'qa_manager';
    WHEN 'return'   THEN _to := 'draft';    _from := ARRAY['review','approved']; _role := 'qa_manager';
    WHEN 'release'  THEN _to := 'released'; _from := ARRAY['approved'];         _role := 'production_manager';
    WHEN 'obsolete' THEN _to := 'obsolete'; _from := ARRAY['released','approved','superseded']; _role := NULL;
    ELSE RAISE EXCEPTION 'Unknown action %', _action;
  END CASE;

  IF _action = 'obsolete' THEN
    IF NOT public.has_any_role(auth.uid(), ARRAY['qa_manager','production_manager']::public.app_role[]) THEN
      RAISE EXCEPTION 'Your role is not permitted to mark recipes obsolete';
    END IF;
  ELSIF NOT public.has_role(auth.uid(), _role) THEN
    RAISE EXCEPTION 'Your role is not permitted to %', _action;
  END IF;

  IF NOT (r.status = ANY(_from)) THEN RAISE EXCEPTION 'Cannot % a recipe in status %', _action, r.status; END IF;
  IF _action IN ('approve','release') AND (r.created_by = auth.uid() OR r.created_by_name = _actor) THEN
    RAISE EXCEPTION 'Segregation of duties: authors cannot approve or release their own recipe';
  END IF;
  IF _action IN ('reject','return','obsolete') AND COALESCE(btrim(_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;
  IF _action IN ('submit','approve','release') THEN
    SELECT COALESCE(sum((i->>'targetPct')::numeric), 0) INTO _total FROM jsonb_array_elements(r.items) i;
    IF abs(_total - 100) > 0.01 THEN RAISE EXCEPTION 'Validation failed: composition totals % percent', _total; END IF;
  END IF;

  IF _action = 'release' THEN
    UPDATE public.recipes SET status = 'superseded' WHERE code = r.code AND status = 'released' AND id <> r.id;
  END IF;

  UPDATE public.recipes SET status = _to,
    approved_by = CASE WHEN _action = 'approve' THEN array_append(approved_by, _actor) ELSE approved_by END
  WHERE id = _id;

  PERFORM public.write_audit(upper(_action), _id, 'status', r.status, _to, NULLIF(btrim(_reason), ''), r.version);
  RETURN _to;
END $$;
REVOKE EXECUTE ON FUNCTION public.transition_recipe(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_recipe(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.new_recipe_version(_id text, _copy boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.recipes;
  _new text := 'REC-' || upper(substr(md5(random()::text), 1, 6));
  _ver text;
  m text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'recipe_engineer') THEN RAISE EXCEPTION 'Only Recipe Engineers can create versions'; END IF;
  SELECT * INTO r FROM public.recipes WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recipe not found'; END IF;
  m := regexp_match(r.version, '^v(\d+)\.(\d+)');
  _ver := CASE WHEN _copy THEN 'v1.0' WHEN m IS NULL THEN r.version || '.1' ELSE 'v' || m[1] || '.' || (m[2]::int + 1) END;
  INSERT INTO public.recipes (id, code, name, project, version, parent_id, branch_label, status, classification, target_yield, items, process, compliance, created_by, created_by_name)
  VALUES (_new, CASE WHEN _copy THEN r.code || '-COPY' ELSE r.code END, CASE WHEN _copy THEN r.name || ' (copy)' ELSE r.name END,
    r.project, _ver, CASE WHEN _copy THEN NULL ELSE r.parent_id END, r.branch_label, 'draft', r.classification, r.target_yield, r.items, r.process, r.compliance,
    auth.uid(), public.current_actor_name());
  PERFORM public.write_audit(CASE WHEN _copy THEN 'COPY' ELSE 'NEW_VERSION' END, _new, 'source', r.id || ' ' || r.version, _ver, NULL, _ver);
  RETURN _new;
END $$;
REVOKE EXECUTE ON FUNCTION public.new_recipe_version(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.new_recipe_version(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_event(_action text, _entity text, _property text, _after text, _version text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _action NOT IN ('DOWNLOAD','EXPORT','IMPORT','SYNC') THEN RAISE EXCEPTION 'Event not allowed'; END IF;
  PERFORM public.write_audit(_action, left(_entity, 200), left(_property, 100), '—', left(_after, 500), NULL, _version);
END $$;
REVOKE EXECUTE ON FUNCTION public.log_event(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_event(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_profile(_full_name text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text := COALESCE(auth.jwt()->>'email', '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (auth.uid(), COALESCE(NULLIF(btrim(_full_name), ''), split_part(_email, '@', 1)), _email)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text) TO authenticated;

ALTER TABLE public.recipes DISABLE TRIGGER recipes_audit;
ALTER TABLE public.rms_records DISABLE TRIGGER records_audit;

INSERT INTO public.recipes (id, code, name, project, version, parent_id, branch_label, status, classification, target_yield, items, process, compliance, created_by_name, approved_by, updated_at) VALUES ('REC-0001','ECO-COAT-V4','EcoCoat Blend','Project Helios','v4.2',NULL,'Baseline','draft','Industrial Coating','{"value":1000,"unit":"kg"}'::jsonb,'[{"id":"i1","refType":"material","refId":"MAT-0042","name":"Bio-Based Resin Carrier","targetPct":65,"minPct":64.5,"maxPct":65.5,"unit":"kg","scaling":"proportional"},{"id":"i2","refType":"material","refId":"MAT-0891","name":"UV-Stabilizer Powder","targetPct":2.5,"minPct":2.45,"maxPct":2.55,"unit":"kg","scaling":"fixed"},{"id":"i3","refType":"material","refId":"MAT-0103","name":"Titanium Dioxide","targetPct":12,"minPct":11.8,"maxPct":12.2,"unit":"kg","scaling":"proportional"},{"id":"i4","refType":"material","refId":"MAT-0210","name":"Deionized Water","targetPct":20.5,"minPct":20,"maxPct":21,"unit":"L","scaling":"proportional"}]'::jsonb,'[{"seq":1,"phase":"High-Shear Mixing","parameter":"RPM","targetValue":1200,"unit":"rpm","durationMin":25},{"seq":2,"phase":"Thermal Curing","parameter":"Target Temperature","targetValue":85,"unit":"°C","durationMin":45},{"seq":3,"phase":"Cool-Down","parameter":"Target Temperature","targetValue":25,"unit":"°C","durationMin":30}]'::jsonb,'{"hazards":["Flammable Liquids - Category 3"],"allergens":[],"storageMaxC":25,"shelfLifeDays":365}'::jsonb,'M. Fahad',ARRAY[]::text[],'2026-07-13');
INSERT INTO public.recipes (id, code, name, project, version, parent_id, branch_label, status, classification, target_yield, items, process, compliance, created_by_name, approved_by, updated_at) VALUES ('REC-0002','ECO-COAT-LOW','EcoCoat — Low Cost Variant','Project Helios','v4.2-A','REC-0001','Low Cost','review','Industrial Coating','{"value":1000,"unit":"kg"}'::jsonb,'[{"id":"i1","refType":"material","refId":"MAT-0042","name":"Bio-Based Resin Carrier","targetPct":60,"minPct":59.5,"maxPct":60.5,"unit":"kg","scaling":"proportional"},{"id":"i2","refType":"material","refId":"MAT-0891","name":"UV-Stabilizer Powder","targetPct":1.5,"minPct":1.45,"maxPct":1.55,"unit":"kg","scaling":"fixed"},{"id":"i3","refType":"material","refId":"MAT-0103","name":"Titanium Dioxide","targetPct":15,"minPct":14.7,"maxPct":15.3,"unit":"kg","scaling":"proportional"},{"id":"i4","refType":"material","refId":"MAT-0210","name":"Deionized Water","targetPct":23.5,"minPct":23,"maxPct":24,"unit":"L","scaling":"proportional"}]'::jsonb,'[{"seq":1,"phase":"High-Shear Mixing","parameter":"RPM","targetValue":1000,"unit":"rpm","durationMin":30},{"seq":2,"phase":"Thermal Curing","parameter":"Target Temperature","targetValue":80,"unit":"°C","durationMin":50}]'::jsonb,'{"hazards":["Flammable Liquids - Category 3"],"allergens":[],"storageMaxC":25,"shelfLifeDays":300}'::jsonb,'M. Fahad',ARRAY[]::text[],'2026-07-12');
INSERT INTO public.recipes (id, code, name, project, version, parent_id, branch_label, status, classification, target_yield, items, process, compliance, created_by_name, approved_by, updated_at) VALUES ('REC-0003','ECO-COAT-PREM','EcoCoat — Premium Plasticizer','Project Helios','v4.2-B','REC-0001','Premium','approved','Industrial Coating','{"value":500,"unit":"kg"}'::jsonb,'[{"id":"i1","refType":"material","refId":"MAT-0042","name":"Bio-Based Resin Carrier","targetPct":68,"minPct":67.5,"maxPct":68.5,"unit":"kg","scaling":"proportional"},{"id":"i2","refType":"material","refId":"MAT-0891","name":"UV-Stabilizer Powder","targetPct":3.5,"minPct":3.4,"maxPct":3.6,"unit":"kg","scaling":"fixed"},{"id":"i3","refType":"material","refId":"MAT-0103","name":"Titanium Dioxide","targetPct":10,"minPct":9.8,"maxPct":10.2,"unit":"kg","scaling":"proportional"},{"id":"i4","refType":"material","refId":"MAT-0210","name":"Deionized Water","targetPct":18.5,"minPct":18,"maxPct":19,"unit":"L","scaling":"proportional"}]'::jsonb,'[{"seq":1,"phase":"High-Shear Mixing","parameter":"RPM","targetValue":1400,"unit":"rpm","durationMin":20},{"seq":2,"phase":"Thermal Curing","parameter":"Target Temperature","targetValue":90,"unit":"°C","durationMin":40}]'::jsonb,'{"hazards":["Flammable Liquids - Category 3"],"allergens":[],"storageMaxC":25,"shelfLifeDays":540}'::jsonb,'L. Chen',ARRAY['S. Al-Rashid']::text[],'2026-07-13');
INSERT INTO public.recipes (id, code, name, project, version, parent_id, branch_label, status, classification, target_yield, items, process, compliance, created_by_name, approved_by, updated_at) VALUES ('REC-0004','CHOC-GANACHE-V1','Dark Ganache Base','Confection R&D','v1.0',NULL,'Baseline','released','Food — Filling','{"value":25,"unit":"kg"}'::jsonb,'[{"id":"i1","refType":"material","refId":"MAT-0311","name":"Cocoa Butter","targetPct":45,"minPct":44.5,"maxPct":45.5,"unit":"kg","scaling":"proportional"},{"id":"i2","refType":"material","refId":"MAT-0312","name":"Cane Sugar","targetPct":30,"minPct":29.8,"maxPct":30.2,"unit":"kg","scaling":"proportional"},{"id":"i3","refType":"material","refId":"MAT-0313","name":"Whole Milk Powder","targetPct":22,"minPct":21.8,"maxPct":22.2,"unit":"kg","scaling":"proportional"},{"id":"i4","refType":"material","refId":"MAT-0314","name":"Vanilla Extract","targetPct":3,"minPct":2.9,"maxPct":3.1,"unit":"L","scaling":"fixed"}]'::jsonb,'[{"seq":1,"phase":"Tempering","parameter":"Target Temperature","targetValue":45,"unit":"°C","durationMin":15},{"seq":2,"phase":"Emulsify","parameter":"RPM","targetValue":600,"unit":"rpm","durationMin":10}]'::jsonb,'{"hazards":[],"allergens":["Milk"],"storageMaxC":18,"shelfLifeDays":180}'::jsonb,'N. Al-Sabah',ARRAY['S. Al-Rashid']::text[],'2026-06-28');
INSERT INTO public.recipes (id, code, name, project, version, parent_id, branch_label, status, classification, target_yield, items, process, compliance, created_by_name, approved_by, updated_at) VALUES ('REC-0005','ECO-COAT-V3','EcoCoat Blend (Archived)','Project Helios','v3.0',NULL,'Archived','superseded','Industrial Coating','{"value":1000,"unit":"kg"}'::jsonb,'[{"id":"i1","refType":"material","refId":"MAT-0042","name":"Bio-Based Resin Carrier","targetPct":70,"minPct":69,"maxPct":71,"unit":"kg","scaling":"proportional"},{"id":"i2","refType":"material","refId":"MAT-0210","name":"Deionized Water","targetPct":30,"minPct":29,"maxPct":31,"unit":"L","scaling":"proportional"}]'::jsonb,'[]'::jsonb,'{"hazards":[],"allergens":[],"storageMaxC":25,"shelfLifeDays":120}'::jsonb,'M. Fahad',ARRAY[]::text[],'2026-05-10');
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0042','{"id":"MAT-0042","name":"Bio-Based Resin Carrier","category":"Polymer","physicalState":"Liquid","baseCost":4.85,"unit":"kg","schemaId":"sch-chem","attrs":{"cas":"9003-35-4","viscosity":850,"ph":6.8,"flashPoint":62},"supplier":"Helios Chemicals","updatedAt":"2026-07-08"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0891','{"id":"MAT-0891","name":"UV-Stabilizer Powder","category":"Additive","physicalState":"Powder","baseCost":22.4,"unit":"kg","schemaId":"sch-chem","attrs":{"cas":"2440-22-4","viscosity":0,"ph":7,"flashPoint":210},"supplier":"NovaSpec","updatedAt":"2026-07-11"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0103','{"id":"MAT-0103","name":"Titanium Dioxide","category":"Pigment","physicalState":"Powder","baseCost":3.2,"unit":"kg","schemaId":"sch-chem","attrs":{"cas":"13463-67-7","ph":7.2,"flashPoint":0},"supplier":"Kronos","updatedAt":"2026-06-30"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0210','{"id":"MAT-0210","name":"Deionized Water","category":"Solvent","physicalState":"Liquid","baseCost":0.02,"unit":"L","schemaId":"sch-chem","attrs":{"cas":"7732-18-5","ph":7,"viscosity":1},"updatedAt":"2026-07-01"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0311','{"id":"MAT-0311","name":"Cocoa Butter","category":"Fat","physicalState":"Solid","baseCost":12.5,"unit":"kg","schemaId":"sch-food","attrs":{"allergens":"None","calories":899,"fat":99.9,"brix":0},"supplier":"Barry Callebaut","updatedAt":"2026-07-05"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0312','{"id":"MAT-0312","name":"Cane Sugar","category":"Sweetener","physicalState":"Powder","baseCost":0.9,"unit":"kg","schemaId":"sch-food","attrs":{"allergens":"None","calories":387,"fat":0,"brix":99},"updatedAt":"2026-06-28"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0313','{"id":"MAT-0313","name":"Whole Milk Powder","category":"Dairy","physicalState":"Powder","baseCost":4.1,"unit":"kg","schemaId":"sch-food","attrs":{"allergens":"Milk","calories":496,"fat":26,"brix":0},"updatedAt":"2026-07-02"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('material','MAT-0314','{"id":"MAT-0314","name":"Vanilla Extract","category":"Flavor","physicalState":"Liquid","baseCost":78,"unit":"L","schemaId":"sch-food","attrs":{"allergens":"None","calories":288,"fat":0.1,"brix":20},"updatedAt":"2026-07-09"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('unit','u-g','{"id":"u-g","name":"Gram","dimension":"Mass","baseMultiplier":1,"symbol":"g"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('unit','u-kg','{"id":"u-kg","name":"Kilogram","dimension":"Mass","baseMultiplier":1000,"symbol":"kg"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('unit','u-mg','{"id":"u-mg","name":"Milligram","dimension":"Mass","baseMultiplier":0.001,"symbol":"mg"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('unit','u-ml','{"id":"u-ml","name":"Milliliter","dimension":"Volume","baseMultiplier":1,"symbol":"mL"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('unit','u-l','{"id":"u-l","name":"Liter","dimension":"Volume","baseMultiplier":1000,"symbol":"L"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('unit','u-ea','{"id":"u-ea","name":"Each","dimension":"Count","baseMultiplier":1,"symbol":"ea"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('unit','u-pallet','{"id":"u-pallet","name":"Pallet","dimension":"Discrete","baseMultiplier":1,"symbol":"plt"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('schema','sch-food','{"id":"sch-food","name":"Food & Beverage","domain":"F&B","fields":[{"key":"allergens","label":"Allergens","type":"text"},{"key":"calories","label":"Calories","type":"number","unit":"kcal/100g"},{"key":"fat","label":"Fat","type":"number","unit":"g/100g"},{"key":"brix","label":"Brix","type":"number","unit":"°Bx"}]}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('schema','sch-chem','{"id":"sch-chem","name":"Chemical / Cosmetics","domain":"Chemical","fields":[{"key":"cas","label":"CAS Number","type":"text"},{"key":"viscosity","label":"Viscosity","type":"number","unit":"cP"},{"key":"ph","label":"pH Level","type":"number"},{"key":"flashPoint","label":"Flash Point","type":"number","unit":"°C"}]}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('trial','TR-1041','{"id":"TR-1041","recipeId":"REC-0001","recipeName":"EcoCoat Blend v4.2","batchCode":"LAB-24-0812","operator":"R. Ito","observation":"Batch separated at 40°C after 12 min mixing.","outcome":"fail","sensory":{"color":7,"smell":6,"texture":3},"analytics":[{"key":"Viscosity","value":920,"unit":"cP"},{"key":"pH","value":6.9,"unit":""}],"loggedAt":"2026-07-12 14:22"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('trial','TR-1042','{"id":"TR-1042","recipeId":"REC-0002","recipeName":"EcoCoat Low Cost v4.2-A","batchCode":"LAB-24-0813","operator":"R. Ito","observation":"Texture within spec, slight sedimentation after 48h.","outcome":"inconclusive","sensory":{"color":8,"smell":7,"texture":7},"analytics":[{"key":"Viscosity","value":780,"unit":"cP"}],"loggedAt":"2026-07-13 09:15"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('trial','TR-1043','{"id":"TR-1043","recipeId":"REC-0004","recipeName":"Dark Ganache Base v1.0","batchCode":"PILOT-25-0311","operator":"N. Al-Sabah","observation":"Smooth emulsion, glossy finish, target Brix reached.","outcome":"pass","sensory":{"color":9,"smell":9,"texture":9},"analytics":[{"key":"Brix","value":62,"unit":"°Bx"}],"loggedAt":"2026-06-28 10:04"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('trial','TR-1044','{"id":"TR-1044","recipeId":"REC-0003","recipeName":"EcoCoat Premium v4.2-B","batchCode":"LAB-24-0820","operator":"L. Chen","observation":"Cure time exceeded target by 6 min. Flow visibly higher.","outcome":"pass","sensory":{"color":9,"smell":8,"texture":8},"analytics":[{"key":"Viscosity","value":1150,"unit":"cP"}],"loggedAt":"2026-07-13 16:41"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('api_key','key-01','{"id":"key-01","label":"ERP Nightly Sync","tokenPreview":"rms_live_9f2a3b4c…d0e1","scopes":["recipes:read","materials:read"],"createdBy":"R. Admin","createdAt":"2026-04-02","expiresAt":"2026-10-02","lastUsed":"2026-07-13 02:00","active":true,"callsToday":148}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('api_key','key-02','{"id":"key-02","label":"MES Push (Line 3)","tokenPreview":"rms_live_1a2b3c4d…9f0e","scopes":["recipes:read","recipes:write"],"createdBy":"R. Admin","createdAt":"2026-06-14","expiresAt":null,"lastUsed":"2026-07-14 06:12","active":true,"callsToday":34}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('api_key','key-03','{"id":"key-03","label":"Legacy LIMS","tokenPreview":"rms_live_deadbeef…c0de","scopes":["materials:read"],"createdBy":"R. Admin","createdAt":"2025-11-20","expiresAt":"2026-02-20","lastUsed":"2026-02-19 22:44","active":false,"callsToday":0}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-01','{"id":"VR-01","name":"Composition sums to 100%","kind":"sum_100","enabled":true,"severity":"error","config":{"tolerance":0.01}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-02','{"id":"VR-02","name":"Target within min / max limits","kind":"min_max","enabled":true,"severity":"error","config":{}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-03','{"id":"VR-03","name":"At least one process step","kind":"required_step","enabled":true,"severity":"error","config":{"minSteps":1}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-04','{"id":"VR-04","name":"Mixing step required","kind":"required_step","enabled":false,"severity":"warning","config":{"phaseContains":"Mix"}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-05','{"id":"VR-05","name":"All references exist in master data","kind":"required_ref","enabled":true,"severity":"error","config":{}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-06','{"id":"VR-06","name":"Process parameter values numeric & > 0 duration","kind":"data_type","enabled":true,"severity":"error","config":{}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-07','{"id":"VR-07","name":"Temperature ≤ equipment max","kind":"equipment_compat","enabled":true,"severity":"warning","config":{"maxTempC":120}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('validation_rule','VR-08','{"id":"VR-08","name":"Required parameter: shelf life","kind":"required_param","enabled":true,"severity":"warning","config":{"field":"shelfLifeDays"}}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('execution','EX-3001','{"id":"EX-3001","recipeId":"REC-0004","recipeCode":"CHOC-GANACHE-V1","version":"v1.0","productionOrder":"PO-26-1182","batch":"B-260701-01","equipment":"Mixer MX-04","line":"Line 2","operator":"R. Ito","startedAt":"2026-07-01 06:10","finishedAt":"2026-07-01 07:02","status":"completed","source":"MES","qcStatus":"passed","actualYield":24.6}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('execution','EX-3002','{"id":"EX-3002","recipeId":"REC-0004","recipeCode":"CHOC-GANACHE-V1","version":"v1.0","productionOrder":"PO-26-1207","batch":"B-260709-02","equipment":"Mixer MX-04","line":"Line 2","operator":"R. Ito","startedAt":"2026-07-09 13:40","finishedAt":"2026-07-09 14:35","status":"completed","source":"MES","qcStatus":"failed","actualYield":23.1,"notes":"Viscosity OOS — NCR raised in CORTA QC"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('execution','EX-3003','{"id":"EX-3003","recipeId":"REC-0004","recipeCode":"CHOC-GANACHE-V1","version":"v1.0","productionOrder":"PO-26-1231","batch":"B-260714-01","equipment":"Mixer MX-02","line":"Line 1","operator":"R. Ito","startedAt":"2026-07-14 06:00","finishedAt":null,"status":"running","source":"MES","qcStatus":"pending"}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('integration','INT-MES','{"id":"INT-MES","system":"MES Command Center","kind":"MES","direction":"bidirectional","baseUrl":"https://mes.cortanex.local/api/v1","status":"connected","lastSync":"2026-07-14 08:02","events":["recipe.released → MES","recipe.obsoleted → MES","execution.started ← MES","execution.completed ← MES"],"messagesToday":212}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('integration','INT-QMS','{"id":"INT-QMS","system":"CORTA QC System","kind":"QMS","direction":"bidirectional","baseUrl":"https://qc.cortanex.local/api/v1","status":"connected","lastSync":"2026-07-14 07:55","events":["recipe.approved → QMS (spec sync)","inspection.result ← QMS","ncr.raised ← QMS","change.request ↔ QMS"],"messagesToday":87}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('integration','INT-ERP','{"id":"INT-ERP","system":"ERP (Materials & Orders)","kind":"ERP","direction":"inbound","baseUrl":"https://erp.cortanex.local/odata","status":"degraded","lastSync":"2026-07-14 02:00","events":["material.master ← ERP","production.order ← ERP"],"messagesToday":148}'::jsonb);
INSERT INTO public.rms_records (kind, id, data) VALUES ('integration','INT-EQ','{"id":"INT-EQ","system":"Equipment / PLC Gateway","kind":"Equipment","direction":"outbound","baseUrl":"opc.tcp://plc-gw.cortanex.local:4840","status":"disconnected","lastSync":"2026-07-12 18:20","events":["recipe.download → PLC"],"messagesToday":0}'::jsonb);
INSERT INTO public.audit_log (ts, actor_name, action, entity, property, before_value, after_value, reason, version) VALUES ('2026-07-13 14:22:11','M. Fahad','UPDATE','REC-0001 / item:i1','targetPct','63.0000','65.0000',NULL,NULL);
INSERT INTO public.audit_log (ts, actor_name, action, entity, property, before_value, after_value, reason, version) VALUES ('2026-07-13 14:22:11','M. Fahad','UPDATE','REC-0001 / item:i4','targetPct','22.5000','20.5000',NULL,NULL);
INSERT INTO public.audit_log (ts, actor_name, action, entity, property, before_value, after_value, reason, version) VALUES ('2026-07-13 09:15:02','S. Al-Rashid','APPROVE','REC-0003','status','review','approved','Meets QA spec QS-114','v4.2-B');
INSERT INTO public.audit_log (ts, actor_name, action, entity, property, before_value, after_value, reason, version) VALUES ('2026-07-12 14:24:00','R. Ito','CREATE','TR-1041','trial','—','logged',NULL,NULL);
INSERT INTO public.audit_log (ts, actor_name, action, entity, property, before_value, after_value, reason, version) VALUES ('2026-07-12 08:00:00','System','TOKEN_USED','key-01','endpoint','—','GET /materials',NULL,NULL);
INSERT INTO public.audit_log (ts, actor_name, action, entity, property, before_value, after_value, reason, version) VALUES ('2026-07-11 17:41:22','R. Admin','REVOKE','key-03','active','true','false',NULL,NULL);

ALTER TABLE public.recipes ENABLE TRIGGER recipes_audit;
ALTER TABLE public.rms_records ENABLE TRIGGER records_audit;