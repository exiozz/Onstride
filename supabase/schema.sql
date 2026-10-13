-- On Stride : base de données Supabase.
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis « Run ».
-- Peut être relancé sans risque : il ne supprime aucune donnée.
--
-- Qui voit quoi :
--   * chaque personne a son propre espace (espaces, projets, Bazar, clients, montants, devis et factures, réglages) ;
--   * les messages (Mail) ne sont visibles que par la personne qui écrit et celle qui reçoit ;
--     tout le monde peut les lire, écrire est réservé aux formules Premium et Pro ;
--   * un projet peut être partagé à une adresse e-mail en « editor » (éditeur) ou « viewer » (lecteur) ;
--   * les clients, les montants et les notes privées ne sont jamais visibles par les invités.

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,  -- vide = tâche du Bazar
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_owner_idx on public.tasks(owner);
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- infos privées d'un projet : client, montant, encaissé, notes privées
create table if not exists public.meta (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- partage d'un projet avec une adresse e-mail
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role text not null check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, email)
);
create index if not exists members_email_idx on public.members(email);

-- ---------- fonctions d'accès ----------
create or replace function public.my_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- rôle de la personne connectée sur un projet : 'owner', 'editor', 'viewer' ou rien (complété plus bas par 'manager')
create or replace function public.project_role(pid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.projects p where p.id = pid and p.owner = auth.uid()) then 'owner'
    else (select m.role from public.members m
          where m.project_id = pid and m.email = public.my_email() and public.my_email() <> '' limit 1)
  end
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end
$$;
do $$
declare t text;
begin
  foreach t in array array['spaces','projects','tasks','clients','meta','settings'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- formules (Gratuit, Premium, Pro) ----------
-- admins : peuvent donner ou retirer une formule. Personne d'autre ne peut lire cette table.
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
insert into public.admins (email) values ('tomokari.perso@gmail.com') on conflict do nothing;
-- une ligne par personne ayant Premium ou Pro (sans ligne, ou date passée : formule Gratuite)
create table if not exists public.premium (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  plan text not null check (plan in ('premium','pro')),
  period text not null default 'month' check (period in ('month','year','gift')),
  until timestamptz,                     -- vide = sans fin
  granted_by text,
  updated_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_email() <> '' and exists (select 1 from public.admins a where a.email = public.my_email())
$$;
create or replace function public.my_plan() returns text
language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then 'pro'
    else coalesce((select p.plan from public.premium p
                   where p.email = public.my_email() and public.my_email() <> '' and (p.until is null or p.until > now())), 'free') end
$$;
-- projets actifs permis par la formule : Gratuit 3, Premium 15, Pro sans limite
create or replace function public.my_project_quota() returns int
language sql stable security definer set search_path = public as $$
  select case public.my_plan() when 'pro' then 1000000 when 'premium' then 15 else 3 end
$$;
create or replace function public.my_active_projects() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.projects
  where owner = auth.uid() and coalesce(data->>'status', 'active') <> 'archived'
$$;

-- ---------- chef de projet ----------
-- Un admin du site invité sur un projet (en lecteur ou en éditeur) y agit en chef de projet :
-- il modifie le contenu et gère les invités, comme le propriétaire. Il ne voit toujours pas
-- les infos privées (client, montants, notes privées) et ne peut pas supprimer le projet.
create or replace function public.project_role(pid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.projects p where p.id = pid and p.owner = auth.uid()) then 'owner'
    else (select case when public.is_admin() then 'manager' else m.role end from public.members m
          where m.project_id = pid and m.email = public.my_email() and public.my_email() <> '' limit 1)
  end
$$;

-- ---------- droits ----------
alter table public.spaces   enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.clients  enable row level security;
alter table public.meta     enable row level security;
alter table public.settings enable row level security;
alter table public.members  enable row level security;
alter table public.admins   enable row level security;
alter table public.premium  enable row level security;

-- personne n'accède à rien sans être connecté
revoke all on public.spaces, public.projects, public.tasks, public.clients, public.meta, public.settings, public.members from anon;
grant select, insert, delete on public.spaces, public.projects, public.tasks, public.clients, public.meta, public.settings, public.members to authenticated;
-- un éditeur invité ne peut modifier que le contenu, jamais le propriétaire d'une ligne
revoke update on public.spaces, public.projects, public.tasks, public.clients, public.meta, public.settings, public.members from authenticated;
grant update (data) on public.spaces, public.projects, public.clients, public.meta, public.settings to authenticated;
grant update (data, project_id) on public.tasks to authenticated;
grant update (role) on public.members to authenticated;
grant execute on function public.my_email(), public.project_role(uuid), public.is_admin(), public.my_plan(), public.my_active_projects(), public.my_project_quota() to authenticated;
revoke all on public.admins, public.premium from anon;
revoke all on public.admins from authenticated;
grant select, insert, update, delete on public.premium to authenticated;

-- espaces, clients, réglages, infos privées : uniquement leur propriétaire
drop policy if exists own_all on public.spaces;
create policy own_all on public.spaces for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists own_all on public.clients;
create policy own_all on public.clients for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists own_all on public.settings;
create policy own_all on public.settings for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists own_all on public.meta;
create policy own_all on public.meta for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid() and public.project_role(project_id) = 'owner');

-- projets : lus par le propriétaire et les invités, modifiés par le propriétaire et les éditeurs
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated
  using (owner = auth.uid() or public.project_role(id) is not null);
drop policy if exists projects_insert on public.projects;
-- nombre de projets actifs selon la formule : voir my_project_quota
create policy projects_insert on public.projects for insert to authenticated
  with check (owner = auth.uid() and public.my_active_projects() < public.my_project_quota());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (public.project_role(id) in ('owner','manager','editor'))
  with check (public.project_role(id) in ('owner','manager','editor'));
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
  using (owner = auth.uid());

-- tâches : celles du Bazar sont à leur auteur ; celles d'un projet suivent le rôle sur le projet
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
  using ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) is not null));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (owner = auth.uid()
      and (project_id is null or public.project_role(project_id) in ('owner','manager','editor')));
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) in ('owner','manager','editor')))
  with check ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) in ('owner','manager','editor')));
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) in ('owner','manager','editor')));

