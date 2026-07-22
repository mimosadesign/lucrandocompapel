ALTER TABLE public.lifetime_emails
  ADD COLUMN IF NOT EXISTS duration text NOT NULL DEFAULT 'lifetime',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

UPDATE public.lifetime_emails
SET duration = 'lifetime', expires_at = NULL
WHERE duration IS NULL;

ALTER TABLE public.lifetime_emails
  ADD CONSTRAINT lifetime_emails_duration_check
  CHECK (duration IN ('1m', '3m', 'lifetime'));