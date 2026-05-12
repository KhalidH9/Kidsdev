-- ============================================================================
-- ABA School Behavior Support System — initial schema
-- Normalized, school-scoped, with RBAC via RLS and an audit trail.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'specialist', 'teacher', 'parent');
create type user_status as enum ('active', 'inactive');
create type note_visibility as enum ('staff', 'parent');
create type assignment_type as enum ('specialist', 'teacher', 'parent');
create type task_status as enum ('pending', 'in_progress', 'done', 'cancelled');
create type kid_mode_status as enum ('open', 'closed');

-- ---------------------------------------------------------------------------
-- Schools
-- ---------------------------------------------------------------------------
create table schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (staff users: admin/specialist/teacher) — 1:1 with auth.users
-- Parents are NOT staff and live in their own table (no auth required).
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  school_id    uuid not null references schools(id) on delete restrict,
  name         text not null,
  email        text not null unique,
  phone        text not null check (phone ~ '^[0-9]{10}$'),
  role         user_role not null,
  status       user_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_staff_role check (role in ('admin', 'specialist', 'teacher'))
);
create index profiles_school_idx on profiles(school_id);
create index profiles_role_idx on profiles(role);

-- ---------------------------------------------------------------------------
-- Parents
-- ---------------------------------------------------------------------------
create table parents (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete restrict,
  -- Optional Supabase auth user id if/when a parent receives a login.
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name         text not null,
  email        text not null,
  phone        text not null check (phone ~ '^[0-9]{10}$'),
  status       user_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (school_id, email)
);
create index parents_school_idx on parents(school_id);
create index parents_auth_idx on parents(auth_user_id);

-- ---------------------------------------------------------------------------
-- Children
-- ---------------------------------------------------------------------------
create table children (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete restrict,
  name          text not null,
  date_of_birth date not null,
  notes         text,
  status        user_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index children_school_idx on children(school_id);

-- ---------------------------------------------------------------------------
-- Child assignments — normalized many-to-many for specialists/teachers/parents
-- A single table keeps RBAC checks simple and uniform.
-- ---------------------------------------------------------------------------
create table child_assignments (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  -- For specialist/teacher: references profiles.id (= auth.users.id)
  -- For parent:             references parents.id
  assignee_id  uuid not null,
  type         assignment_type not null,
  created_at   timestamptz not null default now(),
  unique (child_id, assignee_id, type)
);
create index child_assignments_child_idx on child_assignments(child_id);
create index child_assignments_assignee_idx on child_assignments(assignee_id, type);

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------
create table goals (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  title        text not null,
  description  text,
  target       text,
  status       user_status not null default 'active',
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index goals_child_idx on goals(child_id);

-- ---------------------------------------------------------------------------
-- Reinforcements
-- ---------------------------------------------------------------------------
create table reinforcements (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  title         text not null,
  description   text,
  schedule_type text not null check (schedule_type in ('continuous', 'variable_ratio')),
  vr_min        int,
  vr_max        int,
  status        user_status not null default 'active',
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (
    (schedule_type = 'continuous' and vr_min is null and vr_max is null)
    or (schedule_type = 'variable_ratio' and vr_min is not null and vr_max is not null and vr_min <= vr_max)
  )
);
create index reinforcements_child_idx on reinforcements(child_id);

-- ---------------------------------------------------------------------------
-- Behavior / activity logs
-- ---------------------------------------------------------------------------
create table behavior_logs (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  teacher_id    uuid not null references profiles(id) on delete restrict,
  occurred_at   timestamptz not null default now(),
  event_type    text not null,
  response      text,
  prompt_level  text,
  intensity     text,
  duration_sec  int,
  location      text,
  notes         text,
  created_at    timestamptz not null default now()
);
create index behavior_logs_child_idx on behavior_logs(child_id, occurred_at desc);
create index behavior_logs_teacher_idx on behavior_logs(teacher_id);

-- ---------------------------------------------------------------------------
-- Parent tasks
-- ---------------------------------------------------------------------------
create table parent_tasks (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  parent_id    uuid not null references parents(id) on delete cascade,
  title        text not null,
  description  text,
  due_at       timestamptz,
  task_status  task_status not null default 'pending',
  status       user_status not null default 'active',
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index parent_tasks_child_idx on parent_tasks(child_id);
create index parent_tasks_parent_idx on parent_tasks(parent_id);

-- ---------------------------------------------------------------------------
-- Notes / updates
-- ---------------------------------------------------------------------------
create table notes (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  title        text not null,
  body         text not null,
  visibility   note_visibility not null default 'staff',
  status       user_status not null default 'active',
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index notes_child_idx on notes(child_id, created_at desc);
create index notes_visibility_idx on notes(visibility);

-- ---------------------------------------------------------------------------
-- Kid Mode sessions
-- ---------------------------------------------------------------------------
create table kid_mode_sessions (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  opened_by    uuid not null references profiles(id) on delete restrict,
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz,
  status       kid_mode_status not null default 'open'
);
create index kid_mode_child_idx on kid_mode_sessions(child_id, status);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid references schools(id) on delete set null,
  actor_id     uuid references profiles(id) on delete set null,
  actor_name   text,
  action       text not null,        -- e.g. 'create', 'update', 'delete', 'activate'
  entity       text not null,        -- e.g. 'user', 'parent', 'child'
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_school_idx on audit_logs(school_id, created_at desc);
create index audit_logs_entity_idx on audit_logs(entity, entity_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'schools','profiles','parents','children','goals','reinforcements',
    'parent_tasks','notes'
  ]) loop
    execute format(
      'create trigger trg_%s_updated before update on %s for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ============================================================================
-- Row Level Security
-- The NestJS backend uses the service-role key so RLS does not block its
-- queries; school scoping and RBAC are enforced in the API layer. We still
-- enable RLS as defense-in-depth so direct (anon/authenticated) access from
-- the client is denied by default.
-- ============================================================================

alter table schools             enable row level security;
alter table profiles            enable row level security;
alter table parents             enable row level security;
alter table children            enable row level security;
alter table child_assignments   enable row level security;
alter table goals               enable row level security;
alter table reinforcements      enable row level security;
alter table behavior_logs       enable row level security;
alter table parent_tasks        enable row level security;
alter table notes               enable row level security;
alter table kid_mode_sessions   enable row level security;
alter table audit_logs          enable row level security;

-- Minimal helper: current auth user's school via profile
create or replace function current_school_id() returns uuid
language sql stable as $$
  select school_id from profiles where id = auth.uid()
$$;

-- A user can always read their own profile (used by client bootstrap).
create policy profiles_self_select on profiles
  for select using (id = auth.uid());

-- All other tables: deny all by default for non-service-role callers.
-- (No additional policies; the API uses the service role to bypass RLS.)
