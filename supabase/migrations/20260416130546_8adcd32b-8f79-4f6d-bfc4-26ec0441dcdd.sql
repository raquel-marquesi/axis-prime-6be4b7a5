
-- Realign user IDs: profiles, user_roles, and all FK tables
-- Each user mapping: old_id -> new_auth_id

DO $$
DECLARE
  -- Mapping arrays
  old_ids uuid[] := ARRAY[
    '8deec831-5e0a-4d60-a1e2-be3f3dd567ea',  -- ADMINISTRADOR LM
    '6d3a874a-74f8-4700-91a4-a20580cd4766',  -- CAROLINA CASELLI
    '2056c272-89c4-42ab-84d9-adf1e3211c74',  -- FABRICIO FERREIRA
    '35a01de6-2d64-4fac-a4f4-b1f70032a64e',  -- RAQUEL CASELLI
    '9bdf4197-6ce4-4463-9ba3-d375f3b15dfe'   -- VICTOR HUGO
  ];
  new_ids uuid[] := ARRAY[
    'e9d6e6e3-9231-4b7e-a7b5-85e318bb3a40',  -- ADMINISTRADOR LM
    'ed356bd4-63f5-4eb9-bb41-cde01424f9ad',  -- CAROLINA CASELLI
    '2de1d246-b245-43a6-831e-ae583e1a4a55',  -- FABRICIO FERREIRA
    'a62e577b-9708-4a45-86a5-7e1212ecc9b5',  -- RAQUEL CASELLI
    '759f3a6f-6b3f-40fc-95d6-a55ba593b89f'   -- VICTOR HUGO
  ];
  i int;
  v_old uuid;
  v_new uuid;
BEGIN
  FOR i IN 1..array_length(old_ids, 1) LOOP
    v_old := old_ids[i];
    v_new := new_ids[i];

    -- 1. Update timesheet_entries (no FK constraint, safe to do first)
    UPDATE timesheet_entries SET user_id = v_new WHERE user_id = v_old;

    -- 2. Update process_deadlines assigned_to
    UPDATE process_deadlines SET assigned_to = v_new WHERE assigned_to = v_old;

    -- 3. Update process_deadlines completed_by
    UPDATE process_deadlines SET completed_by = v_new WHERE completed_by = v_old;

    -- 4. Update bonus_calculations
    UPDATE bonus_calculations SET user_id = v_new WHERE user_id = v_old;

    -- 5. Update calendar_events
    UPDATE calendar_events SET user_id = v_new WHERE user_id = v_old;

    -- 6. Update user_roles: delete if new already has one, then update
    DELETE FROM user_roles WHERE user_id = v_new;
    UPDATE user_roles SET user_id = v_new WHERE user_id = v_old;

    -- 7. Update profiles: if new_id profile already exists (Raquel case), 
    --    copy important fields from old to new, then delete old
    IF EXISTS (SELECT 1 FROM profiles WHERE user_id = v_new) THEN
      -- Update the existing auth-created profile with richer data from old profile
      UPDATE profiles p_new SET
        full_name = COALESCE(p_old.full_name, p_new.full_name),
        area = COALESCE(p_old.area, p_new.area),
        reports_to = COALESCE(p_old.reports_to, p_new.reports_to),
        avatar_url = COALESCE(p_old.avatar_url, p_new.avatar_url)
      FROM profiles p_old
      WHERE p_new.user_id = v_new AND p_old.user_id = v_old;
      
      -- Delete the orphan old profile
      DELETE FROM profiles WHERE user_id = v_old;
    ELSE
      -- Simply re-point the profile
      UPDATE profiles SET user_id = v_new WHERE user_id = v_old;
    END IF;
  END LOOP;
END $$;
