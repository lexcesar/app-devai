-- ============================================================
-- Obra Fácil — Visit Scheduling Schema
-- per prd.md RFN-02: "Chat e Agendamento Integrado"
-- Agendamento de visitas técnicas entre clientes e profissionais
-- ============================================================

-- ENUM
create type visit_status as enum ('confirmed', 'completed', 'cancelled');

-- ============================================================
-- TABLES
-- ============================================================

-- availability_slots: horários disponíveis do profissional por dia da semana
create table availability_slots (
  id              uuid primary key default uuid_generate_v4(),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6), -- 0=domingo
  start_time      time not null,
  end_time        time not null,
  created_at      timestamptz not null default now(),
  unique (professional_id, weekday, start_time),
  check (end_time > start_time)
);

-- visits: visitas técnicas agendadas
create table visits (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  scheduled_at    timestamptz not null,
  status          visit_status not null default 'confirmed',
  address         text,
  notes           text,
  cancelled_by    uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Prevencao de double-booking: apenas uma visita ativa por profissional/horario
create unique index idx_visits_no_double_booking
  on visits (professional_id, scheduled_at)
  where status != 'cancelled';

create index idx_visits_client on visits(client_id);
create index idx_visits_professional on visits(professional_id);
create index idx_visits_scheduled on visits(scheduled_at);
create index idx_availability_professional on availability_slots(professional_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger visits_updated_at before update on visits
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table availability_slots enable row level security;
alter table visits enable row level security;

-- availability_slots: qualquer autenticado pode ler, apenas o profissional dono pode escrever
create policy "availability_slots_read_all" on availability_slots
  for select using (true);

create policy "availability_slots_manage_own" on availability_slots
  for all using (
    professional_id in (
      select id from professionals where profile_id = public.current_profile_id()
    )
  );

-- visits: apenas participantes (cliente ou profissional) podem ver e gerenciar
create policy "visits_select_participant" on visits
  for select using (
    client_id = public.current_profile_id()
    or professional_id in (
      select id from professionals where profile_id = public.current_profile_id()
    )
  );

create policy "visits_insert_client" on visits
  for insert with check (
    client_id = public.current_profile_id()
  );

create policy "visits_update_participant" on visits
  for update using (
    client_id = public.current_profile_id()
    or professional_id in (
      select id from professionals where profile_id = public.current_profile_id()
    )
  );
