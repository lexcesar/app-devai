-- ============================================================
-- Obra Fácil — Docker-compatible Database Schema
-- Stripped of Supabase-specific auth.jwt() RLS policies.
-- Backend connects as table owner and bypasses RLS automatically.
-- ============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('client', 'professional', 'store');
create type message_type as enum ('text', 'image', 'audio', 'material_list');
create type material_list_status as enum ('draft', 'sent', 'quoted');
create type order_status as enum ('pending', 'confirmed', 'shipped', 'delivered');
create type work_status as enum ('scheduled', 'active', 'completed', 'cancelled');

-- ============================================================
-- TABLES
-- ============================================================

create table profiles (
  id          uuid primary key default uuid_generate_v4(),
  clerk_id    text unique not null,
  full_name   text not null,
  avatar_url  text,
  phone       text,
  role        user_role not null default 'client',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table professionals (
  id             uuid primary key default uuid_generate_v4(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  specialty      text not null,
  bio            text,
  rating_avg     numeric(3,2) not null default 0,
  jobs_completed integer not null default 0,
  is_verified    boolean not null default false,
  latitude       numeric(10,7),
  longitude      numeric(10,7),
  created_at     timestamptz not null default now()
);

create table services (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  icon_name   text not null,
  description text,
  sort_order  integer not null default 0
);

create table reviews (
  id              uuid primary key default uuid_generate_v4(),
  work_id         uuid references works(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  reviewer_id     uuid not null references profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now(),
  unique (work_id, reviewer_id)
);

create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (client_id, professional_id)
);

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  content         text not null,
  type            message_type not null default 'text',
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create table material_lists (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  status          material_list_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table material_items (
  id               uuid primary key default uuid_generate_v4(),
  material_list_id uuid not null references material_lists(id) on delete cascade,
  name             text not null,
  quantity         numeric(10,2) not null,
  unit             text not null default 'un',
  brand            text,
  image_url        text,
  created_at       timestamptz not null default now()
);

create table stores (
  id            uuid primary key default uuid_generate_v4(),
  profile_id    uuid references profiles(id) on delete set null,
  name          text not null,
  address       text,
  lat           numeric(10,7),
  lng           numeric(10,7),
  delivery_time text,
  logo_url      text,
  created_at    timestamptz not null default now()
);

create table store_offers (
  id               uuid primary key default uuid_generate_v4(),
  store_id         uuid not null references stores(id) on delete cascade,
  material_list_id uuid not null references material_lists(id) on delete cascade,
  total_price      numeric(10,2) not null,
  delivery_info    text,
  is_best_price    boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (store_id, material_list_id)
);

create table orders (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references profiles(id) on delete cascade,
  store_id         uuid not null references stores(id) on delete restrict,
  material_list_id uuid references material_lists(id) on delete set null,
  status           order_status not null default 'pending',
  total_amount     numeric(10,2) not null,
  order_number     text unique not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table works (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete restrict,
  visit_id        uuid,
  title           text not null,
  status          work_status not null default 'scheduled',
  progress_pct    smallint not null default 0 check (progress_pct between 0 and 100),
  next_step       text,
  photos          text[] not null default '{}',
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- VISIT SCHEDULING
-- ============================================================

create type visit_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'rejected');

create table availability_slots (
  id              uuid primary key default uuid_generate_v4(),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),
  start_time      time not null,
  end_time        time not null,
  created_at      timestamptz not null default now(),
  unique (professional_id, weekday, start_time),
  check (end_time > start_time)
);

create table visits (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references profiles(id) on delete cascade,
  professional_id  uuid not null references professionals(id) on delete cascade,
  scheduled_at     timestamptz not null,
  status           visit_status not null default 'pending',
  address          text,
  notes            text,
  rejection_reason text,
  cancelled_by     uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- retroactively add the FK and unique index for works.visit_id now that visits exists
alter table works
  add constraint works_visit_id_fkey foreign key (visit_id)
    references visits(id) on delete set null;

create unique index if not exists works_visit_id_unique
  on works (visit_id) where visit_id is not null;
create index if not exists idx_works_visit_id on works (visit_id);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_professionals_rating on professionals(rating_avg desc);
create index idx_professionals_location on professionals(latitude, longitude);
create index idx_reviews_professional_id on reviews(professional_id);
create index idx_reviews_work_id on reviews(work_id);
create index idx_messages_conversation_id on messages(conversation_id, created_at);
create index idx_conversations_client_id on conversations(client_id);
create index idx_conversations_professional_id on conversations(professional_id);
create index idx_orders_client_id on orders(client_id);
create index idx_works_client_id on works(client_id);
create index idx_works_status on works(status);
create index idx_professionals_specialty_trgm on professionals using gin (specialty gin_trgm_ops);
create unique index idx_visits_no_double_booking on visits (professional_id, scheduled_at) where status not in ('cancelled', 'rejected');
create index idx_visits_client on visits(client_id);
create index idx_visits_professional on visits(professional_id);
create index idx_visits_scheduled on visits(scheduled_at);
create index idx_availability_professional on availability_slots(professional_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();

create trigger works_updated_at before update on works
  for each row execute function update_updated_at();

create trigger visits_updated_at before update on visits
  for each row execute function update_updated_at();

create trigger material_lists_updated_at before update on material_lists
  for each row execute function update_updated_at();

create or replace function update_professional_rating()
returns trigger language plpgsql as $$
begin
  update professionals
  set
    rating_avg = (
      select round(avg(rating)::numeric, 2)
      from reviews
      where professional_id = new.professional_id
    ),
    jobs_completed = (
      select count(*)
      from reviews
      where professional_id = new.professional_id
    )
  where id = new.professional_id;
  return new;
end;
$$;

create trigger reviews_update_professional after insert on reviews
  for each row execute function update_professional_rating();
