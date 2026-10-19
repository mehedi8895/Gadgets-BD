const CONFIG = window.GADGETS_BD_CONFIG || {};
const supabaseClient = window.supabase && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey
  ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
  : null;
const $ = (selector) => document.querySelector(selector);
const money = (value) => "৳" + Number(value || 0).toLocaleString("en-BD");
const demoProducts = [
 {id:"demo-p1",name:"iPhone 16 Pro",category:"Phones",price:129999,compare_at_price:139999,stock:5,is_active:true,is_featured:true,image_url:"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=85",brand:"Apple",badge:"DEMO"},
 {id:"demo-p2",name:"Galaxy S25 Ultra",category:"Phones",price:119999,compare_at_price:129999,stock:5,is_active:true,is_featured:true,image_url:"https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=85",brand:"Samsung",badge:"DEMO"},
 {id:"demo-p3",name:"Studio Wireless Headphones",category:"Audio",price:8499,compare_at_price:9999,stock:15,is_active:true,is_featured:true,image_url:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85",brand:"Gadgets BD",badge:"DEMO"},
 {id:"demo-p4",name:"Everyday Smartwatch",category:"Wearables",price:6999,compare_at_price:7999,stock:20,is_active:true,image_url:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85",brand:"Gadgets BD",badge:"DEMO"},
 {id:"demo-p5",name:"Premium True Wireless Buds",category:"Audio",price:4599,compare_at_price:5299,stock:20,is_active:true,image_url:"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=85",brand:"Gadgets BD",badge:"DEMO"},
 {id:"demo-p6",name:"Portable Bluetooth Speaker",category:"Audio",price:3899,compare_at_price:4499,stock:20,is_active:true,image_url:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=85",brand:"Gadgets BD",badge:"DEMO"},
 {id:"demo-p7",name:"Wireless Charger",category:"Accessories",price:2199,compare_at_price:2599,stock:25,is_active:true,image_url:"https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=800&q=85",brand:"Gadgets BD",badge:"DEMO"},
 {id:"demo-p8",name:"Smart Fitness Watch",category:"Wearables",price:8999,compare_at_price:10499,stock:15,is_active:true,image_url:"https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=85",brand:"Gadgets BD",badge:"DEMO"}
];
let products = [], filter = "All", query = "", authMode = "signin", session = null, profile = null, isAdmin = false;
let cart = JSON.parse(localStorage.getItem("gadgetsbd_cart") || "[]");
cart = Array.isArray(cart) ? cart.filter(x => x && typeof x.id === "string" && !x.id.startsWith("demo-") && Number.isInteger(x.qty) && x.qty > 0) : [];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => el.classList.remove("show"), 2600); }
function categoryName(product) { return product.category || product.categories?.name || "Accessories"; }
function getProduct(id) { return products.find(p => p.id === id); }
function persistCart() { localStorage.setItem("gadgetsbd_cart", JSON.stringify(cart)); renderCart(); }
function productCard(p) {
 const old = Number(p.compare_at_price || 0);
 return `<article class="card"><div class="product-img"><span class="badge">${p.badge || (p.stock > 0 ? "IN STOCK" : "SOLD OUT")}</span><button class="wish" data-wish="${esc(p.id)}" aria-label="Add to wishlist">♡</button><img loading="lazy" src="${esc(p.image_url || "")}" alt="${esc(p.name)}" onerror="this.style.display='none'"></div><div class="info"><div class="cat">${esc(categoryName(p))} · ${esc(p.brand || "Gadgets BD")}</div><h3 class="name">${esc(p.name)}</h3><div class="rating">${p.stock > 0 ? "Available · " + Number(p.stock) + " in stock" : "Currently unavailable"}</div><div class="price-row"><span class="price">${money(p.price)}</span>${old > Number(p.price) ? `<span class="old">${money(old)}</span>` : ""}</div></div><button class="add" data-add="${esc(p.id)}" ${p.stock < 1 ? "disabled" : ""}>＋ Add to bag</button></article>`;
}
function renderProducts() {
 const list = products.filter(p => p.is_active !== false && (filter === "All" || categoryName(p).toLowerCase() === filter.toLowerCase()) && (String(p.name + " " + categoryName(p) + " " + (p.brand || "")).toLowerCase().includes(query.toLowerCase())));
 $("#grid").innerHTML = list.map(productCard).join("");
 $("#empty").hidden = !!list.length;
 $("#productTitle").textContent = filter === "All" ? "Popular right now" : filter + " to explore";
 document.querySelectorAll(".filters [data-filter]").forEach(b => b.classList.toggle("selected", b.dataset.filter === filter));
}
async function loadProducts() {
 if (supabaseClient) {
   const {data, error} = await supabaseClient.from("products").select("id,name,slug,description,brand,price,compare_at_price,stock,image_url,is_active,is_featured,category_id,categories(name)").eq("is_active", true).order("is_featured", {ascending:false}).order("created_at", {ascending:false});
   if (!error && data) {
     products = data.map(p => ({...p, category: p.categories?.name || "Accessories"}));
     renderProducts(); renderCart(); return;
   }
   console.error("Supabase products query:", error);
   toast("Database is starting or not configured; showing preview catalog.");
 } else toast("Supabase config missing; showing preview catalog.");
 products = demoProducts.slice(); renderProducts(); renderCart();
}
function add(id) {
 const product = getProduct(id);
 if (!product) return toast("This preview item cannot be ordered. Connect the database first.");
 if (product.stock < 1) return toast("This product is out of stock.");
 const item = cart.find(x => x.id === id);
 if (item) { if (item.qty >= Math.min(20, product.stock)) return toast("Maximum available stock reached."); item.qty++; }
 else cart.push({id, qty:1});
 persistCart(); toast("Added to your bag");
}
function renderCart() {
 cart = cart.filter(item => getProduct(item.id));
 const count = cart.reduce((sum, item) => sum + item.qty, 0);
 const subtotal = cart.reduce((sum, item) => sum + Number(getProduct(item.id)?.price || 0) * item.qty, 0);
 $("#count").textContent = count;
 $("#drawerCount").textContent = "(" + count + ")";
 $("#subtotal").textContent = money(subtotal);
 $("#checkoutTotal").textContent = money(subtotal + 80);
 $("#cartItems").innerHTML = cart.length ? cart.map(item => {
   const p = getProduct(item.id); if (!p) return "";
   return `<div class="cart-line"><img src="${esc(p.image_url || "")}" alt=""><div><strong>${esc(p.name)}</strong><small>${money(p.price)}</small><div class="qty"><button data-qty="${esc(p.id)}" data-d="-1" aria-label="Decrease quantity">−</button><span>${item.qty}</span><button data-qty="${esc(p.id)}" data-d="1" aria-label="Increase quantity">＋</button></div><button class="remove" data-remove="${esc(p.id)}">Remove</button></div><strong>${money(Number(p.price) * item.qty)}</strong></div>`;
 }).join("") : '<p style="padding:35px 0;color:#777">Your bag is empty. Find something you’ll love.</p>';
}
function openModal(id) { $("#" + id).hidden = false; document.body.style.overflow = "hidden"; }
function closeModal(id) { $("#" + id).hidden = true; document.body.style.overflow = ""; }
function setAuthMessage(message) { $("#authMessage").textContent = message || ""; }
async function refreshSession() {
 if (!supabaseClient) return;
 const {data} = await supabaseClient.auth.getSession(); session = data.session;
 if (session) {
   const {data: userData} = await supabaseClient.auth.getUser();
   const user = userData.user;
   profile = user?.user_metadata || {};
   $("#authTitle").textContent = "Your account";
   $("#authHelp").textContent = user?.email || "Signed in";
   $("#authNameWrap").hidden = true; $("#authEmail").closest("label").hidden = true; $("#authPassword").closest("label").hidden = true;
   $("#authSubmit").hidden = true; $("#toggleAuthMode").hidden = true; $("#signOut").hidden = false;
   $("#authMessage").textContent = "You're signed in. You can now place and track orders.";
   const {data: adminRow} = await supabaseClient.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
   isAdmin = !!adminRow;
   $("#adminLink").hidden = !isAdmin; $("#modalAdminLink").hidden = !isAdmin;
   if (isAdmin) $("#authMessage").textContent += " Admin access is enabled.";
 } else {
   isAdmin = false;
   $("#authTitle").textContent = authMode === "signup" ? "Create account" : "Welcome back";
   $("#authHelp").textContent = "Sign in to place and track your orders.";
   $("#authNameWrap").hidden = authMode !== "signup"; $("#authEmail").closest("label").hidden = false; $("#authPassword").closest("label").hidden = false;
   $("#authSubmit").hidden = false; $("#toggleAuthMode").hidden = false; $("#signOut").hidden = true;
   $("#adminLink").hidden = true; $("#modalAdminLink").hidden = true;
   $("#toggleAuthMode").textContent = authMode === "signin" ? "New here? Create an account" : "Already registered? Sign in";
   $("#authSubmit").textContent = authMode === "signin" ? "Sign in" : "Create account";
 }
}
async function submitAuth(event) {
 event.preventDefault();
 if (!supabaseClient) return setAuthMessage("Supabase is not connected. Check config.js and project status.");
 const email = $("#authEmail").value.trim(), password = $("#authPassword").value;
 const button = $("#authSubmit"); button.disabled = true; setAuthMessage("Please wait…");
 try {
   if (authMode === "signup") {
     const {data, error} = await supabaseClient.auth.signUp({email, password, options:{data:{full_name:$("#authName").value.trim()}}});
     if (error) throw error;
     setAuthMessage(data.session ? "Account created and signed in." : "Account created. Check your email to verify it, then sign in.");
     if (data.session) await refreshSession();
   } else {
     const {error} = await supabaseClient.auth.signInWithPassword({email, password});
     if (error) throw error;
     await refreshSession(); toast("Signed in successfully.");
   }
 } catch (error) { setAuthMessage(error.message || "Authentication failed."); }
 finally { button.disabled = false; }
}
async function submitOrder(event) {
 event.preventDefault();
 if (!supabaseClient) return $("#checkoutMessage").textContent = "Database is not connected. Please try again later.";
 if (!session) { closeModal("checkoutModal"); authMode = "signin"; await refreshSession(); openModal("authModal"); return setAuthMessage("Please sign in before placing an order."); }
 if (!cart.length) return $("#checkoutMessage").textContent = "Your bag is empty.";
 const button = $("#placeOrderButton"); button.disabled = true; $("#checkoutMessage").textContent = "Submitting secure order…";
 try {
   const payload = cart.map(item => ({product_id:item.id, quantity:item.qty}));
   const {data, error} = await supabaseClient.rpc("place_gadgets_order", {
     p_customer_name: $("#checkoutName").value.trim(),
     p_phone: $("#checkoutPhone").value.trim(),
     p_delivery_address: $("#checkoutAddress").value.trim(),
     p_items: payload
   });
   if (error) throw error;
   cart = []; persistCart(); closeModal("checkoutModal"); closeModal("authModal"); document.body.classList.remove("cart-open");
   $("#checkoutForm").reset(); toast("Order placed! Order ID: " + String(data).slice(0,8).toUpperCase());
   await loadProducts();
 } catch (error) { $("#checkoutMessage").textContent = error.message || "Could not place order."; }
 finally { button.disabled = false; }
}
document.addEventListener("click", async event => {
 const addButton = event.target.closest("[data-add]"); if (addButton) return add(addButton.dataset.add);
 const filterButton = event.target.closest("[data-filter]");
 if (filterButton) { event.preventDefault(); filter = filterButton.dataset.filter; renderProducts(); if (filterButton.closest(".filters") || filterButton.closest(".nav") || filterButton.closest(".categories")) $("#products").scrollIntoView({behavior:"smooth"}); return; }
 const qtyButton = event.target.closest("[data-qty]");
 if (qtyButton) { const item = cart.find(x => x.id === qtyButton.dataset.qty), p = getProduct(qtyButton.dataset.qty); if (!item || !p) return; item.qty += Number(qtyButton.dataset.d); if (item.qty < 1) cart = cart.filter(x => x.id !== qtyButton.dataset.qty); if (item.qty > p.stock) item.qty = p.stock; persistCart(); return; }
 const removeButton = event.target.closest("[data-remove]"); if (removeButton) { cart = cart.filter(x => x.id !== removeButton.dataset.remove); persistCart(); return; }
 const wish = event.target.closest("[data-wish]");
 if (wish) {
   if (!session) { authMode="signin"; await refreshSession(); openModal("authModal"); setAuthMessage("Sign in to save wishlist items."); return; }
   const {data: existing} = await supabaseClient.from("wishlists").select("product_id").eq("product_id", wish.dataset.wish).eq("user_id", session.user.id).maybeSingle();
   if (existing) { await supabaseClient.from("wishlists").delete().eq("product_id", wish.dataset.wish).eq("user_id", session.user.id); wish.textContent="♡"; toast("Removed from wishlist"); }
   else { const {error}=await supabaseClient.from("wishlists").insert({user_id:session.user.id,product_id:wish.dataset.wish}); if(error) toast(error.message); else {wish.textContent="♥";toast("Saved to wishlist");} }
   return;
 }
 const closeButton = event.target.closest("[data-close-modal]"); if (closeButton) closeModal(closeButton.dataset.closeModal);
 if (event.target.classList.contains("modal-backdrop")) closeModal(event.target.id);
});
$("#searchForm").addEventListener("submit", event => { event.preventDefault(); query = $("#search").value.trim(); renderProducts(); $("#products").scrollIntoView({behavior:"smooth"}); });
$("#search").addEventListener("input", event => { query = event.target.value.trim(); renderProducts(); });
$("#openCart").onclick = () => document.body.classList.add("cart-open");
$("#closeCart").onclick = () => document.body.classList.remove("cart-open");
$("#backdrop").onclick = () => document.body.classList.remove("cart-open");
$("#account").onclick = async () => { authMode="signin"; await refreshSession(); openModal("authModal"); };
$("#authForm").addEventListener("submit", submitAuth);
$("#toggleAuthMode").onclick = async () => { authMode = authMode === "signin" ? "signup" : "signin"; await refreshSession(); setAuthMessage(""); };
$("#signOut").onclick = async () => { if (supabaseClient) await supabaseClient.auth.signOut(); session=null; profile=null; authMode="signin"; await refreshSession(); toast("Signed out."); };
$("#checkout").onclick = async () => {
 if (!cart.length) return toast("Your bag is empty.");
 if (cart.some(item => !getProduct(item.id) || String(item.id).startsWith("demo-"))) return toast("Live ordering is unavailable for preview-only products.");
 if (!session) { authMode="signin"; await refreshSession(); openModal("authModal"); setAuthMessage("Sign in to continue checkout."); return; }
 $("#checkoutName").value = profile?.full_name || "";
 const {data:profileRow} = await supabaseClient.from("profiles").select("full_name,phone,address").eq("id",session.user.id).maybeSingle();
 if(profileRow){$("#checkoutName").value=profileRow.full_name||$("#checkoutName").value;$("#checkoutPhone").value=profileRow.phone||"";$("#checkoutAddress").value=profileRow.address||"";}
 renderCart(); document.body.classList.remove("cart-open"); openModal("checkoutModal");
};
$("#checkoutForm").addEventListener("submit", submitOrder);
$("#newsletter").addEventListener("submit", async event => {
 event.preventDefault(); const email=$("#newsletterEmail").value.trim().toLowerCase();
 if(!supabaseClient){$("#newsMessage").textContent="Newsletter database is not connected.";return;}
 const {error}=await supabaseClient.from("newsletter_subscribers").insert({email});
 $("#newsMessage").textContent=error?(error.code==="23505"?"You’re already on the list.":error.message):"Thanks! You’re on the list.";
 if(!error)event.target.reset();
});
$("#year").textContent = new Date().getFullYear();
(async function init(){renderCart(); await loadProducts(); if(supabaseClient){await refreshSession();supabaseClient.auth.onAuthStateChange((_event,newSession)=>{session=newSession;setTimeout(()=>refreshSession(),0);});}})();
