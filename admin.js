const CFG=window.GADGETS_BD_CONFIG||{};
const sb=window.supabase&&CFG.supabaseUrl&&CFG.supabaseAnonKey?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey):null;
const $=s=>document.querySelector(s),money=n=>"৳"+Number(n||0).toLocaleString("en-BD");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let products=[],orders=[],categories=[],session=null;
function msg(id,text){$(id).textContent=text||""}
function notify(text){$("#toast").textContent=text;$("#toast").classList.add("show");clearTimeout(notify.t);notify.t=setTimeout(()=>$("#toast").classList.remove("show"),2500)}
async function start(){
 if(!sb){$("#adminIdentity").textContent="Supabase not configured";msg("#adminLoginMessage","Set the project URL and publishable key in config.js.");return;}
 const {data}=await sb.auth.getSession();session=data.session;
 if(session)await verifyAdmin();
 sb.auth.onAuthStateChange((_event,s)=>{session=s;setTimeout(()=>s?verifyAdmin():showLogin("Please sign in."),0)});
}
async function verifyAdmin(){
 if(!session){showLogin("Please sign in.");return;}
 const {data:userData}=await sb.auth.getUser();const user=userData.user;
 const {data:role,error}=await sb.from("admin_users").select("role").eq("user_id",user.id).maybeSingle();
 if(error||!role){$("#adminIdentity").textContent=user.email||"Signed in";$("#adminLoginPanel").hidden=false;$("#adminDashboard").hidden=true;$("#adminSignOut").hidden=false;msg("#adminLoginMessage","This account does not have an admin role. Ask the project owner to assign the owner/admin role in Supabase.");return;}
 $("#adminIdentity").textContent=(user.email||"Admin")+" · "+role.role;
 $("#adminLoginPanel").hidden=true;$("#adminDashboard").hidden=false;$("#adminSignOut").hidden=false;
 await Promise.all([loadCategories(),loadProducts(),loadOrders()]);
}
function showLogin(text){$("#adminIdentity").textContent="Not signed in";$("#adminLoginPanel").hidden=false;$("#adminDashboard").hidden=true;$("#adminSignOut").hidden=true;msg("#adminLoginMessage",text)}
$("#adminLogin").addEventListener("submit",async e=>{e.preventDefault();if(!sb)return;const b=e.submitter;b.disabled=true;msg("#adminLoginMessage","Signing in…");const {error}=await sb.auth.signInWithPassword({email:$("#adminEmail").value.trim(),password:$("#adminPassword").value});b.disabled=false;if(error)msg("#adminLoginMessage",error.message);else{msg("#adminLoginMessage","Signed in; checking admin permissions…");const {data}=await sb.auth.getSession();session=data.session;await verifyAdmin();}});
$("#adminSignOut").onclick=async()=>{if(sb)await sb.auth.signOut();session=null;showLogin("Signed out.");};
async function loadCategories(){const {data,error}=await sb.from("categories").select("id,name,slug").order("name");if(error)throw error;categories=data||[];}
async function loadProducts(){
 const {data,error}=await sb.from("products").select("id,name,slug,brand,category_id,price,compare_at_price,stock,image_url,description,is_active,is_featured,categories(name,slug)").order("created_at",{ascending:false});
 if(error){msg("#productMessage",error.message);return;}
 products=data||[];$("#statProducts").textContent=products.length;
 $("#productsTable").innerHTML=products.map(p=>`<tr><td><strong>${esc(p.name)}</strong><br><small>${esc(p.brand)}</small></td><td>${esc(p.categories?.name||"—")}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.is_active?"Active":"Hidden"}</td><td><div class="admin-actions"><button data-edit-product="${p.id}">Edit</button><button data-toggle-product="${p.id}">${p.is_active?"Hide":"Publish"}</button></div></td></tr>`).join("");
}
async function loadOrders(){
 const {data,error}=await sb.from("orders").select("id,customer_name,phone,delivery_address,total,payment_method,payment_status,status,created_at").order("created_at",{ascending:false}).limit(100);
 if(error){msg("#ordersMessage",error.message);return;}
 orders=data||[];$("#statOrders").textContent=orders.length;$("#statPending").textContent=orders.filter(o=>o.status==="pending").length;
 const statuses=["pending","confirmed","processing","shipped","delivered","cancelled"];
 $("#ordersTable").innerHTML=orders.map(o=>`<tr><td><strong>${esc(o.id.slice(0,8).toUpperCase())}</strong><br><small>${new Date(o.created_at).toLocaleString()}</small></td><td>${esc(o.customer_name)}<br><small>${esc(o.phone)}<br>${esc(o.delivery_address)}</small></td><td>${money(o.total)}</td><td>${esc(o.payment_method)} / ${esc(o.payment_status)}</td><td>${esc(o.status)}</td><td><select data-order-status="${o.id}" aria-label="Order status">${statuses.map(s=>`<option value="${s}" ${o.status===s?"selected":""}>${s}</option>`).join("")}</select><button data-save-order="${o.id}">Save</button></td></tr>`).join("");
}
function resetProductForm(){ $("#productForm").reset();$("#productId").value="";$("#productStock").value="0";$("#productFormTitle").textContent="Add product";$("#saveProduct").textContent="Save product";msg("#productMessage","");}
$("#cancelEdit").onclick=resetProductForm;
$("#productForm").addEventListener("submit",async e=>{
 e.preventDefault();const button=$("#saveProduct");button.disabled=true;msg("#productMessage","Saving product…");
 try{
  const name=$("#productName").value.trim(),category=categories.find(c=>c.slug===$("#productCategory").value);
  if(!category)throw new Error("Choose a valid category.");
  const payload={name,slug:name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Math.random().toString(36).slice(2,6),brand:$("#productBrand").value.trim(),category_id:category.id,price:Number($("#productPrice").value),compare_at_price:$("#productCompare").value?Number($("#productCompare").value):null,stock:Number($("#productStock").value),image_url:$("#productImage").value.trim(),description:$("#productDescription").value.trim(),is_featured:$("#productFeatured").checked,is_active:true,updated_at:new Date().toISOString()};
  const id=$("#productId").value;let result;
  if(id){delete payload.slug;result=await sb.from("products").update(payload).eq("id",id);}
  else result=await sb.from("products").insert(payload);
  if(result.error)throw result.error;
  resetProductForm();await loadProducts();notify("Product saved.");
 }catch(error){msg("#productMessage",error.message||"Unable to save product.");}
 finally{button.disabled=false;}
});
document.addEventListener("click",async e=>{
 const edit=e.target.closest("[data-edit-product]");if(edit){const p=products.find(x=>x.id===edit.dataset.editProduct);if(!p)return;$("#productId").value=p.id;$("#productName").value=p.name;$("#productBrand").value=p.brand||"";$("#productCategory").value=p.categories?.slug||"";$("#productPrice").value=p.price;$("#productCompare").value=p.compare_at_price??"";$("#productStock").value=p.stock;$("#productImage").value=p.image_url||"";$("#productDescription").value=p.description||"";$("#productFeatured").checked=!!p.is_featured;$("#productFormTitle").textContent="Edit product";$("#saveProduct").textContent="Update product";window.scrollTo({top:$("#productForm").getBoundingClientRect().top+window.scrollY-80,behavior:"smooth"});return;}
 const toggle=e.target.closest("[data-toggle-product]");if(toggle){const p=products.find(x=>x.id===toggle.dataset.toggleProduct);if(!p)return;const {error}=await sb.from("products").update({is_active:!p.is_active,updated_at:new Date().toISOString()}).eq("id",p.id);if(error)notify(error.message);else{await loadProducts();notify(p.is_active?"Product hidden":"Product published");}return;}
 const saveOrder=e.target.closest("[data-save-order]");if(saveOrder){const id=saveOrder.dataset.saveOrder,status=$(`[data-order-status="${id}"]`).value;saveOrder.disabled=true;const {error}=await sb.from("orders").update({status}).eq("id",id);saveOrder.disabled=false;if(error)notify(error.message);else{await loadOrders();notify("Order status updated.");}}
});
start().catch(error=>{showLogin(error.message||"Unable to initialize admin panel.");});
