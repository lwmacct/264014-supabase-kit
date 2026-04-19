create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_format check (position('@' in email) > 1)
);

comment on table public.profiles is 'Application profile data for each authenticated user.';
comment on column public.profiles.id is 'Matches auth.users.id.';
comment on column public.profiles.email is 'Cached auth email for convenience.';
comment on column public.profiles.display_name is 'User-visible display name.';
comment on column public.profiles.avatar_url is 'Public avatar URL.';

create unique index if not exists profiles_email_key
  on public.profiles (email);

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists sync_profile_from_auth_user on auth.users;
create trigger sync_profile_from_auth_user
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_profile_from_auth_user();

insert into public.profiles (id, email, display_name, avatar_url)
select
  users.id,
  users.email,
  coalesce(
    users.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(users.email, ''), '@', 1)
  ),
  users.raw_user_meta_data ->> 'avatar_url'
from auth.users users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.id = users.id
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.workspaces is 'Logical workspace container for API keys and billing data.';
comment on column public.workspaces.owner_id is 'Initial owner of the workspace.';
comment on column public.workspaces.is_default is 'Whether this is the user default workspace.';

create unique index if not exists workspaces_owner_default_key
  on public.workspaces (owner_id)
  where is_default = true;

create index if not exists workspaces_owner_id_idx
  on public.workspaces (owner_id);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id),
  constraint workspace_members_role_check check (role in ('owner', 'member'))
);

comment on table public.workspace_members is 'Membership mapping between authenticated users and workspaces.';

create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  api_key text not null unique,
  status text not null default 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  usage_usd numeric(12, 3) not null default 0,
  limit_usd numeric(12, 3),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint api_keys_status_check check (status in ('active', 'disabled')),
  constraint api_keys_name_length_check check (char_length(trim(name)) > 0)
);

comment on table public.api_keys is 'Workspace-scoped API keys for the gateway product.';
comment on column public.api_keys.api_key is 'Full API key. Visible to workspace members by product decision.';
comment on column public.api_keys.usage_usd is 'Accumulated spend in USD.';
comment on column public.api_keys.limit_usd is 'Optional spend limit in USD. Null means unlimited.';

create index if not exists api_keys_workspace_id_idx
  on public.api_keys (workspace_id);

create index if not exists api_keys_created_by_idx
  on public.api_keys (created_by);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members members
    where members.workspace_id = target_workspace_id
      and members.user_id = auth.uid()
  );
$$;

comment on function public.is_workspace_member(uuid)
is 'Checks whether the current authenticated user belongs to the given workspace.';

create or replace function public.create_default_workspace_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  workspace_name text;
begin
  if exists (
    select 1
    from public.workspaces workspaces
    where workspaces.owner_id = new.id
      and workspaces.is_default = true
  ) then
    return new;
  end if;

  workspace_name := concat(
    coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'default'),
    ' workspace'
  );

  insert into public.workspaces (owner_id, name, is_default)
  values (new.id, workspace_name, true)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

drop trigger if exists api_keys_set_updated_at on public.api_keys;
create trigger api_keys_set_updated_at
before update on public.api_keys
for each row
execute function public.set_updated_at();

drop trigger if exists create_default_workspace_for_user on auth.users;
create trigger create_default_workspace_for_user
after insert on auth.users
for each row
execute function public.create_default_workspace_for_user();

insert into public.workspaces (owner_id, name, is_default)
select
  users.id,
  concat(
    coalesce(nullif(split_part(coalesce(users.email, ''), '@', 1), ''), 'default'),
    ' workspace'
  ),
  true
from auth.users users
where not exists (
  select 1
  from public.workspaces workspaces
  where workspaces.owner_id = users.id
    and workspaces.is_default = true
);

insert into public.workspace_members (workspace_id, user_id, role)
select
  workspaces.id,
  workspaces.owner_id,
  'owner'
from public.workspaces workspaces
where not exists (
  select 1
  from public.workspace_members members
  where members.workspace_id = workspaces.id
    and members.user_id = workspaces.owner_id
);

create table if not exists public.billing_accounts (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  balance_cents bigint not null default 0,
  total_recharged_cents bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_accounts_balance_nonnegative check (balance_cents >= 0),
  constraint billing_accounts_total_recharged_nonnegative check (total_recharged_cents >= 0)
);

