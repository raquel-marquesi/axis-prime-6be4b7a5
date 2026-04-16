-- Idempotent realignment of orphan profile.user_id values to auth.users.id
BEGIN;

DO $$
DECLARE
  v_rec RECORD;
  v_old uuid;
  v_new uuid;
BEGIN
  FOR v_rec IN
    SELECT p.user_id AS old_id, au.id AS new_id, p.email
    FROM public.profiles p
    JOIN auth.users au ON au.email = p.email
    WHERE p.user_id <> au.id
  LOOP
    v_old := v_rec.old_id;
    v_new := v_rec.new_id;
    RAISE NOTICE 'Realigning % : % -> %', v_rec.email, v_old, v_new;

    UPDATE public.timesheet_entries        SET user_id      = v_new WHERE user_id      = v_old;
    UPDATE public.timesheet_entries        SET approved_by  = v_new WHERE approved_by  = v_old;
    UPDATE public.calendar_events          SET user_id      = v_new WHERE user_id      = v_old;
    UPDATE public.bonus_calculations       SET user_id      = v_new WHERE user_id      = v_old;
    UPDATE public.bonus_calculations       SET approved_by  = v_new WHERE approved_by  = v_old;
    UPDATE public.bonus_calculations       SET billed_by    = v_new WHERE billed_by    = v_old;
    UPDATE public.bonus_provisions         SET user_id      = v_new WHERE user_id      = v_old;
    UPDATE public.process_deadlines        SET assigned_to  = v_new WHERE assigned_to  = v_old;
    UPDATE public.process_deadlines        SET completed_by = v_new WHERE completed_by = v_old;
    UPDATE public.solicitacoes             SET assigned_to  = v_new WHERE assigned_to  = v_old;
    UPDATE public.solicitacoes             SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.team_clients             SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.user_aliases             SET user_id      = v_new WHERE user_id      = v_old;
    UPDATE public.user_aliases             SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.access_logs              SET user_id      = v_new WHERE user_id      = v_old;
    UPDATE public.audit_logs               SET user_id      = v_new WHERE user_id      = v_old;
    UPDATE public.bank_statements          SET uploaded_by  = v_new WHERE uploaded_by  = v_old;
    UPDATE public.billing_contacts         SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.billing_previews         SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.boletos                  SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.client_aliases           SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.client_documents         SET uploaded_by  = v_new WHERE uploaded_by  = v_old;
    UPDATE public.clients                  SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.contract_extractions     SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.expenses                 SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.invoices                 SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.processes                SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.related_processes        SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.accounts                 SET created_by   = v_new WHERE created_by   = v_old;
    UPDATE public.treasury_entries         SET created_by   = v_new WHERE created_by   = v_old;

    DELETE FROM public.user_roles WHERE user_id = v_new;
    UPDATE public.user_roles SET user_id = v_new WHERE user_id = v_old;

    DELETE FROM public.user_permission_overrides WHERE user_id = v_new;
    UPDATE public.user_permission_overrides SET user_id = v_new WHERE user_id = v_old;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_new) THEN
      UPDATE public.profiles p_new SET
        full_name  = COALESCE(p_old.full_name,  p_new.full_name),
        area       = COALESCE(p_old.area,       p_new.area),
        reports_to = COALESCE(p_old.reports_to, p_new.reports_to),
        avatar_url = COALESCE(p_old.avatar_url, p_new.avatar_url),
        is_active  = COALESCE(p_new.is_active, p_old.is_active, true)
      FROM public.profiles p_old
      WHERE p_new.user_id = v_new AND p_old.user_id = v_old;
      DELETE FROM public.profiles WHERE user_id = v_old;
    ELSE
      UPDATE public.profiles SET user_id = v_new WHERE user_id = v_old;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.profiles p
  JOIN auth.users au ON au.email = p.email
  WHERE p.user_id <> au.id;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Realign validation failed: % profiles still misaligned', v_count;
  END IF;
END $$;

COMMIT;