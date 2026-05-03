
ALTER TABLE public.crime_reports
  ADD COLUMN IF NOT EXISTS authenticity_score integer,
  ADD COLUMN IF NOT EXISTS authenticity_analysis jsonb DEFAULT '{}'::jsonb;

-- Allow the trigger that blocks citizen edits to NOT block authenticity fields written by service role / admins.
-- Existing trigger already only blocks status/admin_action/etc; authenticity fields are not in that list, so no change needed.
