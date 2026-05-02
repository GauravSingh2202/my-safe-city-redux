
-- 1. Fix notifications INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Users create own notifications or admins create any"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 2. Split crime_reports UPDATE policy
DROP POLICY IF EXISTS "Users can update own reports or admin updates all" ON public.crime_reports;

-- Trigger to prevent non-admins from changing privileged fields
CREATE OR REPLACE FUNCTION public.prevent_citizen_admin_field_writes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.admin_action IS DISTINCT FROM OLD.admin_action
     OR NEW.assigned_station IS DISTINCT FROM OLD.assigned_station
     OR NEW.estimated_resolution_time IS DISTINCT FROM OLD.estimated_resolution_time
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
  THEN
    RAISE EXCEPTION 'Only admins can modify status, admin_action, assigned_station, estimated_resolution_time, or resolved_at';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_admin_fields ON public.crime_reports;
CREATE TRIGGER guard_admin_fields
  BEFORE UPDATE ON public.crime_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_citizen_admin_field_writes();

CREATE POLICY "Owners or admins can update reports"
  ON public.crime_reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. Restrict has_role execution to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 4. OTP store + rate limit tables (for send-otp edge function hardening)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Only service_role (edge function) can read/write.

CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  phone TEXT PRIMARY KEY,
  attempts INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = no client access.
