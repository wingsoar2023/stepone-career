-- ==============================================================================
-- StepOne Career (steponecareer.com) - PostgreSQL Schema for Supabase
-- Paste and execute this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Profiles Table (Extends Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  target_position text,
  university_degree text,
  major text,
  grad_year text,
  core_skills text,
  internship_projects text,
  personal_summary text,
  tier text default 'free' check (tier in ('free', 'pro', 'lifetime')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Monthly Usage Tracking Table
create table if not exists public.usage_tracking (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  billing_month text not null, -- format: 'YYYY-MM', e.g. '2026-08'
  jd_analyses_count int default 0,
  star_cards_count int default 0,
  speech_pitch_count int default 0,
  networking_msg_count int default 0,
  mentor_questions_count int default 0,
  headshot_count int default 0,
  pdf_export_count int default 0,
  unique (user_id, billing_month)
);

alter table public.usage_tracking add column if not exists pdf_export_count int default 0;

-- 3. Application Tracker Table
create table if not exists public.applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company text not null,
  role text not null,
  date text not null,
  status text default 'applied' check (status in ('applied', 'interview', 'offer', 'rejected')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Stripe Subscriptions Table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type text check (plan_type in ('monthly_pro', 'lifetime')),
  status text check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.usage_tracking enable row level security;
alter table public.applications enable row level security;
alter table public.subscriptions enable row level security;

-- RLS Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id and coalesce(tier, 'free') = 'free');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and tier is not distinct from (select p.tier from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile" on public.profiles for delete using (auth.uid() = id);

-- Enforce column-level immutability on profiles.tier for non-service_role callers (JEV Gatekeeper Trigger)
create or replace function public.enforce_profile_tier_gatekeeper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), ''),
    current_user
  );
begin
  if tg_op = 'INSERT' then
    if v_role in ('authenticated', 'anon') and coalesce(new.tier, 'free') <> 'free' then
      new.tier := 'free';
    end if;
  elsif tg_op = 'UPDATE' then
    if v_role in ('authenticated', 'anon') and new.tier is distinct from old.tier then
      raise exception 'JEV Gatekeeper: Direct client modification of profile tier is forbidden.';
    end if;
  end if;
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_tier_gatekeeper on public.profiles;
create trigger trg_enforce_profile_tier_gatekeeper
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_tier_gatekeeper();

-- Usage tracking: read-only for clients; all mutations must go through consume_user_quota RPC
drop policy if exists "Users can view own usage" on public.usage_tracking;
drop policy if exists "Users can update own usage" on public.usage_tracking;
drop policy if exists "Users can delete own usage" on public.usage_tracking;
create policy "Users can view own usage" on public.usage_tracking for select using (auth.uid() = user_id);

drop policy if exists "Users can view own applications" on public.applications;
create policy "Users can view own applications" on public.applications for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own applications" on public.applications;
create policy "Users can insert own applications" on public.applications
  for insert with check (
    auth.uid() = user_id
    and (
      (select coalesce(p.tier, 'free') from public.profiles p where p.id = auth.uid()) in ('pro', 'lifetime')
      or (select count(*) from public.applications a where a.user_id = auth.uid()) < 10
    )
  );

drop policy if exists "Users can update own applications" on public.applications;
create policy "Users can update own applications" on public.applications for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own applications" on public.applications;
create policy "Users can delete own applications" on public.applications for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- ==============================================================================
-- 5. Atomic Server-Side Quota RPC Function (Prevents Client-Side Bypasses)
-- ==============================================================================
create or replace function public.consume_user_quota(p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_month text := to_char(now(), 'YYYY-MM');
  v_tier text := 'free';
  v_limit int := 3;
  v_current int := 0;
  v_col text;
  v_allowed boolean := false;
begin
  if v_user_id is null then
    return jsonb_build_object('allowed', false, 'error', 'unauthenticated');
  end if;

  -- Get user tier
  select coalesce(tier, 'free') into v_tier from public.profiles where id = v_user_id;

  -- Map column strictly (reject unknown actions instead of falling back)
  if p_action = 'jdAnalyses' then v_col := 'jd_analyses_count';
  elsif p_action = 'starCards' then v_col := 'star_cards_count';
  elsif p_action = 'speechCoach' then v_col := 'speech_pitch_count';
  elsif p_action = 'networkingMsg' then v_col := 'networking_msg_count';
  elsif p_action = 'mentorQuestions' then v_col := 'mentor_questions_count';
  elsif p_action = 'headshot' then v_col := 'headshot_count';
  elsif p_action = 'pdfExport' then v_col := 'pdf_export_count';
  else
    return jsonb_build_object('allowed', false, 'error', 'invalid_action');
  end if;

  -- Determine limit based on action and tier
  if v_tier = 'pro' then
    v_limit := 300;
  elsif v_tier = 'lifetime' then
    v_limit := 150; -- Fair Use Policy
  else
    if p_action = 'jdAnalyses' then v_limit := 5;
    elsif p_action = 'starCards' then v_limit := 3;
    elsif p_action = 'speechCoach' then v_limit := 3;
    elsif p_action = 'networkingMsg' then v_limit := 3;
    elsif p_action = 'mentorQuestions' then v_limit := 10;
    elsif p_action = 'headshot' then v_limit := 1;
    elsif p_action = 'pdfExport' then v_limit := 0; -- Pro/Lifetime only
    else v_limit := 0;
    end if;
  end if;

  -- Ensure record exists for current billing month
  insert into public.usage_tracking (user_id, billing_month)
  values (v_user_id, v_month)
  on conflict (user_id, billing_month) do nothing;

  -- Atomic conditional increment (single UPDATE ... WHERE col < v_limit RETURNING prevents TOCTOU race)
  execute format(
    'update public.usage_tracking set %I = coalesce(%I, 0) + 1 where user_id = $1 and billing_month = $2 and coalesce(%I, 0) < $3 returning %I',
    v_col, v_col, v_col, v_col
  )
  into v_current
  using v_user_id, v_month, v_limit;

  if v_current is not null then
    v_allowed := true;
  else
    v_allowed := false;
    execute format('select coalesce(%I, 0) from public.usage_tracking where user_id = $1 and billing_month = $2', v_col)
    into v_current
    using v_user_id, v_month;
    v_current := coalesce(v_current, 0);
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'current', v_current,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_current),
    'tier', v_tier
  );
end;
$$;

revoke execute on function public.consume_user_quota(text) from public, anon;
grant execute on function public.consume_user_quota(text) to authenticated;

-- ==============================================================================
-- 6. Verified Account Deletion (Apple Guideline 5.1.1(v) / Guideline 4)
-- Deletes the Auth user + all owned data (cascades via FK on delete cascade),
-- callable only by the authenticated owner. The client checks the RPC result
-- before clearing local state.
-- ==============================================================================
create or replace function public.delete_user_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'unauthenticated');
  end if;

  -- Business data cleanup (explicit for auditability; FK cascade also covers this)
  delete from public.applications where user_id = v_user_id;
  delete from public.usage_tracking where user_id = v_user_id;
  delete from public.subscriptions where user_id = v_user_id;
  delete from public.profiles where id = v_user_id;

  -- Remove the Auth account itself (cascades auth.identities, auth.sessions)
  delete from auth.users where id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.delete_user_account() from anon;
grant execute on function public.delete_user_account() to authenticated;
