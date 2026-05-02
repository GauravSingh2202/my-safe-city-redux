
ALTER TABLE public.sos_alerts
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responder_name TEXT,
  ADD COLUMN IF NOT EXISTS eta_minutes INTEGER;

-- Auto-stamp acknowledged_at when status moves to 'responding'
CREATE OR REPLACE FUNCTION public.set_sos_acknowledged_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'responding' AND (OLD.status IS DISTINCT FROM 'responding') AND NEW.acknowledged_at IS NULL THEN
    NEW.acknowledged_at = now();
  END IF;
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_sos_acknowledged_at() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS sos_acknowledged_trigger ON public.sos_alerts;
CREATE TRIGGER sos_acknowledged_trigger
  BEFORE UPDATE ON public.sos_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sos_acknowledged_at();