comment on table public.billing_accounts
is 'Workspace-scoped balance snapshot for redemption code credits.';
comment on column public.billing_accounts.balance_cents
is 'Available balance in cents.';
comment on column public.billing_accounts.total_recharged_cents
is 'Lifetime credited amount in cents.';

drop trigger if exists billing_accounts_set_updated_at on public.billing_accounts;
create trigger billing_accounts_set_updated_at
before update on public.billing_accounts
for each row
execute function public.set_updated_at();

create or replace function public.create_billing_account_for_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.billing_accounts (workspace_id)
  values (new.id)
  on conflict (workspace_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_billing_account_for_workspace on public.workspaces;
create trigger create_billing_account_for_workspace
after insert on public.workspaces
for each row
execute function public.create_billing_account_for_workspace();

insert into public.billing_accounts (workspace_id)
select workspaces.id
from public.workspaces workspaces
where not exists (
  select 1
  from public.billing_accounts accounts
  where accounts.workspace_id = workspaces.id
);

create table if not exists public.gift_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  amount_cents bigint not null,
  status text not null default 'active',
  note text,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_workspace_id uuid references public.workspaces (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gift_codes_code_length_check check (char_length(trim(code)) >= 8),
  constraint gift_codes_amount_positive_check check (amount_cents > 0),
  constraint gift_codes_status_check check (status in ('active', 'redeemed', 'disabled'))
);

comment on table public.gift_codes
is 'One-time redeemable codes that instantly credit workspace balance. Each code carries its own amount.';

create unique index if not exists gift_codes_code_key
  on public.gift_codes (upper(code));

create index if not exists gift_codes_status_idx
  on public.gift_codes (status, created_at desc);

drop trigger if exists gift_codes_set_updated_at on public.gift_codes;
create trigger gift_codes_set_updated_at
before update on public.gift_codes
for each row
execute function public.set_updated_at();

create table if not exists public.billing_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  gift_code_id uuid references public.gift_codes (id) on delete set null,
  entry_type text not null default 'gift_code',
  amount_cents bigint not null,
  balance_after_cents bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint billing_ledger_entry_type_check check (entry_type in ('gift_code', 'adjustment')),
  constraint billing_ledger_amount_cents_check check (amount_cents <> 0),
  constraint billing_ledger_balance_after_cents_check check (balance_after_cents >= 0)
);

comment on table public.billing_ledger
is 'Immutable billing ledger for gift code credits and future manual adjustments.';

create unique index if not exists billing_ledger_gift_code_id_key
  on public.billing_ledger (gift_code_id)
  where gift_code_id is not null;

create index if not exists billing_ledger_workspace_id_idx
  on public.billing_ledger (workspace_id, created_at desc);

create table if not exists public.gift_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_code_id uuid not null references public.gift_codes (id) on delete restrict,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  redeemed_by uuid not null references auth.users (id) on delete cascade,
  amount_cents bigint not null,
  balance_after_cents bigint not null,
  code_tail text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint gift_code_redemptions_amount_positive_check check (amount_cents > 0),
  constraint gift_code_redemptions_balance_nonnegative_check check (balance_after_cents >= 0),
  constraint gift_code_redemptions_code_tail_length_check check (char_length(code_tail) between 4 and 12)
);

comment on table public.gift_code_redemptions
is 'Immutable redemption history for redemption code credits.';

create unique index if not exists gift_code_redemptions_gift_code_id_key
  on public.gift_code_redemptions (gift_code_id);

create index if not exists gift_code_redemptions_workspace_id_idx
  on public.gift_code_redemptions (workspace_id, created_at desc);

