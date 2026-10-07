CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- allow settings records
ALTER TABLE public.rms_records DROP CONSTRAINT IF EXISTS rms_records_kind_check;
ALTER TABLE public.rms_records ADD CONSTRAINT rms_records_kind_check
  CHECK (kind IN ('material','unit','schema','trial','api_key','validation_rule','execution','integration','setting'));

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

-- execution updates only by operators while running; completed/aborted executions are locked
CREATE OR REPLACE FUNCTION public.records_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.kind = 'execution' AND OLD.data->>'status' IN ('completed','aborted')
     AND current_setting('request.jwt.claims', true)::jsonb->>'role' = 'authenticated' THEN
    RAISE EXCEPTION 'Completed executions are locked';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER records_guard BEFORE UPDATE ON public.rms_records FOR EACH ROW EXECUTE FUNCTION public.records_guard();

INSERT INTO public.rms_records (kind, id, data) VALUES
 ('setting','workflow','{"id":"workflow","qaApprovalsRequired":1,"reviewSlaDays":3,"requireSignature":true}'::jsonb),
 ('setting','organization','{"id":"organization","name":"Cortanex Labs","timezone":"Asia/Amman","codePrefix":"REC","defaultUnit":"kg","sessionTimeoutMin":30}'::jsonb),
 ('setting','retention','{"id":"retention","auditYears":10,"releasedRecipes":"forever","draftIdleDays":180,"trialYears":5,"executionYears":10,"legalHold":false}'::jsonb)
ON CONFLICT DO NOTHING;

ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS signed boolean NOT NULL DEFAULT false;

-- private config (no client access)
CREATE TABLE public.app_config (key text PRIMARY KEY, value text NOT NULL);
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_config (key, value) VALUES ('esign_secret', encode(extensions.gen_random_bytes(32), 'hex'));

-- notifications
CREATE TABLE public.notifications (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_role(_role public.app_role, _title text, _body text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT DISTINCT user_id, _title, _body, _link FROM public.user_roles WHERE role = _role AND user_id IS DISTINCT FROM auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.notify_role(public.app_role, text, text, text) FROM PUBLIC, anon, authenticated;

-- API keys (hashed)
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  call_count bigint NOT NULL DEFAULT 0
);
GRANT SELECT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read keys" ON public.api_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update keys" ON public.api_keys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete keys" ON public.api_keys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_api_key(_label text, _scopes text[], _expires_at timestamptz DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _token text := 'rms_' || encode(extensions.gen_random_bytes(24), 'hex');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only administrators can create API keys'; END IF;
  INSERT INTO public.api_keys (label, prefix, key_hash, scopes, expires_at, created_by, created_by_name)
  VALUES (_label, left(_token, 12), encode(extensions.digest(_token, 'sha256'), 'hex'), _scopes, _expires_at, auth.uid(), public.current_actor_name());
  PERFORM public.write_audit('CREATE', 'api_key:' || left(_token, 12), 'api_key', '—', _label, NULL, NULL);
  RETURN _token;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_api_key(text, text[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_api_key(text, text[], timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.api_keys_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM public.write_audit('DELETE', 'api_key:' || OLD.prefix, 'api_key', OLD.label, '—', NULL, NULL); RETURN OLD; END IF;
  IF OLD.active AND NOT NEW.active THEN PERFORM public.write_audit('REVOKE', 'api_key:' || NEW.prefix, 'active', 'true', 'false', NULL, NULL); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER api_keys_audit AFTER UPDATE OR DELETE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.api_keys_audit();

-- integration message log
CREATE TABLE public.integration_messages (
  id bigserial PRIMARY KEY,
  integration_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','failed','accepted','rejected')),
  response text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_messages TO authenticated;
GRANT ALL ON public.integration_messages TO service_role;
ALTER TABLE public.integration_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read integration log" ON public.integration_messages FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','production_manager','qa_manager']::public.app_role[]));

-- Workflow with e-signature, multi-approval and notifications
DROP FUNCTION IF EXISTS public.transition_recipe(text, text, text);
CREATE OR REPLACE FUNCTION public.transition_recipe(_id text, _action text, _reason text DEFAULT '', _sig text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.recipes;
  _to text;
  _from text[];
  _role public.app_role;
  _total numeric;
  _actor text := public.current_actor_name();
  _cfg jsonb := COALESCE((SELECT data FROM public.rms_records WHERE kind = 'setting' AND id = 'workflow'), '{}'::jsonb);
  _needed int := GREATEST(1, COALESCE((_cfg->>'qaApprovalsRequired')::int, 1));
  _signed boolean := false;
  _secret text;
  _link text := '/recipes/' || _id;
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
  IF _action = 'approve' AND _actor = ANY(r.approved_by) THEN RAISE EXCEPTION 'You have already approved this version'; END IF;
  IF _action IN ('reject','return','obsolete') AND COALESCE(btrim(_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;

  IF _action IN ('approve','reject','release','obsolete') AND COALESCE((_cfg->>'requireSignature')::boolean, true) THEN
    SELECT value INTO _secret FROM public.app_config WHERE key = 'esign_secret';
    IF _sig IS NULL OR _sig <> encode(extensions.hmac(auth.uid()::text || ':' || _id || ':' || _action, _secret, 'sha256'), 'hex') THEN
      RAISE EXCEPTION 'Electronic signature required: confirm with your password';
    END IF;
    _signed := true;
  END IF;

  IF _action IN ('submit','approve','release') THEN
    SELECT COALESCE(sum((i->>'targetPct')::numeric), 0) INTO _total FROM jsonb_array_elements(r.items) i;
    IF abs(_total - 100) > 0.01 THEN RAISE EXCEPTION 'Validation failed: composition totals % percent', _total; END IF;
  END IF;

  IF _action = 'approve' AND COALESCE(array_length(r.approved_by, 1), 0) + 1 < _needed THEN
    _to := 'review';
  END IF;

  IF _action = 'release' THEN
    UPDATE public.recipes SET status = 'superseded' WHERE code = r.code AND status = 'released' AND id <> r.id;
  END IF;

  UPDATE public.recipes SET status = _to,
    approved_by = CASE WHEN _action = 'approve' THEN array_append(approved_by, _actor)
                       WHEN _action IN ('reject','return') THEN '{}'::text[] ELSE approved_by END
  WHERE id = _id;

  INSERT INTO public.audit_log (actor_id, actor_name, action, entity, property, before_value, after_value, reason, version, signed)
  VALUES (auth.uid(), _actor, upper(_action), _id, 'status', r.status, _to, NULLIF(btrim(_reason), ''), r.version, _signed);

  -- notifications
  IF _action = 'submit' THEN
    PERFORM public.notify_role('qa_manager', 'Review requested', r.code || ' ' || r.version || ' submitted by ' || _actor, _link);
  ELSIF _action = 'approve' AND _to = 'approved' THEN
    PERFORM public.notify_role('production_manager', 'Ready for release', r.code || ' ' || r.version || ' approved by ' || _actor, _link);
  ELSIF _action = 'release' THEN
    PERFORM public.notify_role('operator', 'New released recipe', r.code || ' ' || r.version || ' is available for production', '/execution');
  END IF;
  IF r.created_by IS NOT NULL AND r.created_by <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (r.created_by, 'Your recipe: ' || initcap(_action), r.code || ' ' || r.version || ' → ' || _to || COALESCE(' · ' || NULLIF(btrim(_reason), ''), ''), _link);
  END IF;
  RETURN _to;
END $$;
REVOKE EXECUTE ON FUNCTION public.transition_recipe(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_recipe(text, text, text, text) TO authenticated;