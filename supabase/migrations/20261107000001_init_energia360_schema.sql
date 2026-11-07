-- ============================================================================
-- ENERGIA360 — Esquema Inicial PostgreSQL / Supabase (Arquitectura Zero-Access)
-- ============================================================================
-- Principio:
-- 1. Las facturas privadas, números de contrato (NIC/NIS) y consumos individuales
--    se procesan localmente y se cifran en el cliente con AES-256-GCM (Web Crypto API).
-- 2. Supabase almacena:
--    a) Perfiles básicos y plan de suscripción (sin datos sensibles de facturación).
--    b) Pliegos tarifarios públicos oficiales (SIE República Dominicana: EDESUR, EDENORTE, EDEESTE, CEPM).
--    c) Catálogo público de electrodomésticos habituales en República Dominicana.
--    d) Catálogo público de inversores, baterías y parámetros solares (HSP por provincia).
--    e) Respaldos cifrados de extremo a extremo (E2EE Ciphertext Blobs) donde el servidor
--       JAMÁS posee la clave maestra ni puede descifrar el contenido.
--    f) Métricas agregadas anónimas (opt-in voluntario) para el panel administrativo.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Función utilitaria para verificar rol administrativo desde app_metadata (seguro en JWT)
-- Nunca se utiliza user_metadata para decisiones de autorización.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Función utilitaria para actualizar updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. PERFILES DE USUARIO Y PLAN COMERCIAL (Sin información energética privada)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  property_type text not null default 'hogar'
    check (property_type in ('hogar', 'apartamento', 'pequeno_negocio', 'empresa', 'instalacion_solar')),
  preferred_distributor text not null default 'EDESUR'
    check (preferred_distributor in ('EDESUR', 'EDENORTE', 'EDEESTE', 'CEPM')),
  province text not null default 'Santo Domingo',
  subscription_plan text not null default 'gratuito'
    check (subscription_plan in ('gratuito', 'hogar', 'negocios', 'empresarial')),
  telemetry_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_subscription_plan on public.profiles(subscription_plan);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using ( (select auth.uid()) = id );

