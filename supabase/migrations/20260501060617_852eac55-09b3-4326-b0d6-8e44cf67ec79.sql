-- 1. Extend crime_reports
ALTER TABLE public.crime_reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crime_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_station TEXT,
  ADD COLUMN IF NOT EXISTS estimated_resolution_time TEXT,
  ADD COLUMN IF NOT EXISTS admin_action JSONB DEFAULT '{}'::jsonb;

-- Auto-set resolved_at when status flips to resolved
CREATE OR REPLACE FUNCTION public.set_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_resolved_at ON public.crime_reports;
CREATE TRIGGER trg_set_resolved_at
  BEFORE UPDATE ON public.crime_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_resolved_at();

-- 2. chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL DEFAULT '',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chats or admin views all"
  ON public.chat_messages FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own chats"
  ON public.chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own chats"
  ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
  ON public.chat_messages (user_id, created_at DESC);

-- 3. Realtime for sos_alerts and notifications
ALTER TABLE public.sos_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.crime_reports REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;