create or replace function public.redeem_gift_code(
  p_workspace_id uuid,
  p_code text
)
returns public.gift_code_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  code_input text;
  code_tail_value text;
  current_balance bigint;
  next_balance bigint;
  target_code public.gift_codes%rowtype;
  redemption_row public.gift_code_redemptions%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception '当前未登录，无法使用兑换码。';
  end if;

  if not public.is_workspace_member(p_workspace_id) then
    raise exception '当前账户不属于该 workspace，无法兑换。';
  end if;

  code_input := upper(trim(coalesce(p_code, '')));
  if code_input = '' then
    raise exception '请输入兑换码。';
  end if;

  code_tail_value := right(regexp_replace(code_input, '[^A-Z0-9]+', '', 'g'), 4);
  if char_length(code_tail_value) < 4 then
    raise exception '兑换码格式不正确。';
  end if;

  select *
  into target_code
  from public.gift_codes gift_codes
  where upper(gift_codes.code) = code_input
  for update;

  if not found then
    raise exception '兑换码不存在或已失效。';
  end if;

  if target_code.status = 'disabled' then
    raise exception '兑换码已禁用。';
  end if;

  if target_code.status = 'redeemed' then
    raise exception '兑换码已被兑换。';
  end if;

  if target_code.expires_at is not null and target_code.expires_at < timezone('utc', now()) then
    raise exception '兑换码已过期。';
  end if;

  insert into public.billing_accounts (workspace_id)
  values (p_workspace_id)
  on conflict (workspace_id) do nothing;

  select balance_cents
  into current_balance
  from public.billing_accounts accounts
  where accounts.workspace_id = p_workspace_id
  for update;

  current_balance := coalesce(current_balance, 0);
  next_balance := current_balance + target_code.amount_cents;

  update public.billing_accounts
  set
    balance_cents = next_balance,
    total_recharged_cents = total_recharged_cents + target_code.amount_cents,
    updated_at = timezone('utc', now())
  where workspace_id = p_workspace_id;

  update public.gift_codes
  set
    status = 'redeemed',
    redeemed_by = current_user_id,
    redeemed_workspace_id = p_workspace_id,
    redeemed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = target_code.id;

  insert into public.billing_ledger (
    workspace_id,
    gift_code_id,
    entry_type,
    amount_cents,
    balance_after_cents
  )
  values (
    p_workspace_id,
    target_code.id,
    'gift_code',
    target_code.amount_cents,
    next_balance
  );

  insert into public.gift_code_redemptions (
    gift_code_id,
    workspace_id,
    redeemed_by,
    amount_cents,
    balance_after_cents,
    code_tail,
    note
  )
  values (
    target_code.id,
    p_workspace_id,
    current_user_id,
    target_code.amount_cents,
    next_balance,
    code_tail_value,
    target_code.note
  )
  returning *
  into redemption_row;

  return redemption_row;
end;
$$;

comment on function public.redeem_gift_code(uuid, text)
is 'Redeems a one-time redemption code for the current workspace and credits its balance atomically.';

create or replace function public.is_super_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from auth.users users
    where users.id = coalesce(target_user_id, auth.uid())
      and lower(coalesce(users.email, '')) = 'lwmacct@icloud.com'
  );
$$;

comment on function public.is_super_admin(uuid)
is 'Checks whether the current authenticated user is the hard-coded super admin.';

create or replace function public.admin_generate_gift_codes(
  p_amount_cents bigint,
  p_quantity integer default 1,
  p_note text default null,
  p_expires_at timestamptz default null,
  p_prefix text default 'REDEEM'
)
returns setof public.gift_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  requested_quantity integer;
  code_prefix text;
  candidate_code text;
  created_row public.gift_codes%rowtype;
  idx integer;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception '当前未登录，无法生成兑换码。';
  end if;

  if not public.is_super_admin(current_user_id) then
    raise exception '当前账户没有兑换码管理权限。';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception '兑换码金额必须大于 0。';
  end if;

  requested_quantity := greatest(1, least(coalesce(p_quantity, 1), 50));
  code_prefix := upper(trim(coalesce(nullif(p_prefix, ''), 'REDEEM')));

  for idx in 1..requested_quantity loop
    loop
      candidate_code := concat(
        code_prefix,
        '-',
        to_char(timezone('utc', now()), 'YYMMDD'),
        '-',
        upper(replace(substr(gen_random_uuid()::text, 1, 8), '-', ''))
      );

      exit when not exists (
        select 1
        from public.gift_codes gift_codes
        where upper(gift_codes.code) = candidate_code
      );
    end loop;

    insert into public.gift_codes (
      code,
      amount_cents,
      status,
      note,
      expires_at,
      created_by
    )
    values (
      candidate_code,
      p_amount_cents,
      'active',
      nullif(trim(coalesce(p_note, '')), ''),
      p_expires_at,
      current_user_id
    )
    returning *
    into created_row;

    return next created_row;
  end loop;

  return;
end;
$$;

comment on function public.admin_generate_gift_codes(bigint, integer, text, timestamptz, text)
is 'Generates one or more gift codes for the hard-coded super admin.';

