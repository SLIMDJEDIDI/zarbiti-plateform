// Base shared utilities for authentication, navigation and session handling
const DEMO_USERS = [
  { username: "admin", password: "1234", name: "Administrateur", role: "admin" },
  { username: "vente", password: "1234", name: "Vente", role: "vente" },
  { username: "confirmation", password: "1234", name: "Confirmation", role: "confirmation" },
  { username: "usine", password: "1234", name: "Production", role: "usine" },
  { username: "livraison", password: "1234", name: "Livraison", role: "livraison" },
  { username: "compta", password: "1234", name: "Comptabilité", role: "compta" }
];

const NAV_LINKS = {
  admin: [
    { url: "orders.html", txt: "Commandes" },
    { url: "production.html", txt: "Production" },
    { url: "parcels.html", txt: "Livraisons/Colis" },
    { url: "payments.html", txt: "Paiements & Crédits" },
    { url: "users.html", txt: "Utilisateurs" }
  ],
  vente: [
    { url: "orders.html", txt: "Commandes" }
  ],
  confirmation: [
    { url: "orders.html", txt: "Commandes" }
  ],
  usine: [
    { url: "production.html", txt:"Production" }
  ],
  livraison: [
    { url: "parcels.html", txt:"Livraisons/Colis" }
  ],
  compta: [
    { url: "payments.html", txt:"Paiements & Crédits" }
  ]
};

function formatRole(role){
  if(!role) return "";
  return role.charAt(0).toUpperCase()+role.slice(1);
}

function getSessionUser(){
  const raw = localStorage.getItem("zarbiti_user");
  if(!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function persistSession(user){
  localStorage.setItem("zarbiti_user", JSON.stringify(user));
}

function clearSession(){
  localStorage.removeItem("zarbiti_user");
  localStorage.removeItem("post_login_redirect");
}

function logout(){
  clearSession();
  window.location.href = "index.html";
}
window.logout = logout;

function renderNav(user, listElement){
  if(!listElement || !user) return;
  const links = [{ url: "index.html", txt: "Accueil" }, ...(NAV_LINKS[user.role] || [])];
  listElement.innerHTML = links.map(l => `<li><a href="${l.url}">${l.txt}</a></li>`).join("");
}

function applyRoleBadge(el, role){
  if(el) el.innerText = formatRole(role);
}

function requireAuth(allowedRoles = [], redirectTarget){
  const user = getSessionUser();
  if(user && (allowedRoles.length === 0 || allowedRoles.includes(user.role))){
    return user;
  }
  const target = redirectTarget || window.location.pathname.split('/').pop();
  localStorage.setItem('post_login_redirect', target);
  window.location.href = `index.html?redirect=${encodeURIComponent(target)}`;
  return null;
}

function handlePostLoginRedirect(){
  const params = new URLSearchParams(window.location.search);
  const paramTarget = params.get('redirect');
  const storedTarget = localStorage.getItem('post_login_redirect');
  const target = storedTarget || paramTarget;
  if(target){
    localStorage.removeItem('post_login_redirect');
    window.location.href = target;
    return true;
  }
  return false;
}

function initLoginPage(){
  const savedUser = getSessionUser();
  const loginBox = document.querySelector('.login-container');
  const mainMenu = document.getElementById('mainMenu');
  const errorBox = document.getElementById('loginError');
  const navList = document.getElementById('navLinks');
  const roleBadge = document.getElementById('userRole');
  const nameHolder = document.getElementById('userName');

  function showMenu(user){
    if(loginBox) loginBox.classList.add('hidden');
    if(mainMenu) mainMenu.classList.remove('hidden');
    if(nameHolder) nameHolder.innerText = user.name;
    applyRoleBadge(roleBadge, user.role);
    renderNav(user, navList);
  }

  const form = document.getElementById('loginForm');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const user = DEMO_USERS.find(u=>u.username===username && u.password===password);
      if(!user){
        if(errorBox) errorBox.innerText = "Identifiant ou mot de passe incorrect.";
        return;
      }
      persistSession(user);
      if(errorBox) errorBox.innerText = "";
      if(!handlePostLoginRedirect()){
        showMenu(user);
      }
    });
  }

  if(savedUser){
    showMenu(savedUser);
    handlePostLoginRedirect();
  }
}

function initProtectedPage(requiredRoles, roleBadgeEl, navListEl){
  const user = requireAuth(requiredRoles);
  if(!user) return;
  const locked = document.getElementById('locked');
  const content = document.getElementById('pageContent');
  if(locked) locked.classList.add('hidden');
  if(content) content.classList.remove('hidden');
  applyRoleBadge(roleBadgeEl, user.role);
  renderNav(user, navListEl);
}

function initPage(){
  document.addEventListener('DOMContentLoaded', ()=>{
    if(document.getElementById('loginForm')){
      initLoginPage();
    }
  });
}

initPage();
