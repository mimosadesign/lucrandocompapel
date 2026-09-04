CREATE TABLE public.payment_settings (
  id text PRIMARY KEY DEFAULT 'default',
  provider text NOT NULL DEFAULT 'whatsapp',
  mercadopago_access_token text,
  mercadopago_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT ALL ON public.payment_settings TO service_role;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages payment settings"
  ON public.payment_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.payment_settings (id) VALUES ('default');

CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  plan text NOT NULL,
  amount numeric NOT NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_ref text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_orders TO service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages payment orders"
  ON public.payment_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX payment_orders_provider_ref_idx ON public.payment_orders (provider_ref);