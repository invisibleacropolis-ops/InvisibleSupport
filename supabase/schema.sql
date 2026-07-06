-- Invisible Support Supabase setup.
-- Run this in the Supabase SQL editor for the target project.

insert into storage.buckets (id, name, public)
values ('invisible-support-assets', 'invisible-support-assets', false)
on conflict (id) do update set public = false;

create table if not exists public.assets (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('document', 'image')),
  name text not null,
  title text not null default '',
  description text not null default '',
  alt text not null default '',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text not null,
  width integer,
  height integer,
  captured_at timestamptz,
  exif jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_owner_kind_updated_idx
  on public.assets (owner_id, kind, updated_at desc);

alter table public.assets enable row level security;

drop policy if exists "assets_select_own" on public.assets;
drop policy if exists "assets_insert_own" on public.assets;
drop policy if exists "assets_update_own" on public.assets;
drop policy if exists "assets_delete_own" on public.assets;

create policy "assets_select_own"
on public.assets for select
to authenticated
using (owner_id = auth.uid());

create policy "assets_insert_own"
on public.assets for insert
to authenticated
with check (owner_id = auth.uid());

create policy "assets_update_own"
on public.assets for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "assets_delete_own"
on public.assets for delete
to authenticated
using (owner_id = auth.uid());

-- Supabase manages RLS on storage.objects. Do not attempt to alter that
-- managed table directly; recent projects reject it with "must be owner".

drop policy if exists "invisible_support_objects_select_own" on storage.objects;
drop policy if exists "invisible_support_objects_insert_own" on storage.objects;
drop policy if exists "invisible_support_objects_update_own" on storage.objects;
drop policy if exists "invisible_support_objects_delete_own" on storage.objects;

create policy "invisible_support_objects_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'invisible-support-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "invisible_support_objects_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'invisible-support-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "invisible_support_objects_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'invisible-support-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'invisible-support-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "invisible_support_objects_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'invisible-support-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
