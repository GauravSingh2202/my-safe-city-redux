
-- Drop existing FKs that point to auth.users
ALTER TABLE public.crime_reports DROP CONSTRAINT crime_reports_user_id_fkey;
ALTER TABLE public.sos_alerts DROP CONSTRAINT sos_alerts_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;

-- Recreate FKs pointing to profiles
ALTER TABLE public.crime_reports
  ADD CONSTRAINT crime_reports_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.sos_alerts
  ADD CONSTRAINT sos_alerts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