-- partages : gérés par le propriétaire du projet (ou le chef de projet) ; chacun voit les siens
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (public.project_role(project_id) in ('owner','manager') or email = public.my_email());
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
  with check (public.project_role(project_id) in ('owner','manager'));
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
  using (public.project_role(project_id) in ('owner','manager'))
  with check (public.project_role(project_id) in ('owner','manager'));
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated
  using (public.project_role(project_id) in ('owner','manager'));

-- ---------- photos des tâches ----------
-- rôle de la personne connectée sur une tâche : 'owner', 'editor', 'viewer' ou rien
create or replace function public.task_role(tid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when t.project_id is null then case when t.owner = auth.uid() then 'owner' end
    else public.project_role(t.project_id)
  end
  from public.tasks t where t.id = tid
$$;
-- une photo est rangée dans « <identifiant de la tâche>/<nom du fichier> »
create or replace function public.photo_task(name text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(name, '/', 1)::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.task_role(uuid), public.photo_task(text) to authenticated;

-- espaces de stockage privés : photos (5 Mo par image) et fichiers joints (50 Mo au plus, selon la formule)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fichiers', 'fichiers', false, 52428800, null)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- même règle pour les photos et les fichiers : on voit ceux des tâches qu'on a le droit de voir (et celles qu'on a envoyées soi-même) ;
-- on en ajoute là où on a le droit de modifier
drop policy if exists avancee_photos_read on storage.objects;
create policy avancee_photos_read on storage.objects for select to authenticated
  using (bucket_id in ('photos','fichiers')
     and (owner_id = auth.uid()::text or public.task_role(public.photo_task(name)) is not null));
drop policy if exists avancee_photos_insert on storage.objects;
create policy avancee_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('photos','fichiers') and public.task_role(public.photo_task(name)) in ('owner','manager','editor'));
drop policy if exists avancee_photos_delete on storage.objects;
create policy avancee_photos_delete on storage.objects for delete to authenticated
  using (bucket_id in ('photos','fichiers')
     and (owner_id = auth.uid()::text or public.task_role(public.photo_task(name)) in ('owner','manager','editor')));

-- formules : chacun voit la sienne ; seuls les admins voient et modifient tout
drop policy if exists premium_read on public.premium;
create policy premium_read on public.premium for select to authenticated
  using (email = public.my_email() or public.is_admin());
drop policy if exists premium_admin on public.premium;
create policy premium_admin on public.premium for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- messagerie interne (Mail) ----------
-- On écrit à une adresse e-mail ; la personne lit le message en se connectant avec cette adresse.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread uuid not null,                                   -- conversation : identifiant de son premier message
  from_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_email text not null check (from_email = lower(from_email)),
  from_name text not null default '' check (char_length(from_name) <= 80),
  to_email text not null check (to_email = lower(to_email) and position('@' in to_email) > 1),
  subject text not null default '' check (char_length(subject) <= 200),
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  read_at timestamptz,                                    -- lu par le destinataire
  del_from boolean not null default false,                -- supprimé chez l'expéditeur
  del_to boolean not null default false                   -- supprimé chez le destinataire
);
create index if not exists messages_to_idx on public.messages(to_email, created_at desc);
create index if not exists messages_from_idx on public.messages(from_id, created_at desc);
create index if not exists messages_thread_idx on public.messages(thread);

-- nombre de messages envoyés par la personne connectée depuis une heure
create or replace function public.my_recent_messages() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.messages where from_id = auth.uid() and created_at > now() - interval '1 hour'
$$;
-- messages par heure selon la formule : Gratuit 0 (lecture seule), Premium 15, Pro 150
create or replace function public.my_mail_quota() returns int
language sql stable security definer set search_path = public as $$
  select case public.my_plan() when 'pro' then 150 when 'premium' then 15 else 0 end
$$;
-- chacun ne modifie que ce qui le concerne : le destinataire « lu » et sa corbeille, l'expéditeur sa corbeille
create or replace function public.messages_guard() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then
    if auth.uid() is distinct from old.from_id then new.del_from := old.del_from; end if;
    if public.my_email() is distinct from old.to_email then new.read_at := old.read_at; new.del_to := old.del_to; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard on public.messages;
create trigger guard before update on public.messages for each row execute function public.messages_guard();

alter table public.messages enable row level security;
revoke all on public.messages from anon;
revoke all on public.messages from authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at, del_from, del_to) on public.messages to authenticated;
grant execute on function public.my_recent_messages(), public.my_mail_quota() to authenticated;

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (from_id = auth.uid() or (public.my_email() <> '' and to_email = public.my_email()));
drop policy if exists messages_insert on public.messages;
-- on n'écrit qu'en son propre nom, pas à soi-même, et dans la limite de sa formule
create policy messages_insert on public.messages for insert to authenticated
  with check (from_id = auth.uid() and from_email = public.my_email() and to_email <> public.my_email()
      and read_at is null and not del_from and not del_to
      and public.my_recent_messages() < public.my_mail_quota());
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (from_id = auth.uid() or (public.my_email() <> '' and to_email = public.my_email()))
  with check (from_id = auth.uid() or (public.my_email() <> '' and to_email = public.my_email()));

-- ---------- devis et factures ----------
-- Visibles et modifiables uniquement par leur propriétaire, comme les clients et les montants.
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists quotes_owner_idx on public.quotes(owner);
drop trigger if exists touch on public.quotes;
create trigger touch before update on public.quotes for each row execute function public.touch_updated_at();
alter table public.quotes enable row level security;
revoke all on public.quotes from anon;
grant select, insert, delete on public.quotes to authenticated;
revoke update on public.quotes from authenticated;
grant update (data) on public.quotes to authenticated;
drop policy if exists own_all on public.quotes;
create policy own_all on public.quotes for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- mises à jour en direct (ignoré si déjà activé)
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['spaces','projects','tasks','clients','meta','settings','members','messages','quotes'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;
