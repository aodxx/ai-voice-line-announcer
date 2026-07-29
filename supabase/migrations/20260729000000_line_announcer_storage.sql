create table if not exists public.line_webhook_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists line_webhook_logs_timestamp_idx
  on public.line_webhook_logs (timestamp desc);

alter table public.line_webhook_logs enable row level security;
revoke all on table public.line_webhook_logs from anon, authenticated;

create table if not exists public.line_webhook_events (
  webhook_event_id text primary key,
  received_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists line_webhook_events_expires_at_idx
  on public.line_webhook_events (expires_at);

alter table public.line_webhook_events enable row level security;
revoke all on table public.line_webhook_events from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('line-audio', 'line-audio', true, 52428800, array['audio/mp4'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- The backend uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS. No public
-- INSERT/UPDATE/DELETE policies are created. Public bucket access is read-only.
