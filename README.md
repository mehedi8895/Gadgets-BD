# Gadgets BD — E-commerce starter

Responsive electronics storefront inspired by premium tech retailers. Built with HTML, CSS and vanilla JavaScript; Supabase is optional for the next integration phase.

## Included
- Responsive landing page and product/category sections
- Product search and category filters
- Demo product cards, wishlist interaction and persistent local cart
- Quantity controls, subtotal and checkout placeholder
- Supabase schema for products, categories, profiles, orders, order items, wishlists and admin roles

## Run
Open `index.html` in a browser or deploy the repository as a static site on Vercel/Netlify/GitHub Pages.

## Backend setup
1. Create a Supabase project and run `supabase/schema.sql` in SQL Editor.
2. Put the project URL and anon/public key in `config.js`. Never put a service-role key in frontend code.
3. Wire authentication, database-backed product listing, trusted order creation, admin authorization and server-side stock/price validation.
4. Integrate a Bangladesh payment provider (e.g. SSLCommerz or bKash merchant checkout) via server-side verification/webhooks before accepting online payments.

## Production checklist
Demo prices/images are illustrative and must be replaced with verified catalog information. Checkout, authentication, newsletter persistence and admin actions are not live in this starter. Add tested RLS policies, secure owner bootstrap, delivery fees, shipping/returns/warranty policies, privacy/terms, real contact details, analytics and transactional notifications before launch.
