
-- ============================================================
-- EMERGENCY FIX: Disable Auth Trigger to restore access
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function for future reference, but remove the trigger
-- that was potentially blocking login for existing users.
