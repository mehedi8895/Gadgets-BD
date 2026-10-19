-- Gadgets BD production-oriented Supabase schema.
-- Safe to re-run on an empty/partially initialized project. Review and test before production.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  brand text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  stock integer not null default 0 check (stock >= 0),
  image_url text not null default '',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  delivery_address text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 80 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null default 'cod' check (payment_method in ('cod')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  created_at timestamptz not null default now()
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create table if not exists public.wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','staff')),
  created_at timestamptz not null default now()
);
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.is_gadgets_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_gadgets_admin() from public;
grant execute on function public.is_gadgets_admin() to authenticated;

create or replace function public.handle_new_gadgets_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_gadgets_auth_user_created on auth.users;
create trigger on_gadgets_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_gadgets_user();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.admin_users enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select to anon, authenticated using (true);
drop policy if exists "Admin manage categories" on public.categories;
create policy "Admin manage categories" on public.categories for all to authenticated using ((select public.is_gadgets_admin())) with check ((select public.is_gadgets_admin()));

drop policy if exists "Read active products or admin" on public.products;
create policy "Read active products or admin" on public.products for select to anon, authenticated using (is_active = true or (select public.is_gadgets_admin()));
drop policy if exists "Admin insert products" on public.products;
create policy "Admin insert products" on public.products for insert to authenticated with check ((select public.is_gadgets_admin()));
drop policy if exists "Admin update products" on public.products;
create policy "Admin update products" on public.products for update to authenticated using ((select public.is_gadgets_admin())) with check ((select public.is_gadgets_admin()));
drop policy if exists "Admin delete products" on public.products;
create policy "Admin delete products" on public.products for delete to authenticated using ((select public.is_gadgets_admin()));

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Read own orders or admin" on public.orders;
create policy "Read own orders or admin" on public.orders for select to authenticated using ((select auth.uid()) = user_id or (select public.is_gadgets_admin()));
drop policy if exists "Admin update orders" on public.orders;
create policy "Admin update orders" on public.orders for update to authenticated using ((select public.is_gadgets_admin())) with check ((select public.is_gadgets_admin()));

drop policy if exists "Read own order items or admin" on public.order_items;
create policy "Read own order items or admin" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  or (select public.is_gadgets_admin())
);

drop policy if exists "Manage own wishlist" on public.wishlists;
create policy "Manage own wishlist" on public.wishlists for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Read own admin record" on public.admin_users;
create policy "Read own admin record" on public.admin_users for select to authenticated using ((select auth.uid()) = user_id);
-- Admin roles must only be assigned by trusted project owners via SQL/dashboard, never from the public client.

drop policy if exists "Anyone can subscribe newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe newsletter" on public.newsletter_subscribers for insert to anon, authenticated with check (length(email) <= 254 and position('@' in email) > 1);
drop policy if exists "Admin read newsletter" on public.newsletter_subscribers;
create policy "Admin read newsletter" on public.newsletter_subscribers for select to authenticated using ((select public.is_gadgets_admin()));

-- Price/stock are read from Postgres, not trusted from the browser. COD only until a gateway is verified.
create or replace function public.place_gadgets_order(
  p_customer_name text,
  p_phone text,
  p_delivery_address text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_order_id uuid := gen_random_uuid();
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2) := 80;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
begin
  if v_uid is null then raise exception 'Please sign in before placing an order'; end if;
  if length(trim(coalesce(p_customer_name,''))) < 2 then raise exception 'Enter your full name'; end if;
  if length(trim(coalesce(p_phone,''))) < 7 then raise exception 'Enter a valid phone number'; end if;
  if length(trim(coalesce(p_delivery_address,''))) < 8 then raise exception 'Enter your full delivery address'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty or contains too many items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'product_id','') = '' then raise exception 'Invalid product'; end if;
    begin v_qty := (v_item->>'quantity')::integer; exception when others then raise exception 'Invalid quantity'; end;
    if v_qty < 1 or v_qty > 20 then raise exception 'Quantity must be between 1 and 20'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and is_active = true
      for update;
    if not found then raise exception 'A product is no longer available'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  insert into public.orders(user_id, customer_name, phone, delivery_address, subtotal, delivery_fee, total, payment_method)
  values (v_uid, trim(p_customer_name), trim(p_phone), trim(p_delivery_address), v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee, 'cod')
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and is_active = true for update;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
  end loop;
  return v_order_id;
end;
$$;
revoke all on function public.place_gadgets_order(text,text,text,jsonb) from public;
grant execute on function public.place_gadgets_order(text,text,text,jsonb) to authenticated;

grant select on public.categories, public.products to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.order_items, public.wishlists, public.admin_users to authenticated;
grant insert, update, delete on public.wishlists to authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, insert, update, delete on public.categories, public.products to authenticated;
grant update on public.orders to authenticated;
grant select on public.newsletter_subscribers to authenticated;

insert into public.categories(name,slug) values
('Phones','phones'),('Audio','audio'),('Wearables','wearables'),('Accessories','accessories')
on conflict (slug) do nothing;

insert into public.products(name,slug,description,brand,category_id,price,compare_at_price,stock,image_url,is_active,is_featured)
values
('iPhone 16 Pro','iphone-16-pro','Illustrative demo catalog item. Replace with verified product listing.','Apple',(select id from public.categories where slug='phones'),129999,139999,5,'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=85',true,true),
('Galaxy S25 Ultra','galaxy-s25-ultra','Illustrative demo catalog item. Replace with verified product listing.','Samsung',(select id from public.categories where slug='phones'),119999,129999,5,'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=85',true,true),
('Studio Wireless Headphones','studio-wireless-headphones','Illustrative demo catalog item. Replace with verified product listing.','Gadgets BD',(select id from public.categories where slug='audio'),8499,9999,15,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85',true,true),
('Everyday Smartwatch','everyday-smartwatch','Illustrative demo catalog item. Replace with verified product listing.','Gadgets BD',(select id from public.categories where slug='wearables'),6999,7999,20,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85',true,false),
('Premium True Wireless Buds','premium-true-wireless-buds','Illustrative demo catalog item. Replace with verified product listing.','Gadgets BD',(select id from public.categories where slug='audio'),4599,5299,20,'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=85',true,false),
('Portable Bluetooth Speaker','portable-bluetooth-speaker','Illustrative demo catalog item. Replace with verified product listing.','Gadgets BD',(select id from public.categories where slug='audio'),3899,4499,20,'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=85',true,false),
('Wireless Charger','wireless-charger','Illustrative demo catalog item. Replace with verified product listing.','Gadgets BD',(select id from public.categories where slug='accessories'),2199,2599,25,'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=800&q=85',true,false),
('Smart Fitness Watch','smart-fitness-watch','Illustrative demo catalog item. Replace with verified product listing.','Gadgets BD',(select id from public.categories where slug='wearables'),8999,10499,15,'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=85',true,false)
on conflict (slug) do nothing;
