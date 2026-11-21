-- Lima Norte Limpia: esquema de base de datos con seguridad a nivel de fila (RLS)
-- Ejecutar completo en Supabase > SQL Editor.

create extension if not exists "pgcrypto";

-- ===== Distritos =====
create table if not exists public.districts (
  id int primary key,
  name text not null unique
);
insert into public.districts (id, name) values
  (1, 'Los Olivos'), (2, 'Comas'), (3, 'San Martín de Porres'), (4, 'Independencia')
on conflict (id) do nothing;

-- ===== Perfiles (uno por usuario de auth) =====
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  district_id int not null references public.districts (id),
  role text not null default 'vecino' check (role in ('vecino', 'inspector', 'admin')),
  created_at timestamptz not null default now()
);

-- El rol SIEMPRE nace como 'vecino': nunca se toma de los metadatos que envía el cliente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, district_id, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Vecino'),
    coalesce((new.raw_user_meta_data ->> 'district_id')::int, 1),
    'vecino'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funciones auxiliares para las políticas (security definer evita recursión de RLS)
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_district_id()
returns int language sql stable security definer set search_path = public as $$
  select district_id from public.profiles where id = auth.uid()
$$;

-- ===== Mascotas (padrón) =====
create sequence if not exists public.pet_code_seq start 1;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('LNL-' || lpad(nextval('public.pet_code_seq')::text, 4, '0')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  species text not null check (species in ('perro', 'gato', 'otro')),
  breed text,
  sex text not null check (sex in ('macho', 'hembra')),
  vaccinated boolean not null default false,
  district_id int not null references public.districts (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== Reportes ciudadanos =====
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('heces', 'orina_fachada', 'mascota_suelta')),
  description text check (char_length(description) <= 500),
  lat double precision not null check (lat between -12.04 and -11.88),
  lng double precision not null check (lng between -77.13 and -77.00),
  district_id int not null references public.districts (id),
  photo_path text,
  status text not null default 'nuevo' check (status in ('nuevo', 'en_revision', 'atendido')),
  closing_comment text,
  handled_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_district_status_idx on public.reports (district_id, status);
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);

-- Límite de 5 reportes por usuario por hora (defensa contra spam, a nivel de base de datos)
create or replace function public.enforce_report_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'RATE_LIMIT: máximo 5 reportes por hora' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.enforce_report_rate_limit();

-- ===== Intervenciones del inspector =====
create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  inspector_id uuid not null references public.profiles (id),
  kind text not null check (kind in ('limpieza', 'notificacion_dueno', 'papeleta')),
  notes text check (char_length(notes) <= 500),
  pet_code text references public.pets (code),
  created_at timestamptz not null default now()
);

-- ===== Vista pública para el mapa de calor (sin datos personales) =====
create or replace view public.report_points as
  select id, lat, lng, type, district_id, status, created_at from public.reports;
grant select on public.report_points to anon, authenticated;

-- ===== RLS =====
alter table public.districts enable row level security;
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.reports enable row level security;
alter table public.interventions enable row level security;

-- districts: lectura pública
create policy "districts_read" on public.districts for select using (true);

-- profiles: cada usuario ve el suyo; el admin ve y modifica todos
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_select_admin" on public.profiles for select using (public.current_role_name() = 'admin');
create policy "profiles_update_admin" on public.profiles for update
  using (public.current_role_name() = 'admin') with check (public.current_role_name() = 'admin');

-- pets: el dueño gestiona las suyas; el inspector consulta las de su distrito; el admin todas
create policy "pets_owner_all" on public.pets for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "pets_inspector_select" on public.pets for select
  using (public.current_role_name() = 'inspector' and district_id = public.current_district_id());
create policy "pets_admin_select" on public.pets for select using (public.current_role_name() = 'admin');

-- reports: el vecino crea y ve los suyos; el inspector ve y actualiza los de su distrito; el admin todos
create policy "reports_insert_own" on public.reports for insert
  with check (reporter_id = auth.uid() and status = 'nuevo');
create policy "reports_select_own" on public.reports for select using (reporter_id = auth.uid());
create policy "reports_select_inspector" on public.reports for select
  using (public.current_role_name() = 'inspector' and district_id = public.current_district_id());
create policy "reports_select_admin" on public.reports for select using (public.current_role_name() = 'admin');
create policy "reports_update_inspector" on public.reports for update
  using (public.current_role_name() = 'inspector' and district_id = public.current_district_id())
  with check (public.current_role_name() = 'inspector' and district_id = public.current_district_id());
create policy "reports_update_admin" on public.reports for update
  using (public.current_role_name() = 'admin') with check (public.current_role_name() = 'admin');

-- interventions: inspector (de su distrito) y admin
create policy "interventions_inspector" on public.interventions for all
  using (
    public.current_role_name() = 'inspector'
    and exists (select 1 from public.reports r where r.id = report_id and r.district_id = public.current_district_id())
  )
  with check (
    inspector_id = auth.uid() and public.current_role_name() = 'inspector'
    and exists (select 1 from public.reports r where r.id = report_id and r.district_id = public.current_district_id())
  );
create policy "interventions_admin" on public.interventions for all
  using (public.current_role_name() = 'admin') with check (public.current_role_name() = 'admin');
create policy "interventions_reporter_select" on public.interventions for select
  using (exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = auth.uid()));

-- ===== Storage: fotos de reportes (bucket privado) =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "photos_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos_select_owner_or_staff" on storage.objects for select to authenticated
  using (
    bucket_id = 'report-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.current_role_name() in ('inspector', 'admin'))
  );

-- ===== Para crear el primer administrador (ejecutar una vez, con el correo real) =====
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
