-- Set search_path pada fungsi yang belum punya
CREATE OR REPLACE FUNCTION public.enforce_max_two_parents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.parent_links WHERE child_id = NEW.child_id AND is_active = true) >= 2 THEN
    RAISE EXCEPTION 'Maksimal 2 orang tua yang dapat dihubungkan';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Cabut execute publik untuk fungsi trigger-only
REVOKE EXECUTE ON FUNCTION public.enforce_max_two_parents() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role & is_pro: dipakai dalam policy, hanya perlu authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_pro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro(uuid) TO authenticated;