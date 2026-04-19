-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  home_currency text default 'IDR',
  preferensi_bahasa text default 'id',
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users delete own profile" on public.profiles for delete using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- TRANSACTIONS
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  merchant_name text,
  total_amount numeric not null,
  original_currency text default 'IDR',
  converted_amount numeric,
  conversion_rate numeric,
  home_currency text default 'IDR',
  transaction_date date default current_date,
  category text,
  payment_method text,
  is_itemized boolean default false,
  notes text,
  created_at timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Users view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- BUDGETS
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  month integer not null,
  year integer not null,
  total_limit numeric not null,
  alert_threshold numeric default 70,
  currency text default 'IDR',
  created_at timestamptz default now(),
  unique(user_id, month, year)
);
alter table public.budgets enable row level security;
create policy "Users view own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users update own budgets" on public.budgets for update using (auth.uid() = user_id);
create policy "Users delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

-- SPLIT SETTLEMENTS
create table public.split_settlements (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  created_by uuid references public.profiles(id),
  member_name text not null,
  member_phone text,
  amount_owed numeric not null,
  is_settled boolean default false,
  settled_at timestamptz,
  created_at timestamptz default now()
);
alter table public.split_settlements enable row level security;
create policy "Users view own splits" on public.split_settlements for select using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);
create policy "Users insert own splits" on public.split_settlements for insert with check (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);
create policy "Users update own splits" on public.split_settlements for update using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);
create policy "Users delete own splits" on public.split_settlements for delete using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);

-- TRANSACTION ITEMS
create table public.transaction_items (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  item_name text not null,
  price numeric not null,
  assigned_to text
);
alter table public.transaction_items enable row level security;
create policy "Users view own items" on public.transaction_items for select using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);
create policy "Users insert own items" on public.transaction_items for insert with check (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);
create policy "Users update own items" on public.transaction_items for update using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);
create policy "Users delete own items" on public.transaction_items for delete using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);

-- STOCK ITEMS
create table public.stock_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_name text not null,
  avg_consumption_days integer,
  last_purchase_date date,
  predicted_next_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.stock_items enable row level security;
create policy "Users view own stock" on public.stock_items for select using (auth.uid() = user_id);
create policy "Users insert own stock" on public.stock_items for insert with check (auth.uid() = user_id);
create policy "Users update own stock" on public.stock_items for update using (auth.uid() = user_id);
create policy "Users delete own stock" on public.stock_items for delete using (auth.uid() = user_id);

-- PARENT CHILD
create table public.parent_child (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid references public.profiles(id) on delete cascade,
  child_id uuid references public.profiles(id) on delete cascade,
  invite_code text unique,
  connected_at timestamptz,
  budget_limit numeric,
  created_at timestamptz default now()
);
alter table public.parent_child enable row level security;
create policy "Users view own links" on public.parent_child for select using (auth.uid() = parent_id or auth.uid() = child_id);
create policy "Users insert own links" on public.parent_child for insert with check (auth.uid() = parent_id or auth.uid() = child_id);
create policy "Users update own links" on public.parent_child for update using (auth.uid() = parent_id or auth.uid() = child_id);
create policy "Users delete own links" on public.parent_child for delete using (auth.uid() = parent_id or auth.uid() = child_id);