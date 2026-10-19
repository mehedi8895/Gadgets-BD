-- Explicit grants and FK indexes for the Gadgets BD project.
-- Security-definer RPCs remain executable only by signed-in users when required by the app.
revoke all on function public.handle_new_gadgets_user() from public, anon, authenticated;
revoke all on function public.is_gadgets_admin() from public, anon;
grant execute on function public.is_gadgets_admin() to authenticated;
revoke all on function public.place_gadgets_order(text,text,text,jsonb) from public, anon;
grant execute on function public.place_gadgets_order(text,text,text,jsonb) to authenticated;

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_orders_user_id_created_at on public.orders(user_id, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_wishlists_product_id on public.wishlists(product_id);