create or replace function public.admin_disable_gift_code(p_gift_code_id uuid)
returns public.gift_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  updated_row public.gift_codes%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception '当前未登录，无法停用兑换码。';
  end if;

  if not public.is_super_admin(current_user_id) then
    raise exception '当前账户没有兑换码管理权限。';
  end if;

  update public.gift_codes
  set
    status = 'disabled',
    updated_at = timezone('utc', now())
  where id = p_gift_code_id
    and status = 'active'
  returning *
  into updated_row;

  if not found then
    raise exception '只有可用状态的兑换码才能停用。';
  end if;

  return updated_row;
end;
$$;

comment on function public.admin_disable_gift_code(uuid)
is 'Disables an active gift code for the hard-coded super admin.';

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.billing_ledger enable row level security;
alter table public.gift_codes enable row level security;
alter table public.gift_code_redemptions enable row level security;

drop policy if exists "Profiles are viewable by the owner" on public.profiles;
create policy "Profiles are viewable by the owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles can be inserted by the owner" on public.profiles;
create policy "Profiles can be inserted by the owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles can be updated by the owner" on public.profiles;
create policy "Profiles can be updated by the owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Workspace members can view workspaces" on public.workspaces;
create policy "Workspace members can view workspaces"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists "Authenticated users can create owned workspaces" on public.workspaces;
create policy "Authenticated users can create owned workspaces"
on public.workspaces
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Workspace owners can update workspaces" on public.workspaces;
create policy "Workspace owners can update workspaces"
on public.workspaces
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Workspace owners can delete workspaces" on public.workspaces;
create policy "Workspace owners can delete workspaces"
on public.workspaces
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Workspace members can view membership" on public.workspace_members;
create policy "Workspace members can view membership"
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_workspace_member(workspace_id)
);

drop policy if exists "Workspace owners can insert membership" on public.workspace_members;
create policy "Workspace owners can insert membership"
on public.workspace_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspaces workspaces
    where workspaces.id = workspace_members.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "Workspace owners can update membership" on public.workspace_members;
create policy "Workspace owners can update membership"
on public.workspace_members
for update
to authenticated
using (
  exists (
    select 1
    from public.workspaces workspaces
    where workspaces.id = workspace_members.workspace_id
      and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workspaces workspaces
    where workspaces.id = workspace_members.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "Workspace owners can delete membership" on public.workspace_members;
create policy "Workspace owners can delete membership"
on public.workspace_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspaces workspaces
    where workspaces.id = workspace_members.workspace_id
      and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "Workspace members can view api keys" on public.api_keys;
create policy "Workspace members can view api keys"
on public.api_keys
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can create api keys" on public.api_keys;
create policy "Workspace members can create api keys"
on public.api_keys
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "Workspace members can update api keys" on public.api_keys;
create policy "Workspace members can update api keys"
on public.api_keys
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can delete api keys" on public.api_keys;
create policy "Workspace members can delete api keys"
on public.api_keys
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can view billing accounts" on public.billing_accounts;
create policy "Workspace members can view billing accounts"
on public.billing_accounts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can view billing ledger" on public.billing_ledger;
create policy "Workspace members can view billing ledger"
on public.billing_ledger
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can view gift code redemptions" on public.gift_code_redemptions;
create policy "Workspace members can view gift code redemptions"
on public.gift_code_redemptions
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Super admins can view gift codes" on public.gift_codes;
create policy "Super admins can view gift codes"
on public.gift_codes
for select
to authenticated
using (public.is_super_admin());

grant usage on schema public to authenticated;

revoke all on public.gift_codes from public;
revoke all on public.gift_code_redemptions from public;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.redeem_gift_code(uuid, text) from public;
revoke all on function public.is_super_admin(uuid) from public;
revoke all on function public.admin_generate_gift_codes(bigint, integer, text, timestamptz, text) from public;
revoke all on function public.admin_disable_gift_code(uuid) from public;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.api_keys to authenticated;
grant select on public.billing_accounts to authenticated;
grant select on public.billing_ledger to authenticated;
grant select on public.gift_code_redemptions to authenticated;
grant select on public.gift_codes to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.redeem_gift_code(uuid, text) to authenticated;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.admin_generate_gift_codes(bigint, integer, text, timestamptz, text) to authenticated;
grant execute on function public.admin_disable_gift_code(uuid) to authenticated;