-- ============================================================================
-- 2. PLIEGOS TARIFARIOS PÚBLICOS (Superintendencia de Electricidad - SIE RD)
-- ============================================================================
create table if not exists public.tariff_schedules (
  id uuid primary key default gen_random_uuid(),
  distributor_code text not null
    check (distributor_code in ('EDESUR', 'EDENORTE', 'EDEESTE', 'CEPM')),
  tariff_code text not null, -- Ej. BTS-1, BTS-2, Prepago CEPM
  category_name text not null, -- Ej. Residencial Baja Tensión Simple
  customer_segment text not null
    check (customer_segment in ('residencial', 'comercial', 'industrial', 'solar_net_metering')),
  currency text not null default 'DOP',
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  is_official_sie boolean not null default true,
  source_reference text not null,
  billing_mode text not null default 'tiered_with_threshold_reset'
    check (billing_mode in ('tiered_with_threshold_reset', 'tiered_progressive', 'flat')),
  full_reset_threshold_kwh numeric(10,2) default 701.00,
  full_reset_rate_dop numeric(10,4),
  fixed_charges jsonb not null default '[]'::jsonb,
  energy_blocks jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tariff_schedules_distributor_active
  on public.tariff_schedules(distributor_code, is_active);

drop trigger if exists trg_tariff_schedules_updated_at on public.tariff_schedules;
create trigger trg_tariff_schedules_updated_at
  before update on public.tariff_schedules
  for each row execute function public.set_updated_at();

alter table public.tariff_schedules enable row level security;

create policy "tariff_schedules_read_public"
  on public.tariff_schedules for select
  to anon, authenticated
  using ( true );

create policy "tariff_schedules_admin_write"
  on public.tariff_schedules for all
  to authenticated
  using ( public.is_platform_admin() )
  with check ( public.is_platform_admin() );

-- ============================================================================
-- 3. CATÁLOGO PÚBLICO DE ELECTRODOMÉSTICOS Y EQUIPOS (República Dominicana)
-- ============================================================================
create table if not exists public.appliance_catalog (
  id text primary key,
  name text not null,
  category text not null,
  typical_brand text,
  typical_model text,
  nominal_watts integer not null check (nominal_watts > 0),
  duty_cycle_factor numeric(4,2) not null default 1.00 check (duty_cycle_factor > 0 and duty_cycle_factor <= 1.00),
  default_daily_hours numeric(4,1) not null default 4.0,
  default_monthly_days integer not null default 30,
  efficiency_rating text not null default 'Estándar',
  is_inverter boolean not null default false,
  rd_context_note text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_appliance_catalog_category on public.appliance_catalog(category);

alter table public.appliance_catalog enable row level security;

create policy "appliance_catalog_read_public"
  on public.appliance_catalog for select
  to anon, authenticated
  using ( true );

create policy "appliance_catalog_admin_write"
  on public.appliance_catalog for all
  to authenticated
  using ( public.is_platform_admin() )
  with check ( public.is_platform_admin() );

-- ============================================================================
-- 4. CATÁLOGO PÚBLICO DE INVERSORES, BATERÍAS Y PARÁMETROS SOLARES
-- ============================================================================
create table if not exists public.inverter_battery_catalog (
  id text primary key,
  component_type text not null check (component_type in ('inversor', 'bateria', 'panel_solar')),
  brand text not null,
  model text not null,
  rated_power_w integer,
  capacity_wh integer,
  battery_chemistry text check (battery_chemistry in ('lead_acid_flooded', 'agm_gel', 'lifepo4', null)),
  recommended_dod numeric(4,2) check (recommended_dod > 0 and recommended_dod <= 1.00),
  roundtrip_efficiency numeric(4,2) not null default 0.85,
  nominal_voltage_v integer,
  rd_market_note text,
  created_at timestamptz not null default now()
);

alter table public.inverter_battery_catalog enable row level security;

create policy "inverter_battery_catalog_read_public"
  on public.inverter_battery_catalog for select
  to anon, authenticated
  using ( true );

create policy "inverter_battery_catalog_admin_write"
  on public.inverter_battery_catalog for all
  to authenticated
  using ( public.is_platform_admin() )
  with check ( public.is_platform_admin() );

-- ============================================================================
-- 5. BÓVEDA DE RESPALDO CIFRADO E2EE (Zero-Access / Zero-Knowledge Backup)
-- ============================================================================
-- IMPORTANTE: Esta tabla NUNCA almacena datos en texto plano ni claves privadas.
-- Solo almacena el bloque AES-256-GCM cifrado en el navegador del usuario.
create table if not exists public.encrypted_vault_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_version integer not null default 1,
  kdf_algorithm text not null default 'PBKDF2-SHA256',
  kdf_iterations integer not null default 310000 check (kdf_iterations >= 100000),
  salt_base64 text not null,
  iv_base64 text not null,
  ciphertext_base64 text not null,
  payload_byte_size integer not null check (payload_byte_size > 0),
  ciphertext_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_encrypted_vault_backups_user_id
  on public.encrypted_vault_backups(user_id);

drop trigger if exists trg_encrypted_vault_backups_updated_at on public.encrypted_vault_backups;
create trigger trg_encrypted_vault_backups_updated_at
  before update on public.encrypted_vault_backups
  for each row execute function public.set_updated_at();

alter table public.encrypted_vault_backups enable row level security;

-- El usuario solo puede leer, insertar, actualizar o eliminar su propio blob cifrado.
-- El administrador NO tiene política SELECT sobre esta tabla.
create policy "vault_backups_select_own"
  on public.encrypted_vault_backups for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "vault_backups_insert_own"
  on public.encrypted_vault_backups for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "vault_backups_update_own"
  on public.encrypted_vault_backups for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "vault_backups_delete_own"
  on public.encrypted_vault_backups for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ============================================================================
-- 6. MÉTRICAS ADMINISTRATIVAS AGREGADAS Y VOLUNTARIAS (Sin PII ni consumos individuales)
-- ============================================================================
create table if not exists public.platform_anonymous_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null default current_date,
  distributor_code text not null check (distributor_code in ('EDESUR', 'EDENORTE', 'EDEESTE', 'CEPM')),
  property_type text not null check (property_type in ('hogar', 'apartamento', 'pequeno_negocio', 'empresa', 'instalacion_solar')),
  registered_installations_count integer not null default 1 check (registered_installations_count >= 0),
  solar_simulations_count integer not null default 0 check (solar_simulations_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_anonymous_metrics_date
  on public.platform_anonymous_metrics(metric_date, distributor_code);

alter table public.platform_anonymous_metrics enable row level security;

create policy "anonymous_metrics_read_public"
  on public.platform_anonymous_metrics for select
  to anon, authenticated
  using ( true );

create policy "anonymous_metrics_insert_opt_in"
  on public.platform_anonymous_metrics for insert
  to anon, authenticated
  with check ( registered_installations_count <= 1 and solar_simulations_count <= 1 );

-- Permisos explícitos para el Data API de Supabase
grant usage on schema public to anon, authenticated;
grant select on public.tariff_schedules, public.appliance_catalog, public.inverter_battery_catalog, public.platform_anonymous_metrics to anon, authenticated;
grant insert on public.platform_anonymous_metrics to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.encrypted_vault_backups to authenticated;

