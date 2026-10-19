# Gadgets BD — Supabase-backed e-commerce

Responsive electronics storefront built with HTML5, CSS3 and vanilla JavaScript. The public frontend uses the Supabase publishable key; database access is controlled by PostgreSQL Row Level Security (RLS).

## Current features

- Product catalog and category/search filters loaded from Supabase
- Customer sign-up, email/password sign-in and sign-out via Supabase Auth
- Persistent cart in the browser
- Wishlist saved per signed-in user
- Checkout for signed-in customers using Cash on Delivery
- Server/database-side order creation that calculates prices from the product table, validates stock and decrements inventory transactionally
- Customer order records, private admin dashboard, product CRUD, stock updates and order status management
- Newsletter email storage
- RLS policies for public catalog, customer-owned profile/orders/wishlist and admin-only catalog/order operations

## Supabase project

A separate, dedicated Supabase project is still required for Gadgets BD. The currently connected Supabase account has a different app database, so `config.js` is intentionally left blank to avoid mixing customer accounts and tables between projects. Once a dedicated project is created, add its project URL and publishable key to `config.js`. Publishable keys are designed for frontend use with RLS enabled. **Never add a Supabase secret/service-role key or payment gateway secret to GitHub or browser JavaScript.**

### Database setup

The SQL migration is `supabase/migrations/202610190001_gadgets_fullstack.sql`. Apply it to the dedicated Gadgets BD Supabase project using the Supabase SQL Editor or migration workflow, then verify the tables, functions and policies. Do not apply it to another app’s database. It creates the catalog, profiles, orders, order items, wishlists, admin roles, newsletter table, profile trigger, RLS policies, and `place_gadgets_order` RPC.

The migration inserts an **illustrative demo catalog** so the interface has data to render. Demo product names, prices, stock, images and warranty information must be reviewed and replaced before real sales.

### Set the first store owner

1. Register a customer account through the website and verify the email if email confirmation is enabled.
2. In Supabase Dashboard → SQL Editor, run the following query after replacing the email with the exact owner email:
   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'owner' from auth.users where lower(email) = lower('YOUR_OWNER_EMAIL@example.com')
   on conflict (user_id) do update set role = 'owner';
   ```
3. Sign in again and open `/admin.html`. Never create a public "make me admin" endpoint. Add other staff only by a trusted owner/admin workflow.

### Auth and production settings

- Configure Auth → URL Configuration with your real deployed site URL and allowed redirect URLs.
- Decide whether email confirmation is required and configure SMTP before public launch.
- Verify RLS and run Supabase security/performance advisors after applying the migration.
- The first admin role must be assigned by a trusted project owner in the Dashboard; no self-service privilege escalation is provided.
- Only Cash on Delivery is enabled. bKash/SSLCommerz require merchant credentials, a server-side payment initiation flow and verified callbacks/webhooks before enabling online payments.
- Set real business contact details, delivery fee/areas, return/warranty terms, privacy policy and customer support before accepting orders.

## Deploy

Deploy this static repository on Vercel, Netlify or GitHub Pages. Use the repository root as the static output. Configure a custom domain and the Supabase Auth redirect URLs after deployment. Vercel project creation from the connected integration previously returned a permission error, so live deployment has not been confirmed.

## Verify before launch

- Apply the migration and verify tables/RLS and sample catalog.
- Test sign-up, email verification, sign-in, sign-out and password policy.
- Test order creation with valid, empty, invalid and out-of-stock carts.
- Confirm each user can only read their own orders and wishlists.
- Confirm a non-admin cannot access admin data or edit products/orders.
- Assign the first owner, test product create/update/hide and order status transitions.
- Replace all demo catalog information with verified real inventory/prices.
- Add rate limiting/abuse controls, transactional order notifications and payment gateway integration if required.

## Run locally

Serve the root directory with any static HTTP server and open `index.html`. The app is not intended to be tested by double-clicking the file if browser restrictions block remote module/API requests.
