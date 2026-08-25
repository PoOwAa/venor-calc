-- Supabase schema for Boss Box OCR review workflow
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.box_opening_review_queue (
  id uuid primary key default gen_random_uuid(),
  box_item_id bigint not null,
  opened_box_count integer,
  screenshot_object_path text not null,
  screenshot_source_filename text,
  raw_ocr_text text not null,
  unresolved_count integer not null default 0,
  submitted_entries jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid,
  reviewer_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.box_opening_approved (
  id uuid primary key default gen_random_uuid(),
  review_queue_id uuid unique not null references public.box_opening_review_queue(id) on delete cascade,
  box_item_id bigint not null,
  opened_box_count integer,
  screenshot_object_path text not null,
  screenshot_source_filename text,
  raw_ocr_text text not null,
  approved_entries jsonb not null,
  approved_by uuid,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.approve_box_opening_submission(
  p_review_queue_id uuid,
  p_reviewer_note text default null
)
returns public.box_opening_approved
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.box_opening_review_queue;
  v_approved public.box_opening_approved;
begin
  select *
  into v_review
  from public.box_opening_review_queue
  where id = p_review_queue_id
  for update;

  if not found then
    raise exception 'Review queue row not found: %', p_review_queue_id;
  end if;

  if v_review.status <> 'pending' then
    raise exception 'Review queue row is already processed: %', p_review_queue_id;
  end if;

  insert into public.box_opening_approved (
    review_queue_id,
    box_item_id,
    opened_box_count,
    screenshot_object_path,
    screenshot_source_filename,
    raw_ocr_text,
    approved_entries,
    approved_by
  )
  values (
    v_review.id,
    v_review.box_item_id,
    v_review.opened_box_count,
    v_review.screenshot_object_path,
    v_review.screenshot_source_filename,
    v_review.raw_ocr_text,
    v_review.submitted_entries,
    auth.uid()
  )
  returning * into v_approved;

  update public.box_opening_review_queue
  set
    status = 'approved',
    reviewer_note = p_reviewer_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = v_review.id;

  return v_approved;
end;
$$;

create or replace function public.reject_box_opening_submission(
  p_review_queue_id uuid,
  p_reviewer_note text default null
)
returns public.box_opening_review_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.box_opening_review_queue;
begin
  select *
  into v_review
  from public.box_opening_review_queue
  where id = p_review_queue_id
  for update;

  if not found then
    raise exception 'Review queue row not found: %', p_review_queue_id;
  end if;

  if v_review.status <> 'pending' then
    raise exception 'Review queue row is already processed: %', p_review_queue_id;
  end if;

  update public.box_opening_review_queue
  set
    status = 'rejected',
    reviewer_note = p_reviewer_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = v_review.id
  returning * into v_review;

  return v_review;
end;
$$;

grant execute on function public.approve_box_opening_submission(uuid, text) to anon, authenticated;
grant execute on function public.reject_box_opening_submission(uuid, text) to anon, authenticated;

alter table public.box_opening_review_queue enable row level security;
alter table public.box_opening_approved enable row level security;

-- Submission policy for app users. Tighten as needed (for example authenticated only).
drop policy if exists "Allow insert into review queue" on public.box_opening_review_queue;
create policy "Allow insert into review queue"
on public.box_opening_review_queue
for insert
to anon, authenticated
with check (true);

-- Reviewer read policy.
drop policy if exists "Allow reviewers to read review queue" on public.box_opening_review_queue;
create policy "Allow reviewers to read review queue"
on public.box_opening_review_queue
for select
to anon, authenticated
using (true);

-- Reviewer update policy.
drop policy if exists "Allow reviewers to update review queue" on public.box_opening_review_queue;
create policy "Allow reviewers to update review queue"
on public.box_opening_review_queue
for update
to anon, authenticated
using (true)
with check (true);

-- Approved dataset read policy.
drop policy if exists "Allow approved data read" on public.box_opening_approved;
create policy "Allow approved data read"
on public.box_opening_approved
for select
to anon, authenticated
using (true);

-- Storage bucket for screenshots.
insert into storage.buckets (id, name, public)
values ('box-opening-screenshots', 'box-opening-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "Allow upload screenshots" on storage.objects;
create policy "Allow upload screenshots"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'box-opening-screenshots');

drop policy if exists "Allow reviewer read screenshots" on storage.objects;
create policy "Allow reviewer read screenshots"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'box-opening-screenshots');

-- Shared market price overrides for the crafting optimizer.
create table if not exists public.shared_market_prices (
  id text primary key,
  price_overrides jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.shared_market_prices enable row level security;

drop policy if exists "Allow shared market prices read" on public.shared_market_prices;
create policy "Allow shared market prices read"
on public.shared_market_prices
for select
to authenticated
using (id = 'shared');

drop policy if exists "Allow shared market prices insert" on public.shared_market_prices;
create policy "Allow shared market prices insert"
on public.shared_market_prices
for insert
to authenticated
with check (id = 'shared');

drop policy if exists "Allow shared market prices update" on public.shared_market_prices;
create policy "Allow shared market prices update"
on public.shared_market_prices
for update
to authenticated
using (id = 'shared')
with check (id = 'shared');
