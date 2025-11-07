const KEY = "rt.items";
const LOGIN = "rt.loggedIn";

const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(items) { localStorage.setItem(KEY, JSON.stringify(items)); }
function loggedIn() { return localStorage.getItem(LOGIN) === "1"; }
function setLoggedIn(v) { localStorage.setItem(LOGIN, v ? "1" : "0"); }

function makeId() { return "r" + Date.now(); }
function escapeHtml(s) {
  return String(s).replace(/[&<>\"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
}

let items = load();
let filterMode = "all"; // or "faves"

// Routing
const pages = {
  login: $("#page-login"),
  home: $("#page-home"),
  add: $("#page-add"),
  details: $("#page-details"),
  faves: $("#page-faves"),
  help: $("#page-help")
};

function show(route) {
  Object.values(pages).forEach(p => p.classList.remove("active"));
  const p = pages[route] || pages.login;
  p.classList.add("active");

  // nav visibility
  $("#sideNav").style.display = route === "login" ? "none" : "flex";

  // page-specific refresh
  if (route === "home") renderList();
  if (route === "faves") renderFaves();
  if (route === "details") populateDetailSelect();
}

function goto(route) {
  location.hash = route;
}

window.addEventListener("hashchange", () => {
  const route = location.hash.replace("#","") || (loggedIn() ? "home" : "login");
  if (!loggedIn() && route !== "login") return show("login");
  show(route);
});

// Top nav and sidenav links
$("#menuBtn").addEventListener("click", () => {
  const s = $("#sideNav");
  s.style.display = (s.style.display === "flex" ? "none" : "flex");
});
$$(".sidenav .navlink").forEach(btn => {
  const r = btn.dataset.route;
  if (r) btn.addEventListener("click", () => goto(r));
});

$("#logoutBtn").addEventListener("click", () => {
  setLoggedIn(false);
  goto("login");
});

// Login
$("#loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  // simple demo login
  setLoggedIn(true);
  goto("home");
});

// Home / List 
const listEl = $("#list");

function renderList() {
  const q = $("#search").value.toLowerCase().trim();
  const dataBase = filterMode === "all" ? items : items.filter(x => x.fav);
  const data = dataBase.filter(r =>
    !q ||
    r.name.toLowerCase().includes(q) ||
    (r.category||"").toLowerCase().includes(q) ||
    (r.notes||"").toLowerCase().includes(q)
  );

  listEl.innerHTML = data.map(r => `
    <li class="item" data-id="${r.id}">
      <div>
        <button class="name-link" data-open="${r.id}"><strong>${escapeHtml(r.name)}</strong></button>
        <div class="meta">${escapeHtml(r.location || "—")} • ${escapeHtml(r.category || "—")} • ⭐ ${r.rating || "—"} • ${r.visited ? "Visited" : "Not visited"}</div>
      </div>
      <button class="star" title="${r.fav ? "Unfavourite" : "Favourite"}">${r.fav ? "⭐" : "☆"}</button>
      <button class="secondary edit">Edit</button>
    </li>
  `).join("");

  // name click opens details
  $$("#list [data-open]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.dataset.open;
      const it = items.find(x => x.id === id);
      if (it) openDetails(it.id);
    });
  });
}

$("#search").addEventListener("input", renderList);
$("#showAll").addEventListener("click", () => { filterMode = "all"; renderList(); });
$("#showFaves").addEventListener("click", () => { filterMode = "faves"; renderList(); });

listEl.addEventListener("click", (e) => {
  const li = e.target.closest(".item");
  if (!li) return;
  const id = li.dataset.id;
  const it = items.find(x => x.id === id);
  if (!it) return;

  if (e.target.classList.contains("star")) {
    const wasFav = it.fav;
    it.fav = !it.fav;
    save(items);
    renderList();
    if (!confirm(it.fav ? "Favourited. Keep it?" : "Removed from favourites. Keep that?")) {
      it.fav = wasFav;
      save(items);
      renderList();
    }
  }
  if (e.target.classList.contains("edit")) {
    const newName = prompt("Edit name:", it.name);
    if (newName === null) return;
    const newCategory = prompt("Edit category:", it.category || "");
    if (newCategory === null) return;
    const newRating = Number(prompt("Edit rating (1–5):", it.rating || 5));
    if (!Number.isFinite(newRating) || newRating < 1 || newRating > 5) {
      alert("Please enter a number from 1 to 5.");
      return;
    }
    const newNotes = prompt("Edit notes:", it.notes || "");
    if (newNotes === null) return;
    it.name = newName.trim() || it.name;
    it.category = newCategory.trim();
    it.rating = newRating;
    it.notes = newNotes.trim();
    save(items);
    renderList();
  }
});

// Add 
$("#addForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#name").value.trim();
  const location = $("#location").value.trim();
  const category = $("#category").value.trim();
  const rating = Number($("#rating").value);
  const notes = $("#notes").value.trim();
  const visited = $("#visited").checked;
  const fav = $("#favOnAdd").checked;

  if (!name) { alert("Please enter a name."); return; }

  items.push({ id: makeId(), name, location, category, rating, notes, visited, fav });
  save(items);
  e.target.reset();
  $("#rating").value = 5;
  goto("home");
});

// Details 
function populateDetailSelect() {
  const sel = $("#detailSelect");
  sel.innerHTML = items.length
    ? items.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join("")
    : `<option value="">(no restaurants yet)</option>`;

  if (items.length) openDetails(sel.value);
  sel.onchange = () => openDetails(sel.value);
}

function openDetails(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;

  // select correct option
  const sel = $("#detailSelect");
  if (sel && sel.value !== id) sel.value = id;

  $("#dLocation").value = it.location || "";
  $("#dRating").value = it.rating ?? "";
  $("#dVisited").checked = !!it.visited;
  $("#dFav").checked = !!it.fav;
  $("#dNotes").value = it.notes || "";
  goto("details");
}

$("#saveDetails").addEventListener("click", () => {
  const id = $("#detailSelect").value;
  const it = items.find(x => x.id === id);
  if (!it) return;
  it.location = $("#dLocation").value.trim();
  it.rating = Number($("#dRating").value) || it.rating || 1;
  it.visited = $("#dVisited").checked;
  it.fav = $("#dFav").checked;
  it.notes = $("#dNotes").value.trim();
  save(items);
  alert("Saved.");
  renderList();
});

$("#deleteDetails").addEventListener("click", () => {
  const id = $("#detailSelect").value;
  if (!id) return;
  if (!confirm("Delete this restaurant?")) return;
  items = items.filter(x => x.id !== id);
  save(items);
  populateDetailSelect();
  renderList();
});

// Favourites 
const faveListEl = $("#faveList");
function renderFaves() {
  const favs = items.filter(x => x.fav);
  faveListEl.innerHTML = favs.map(r => `
    <li class="item" data-id="${r.id}">
      <div>
        <strong>${escapeHtml(r.name)}</strong>
        <div class="meta">${escapeHtml(r.location || "—")} • ${escapeHtml(r.category || "—")} • ⭐ ${r.rating || "—"}</div>
      </div>
      <button class="star">⭐</button>
      <button class="secondary" data-open="${r.id}">Edit</button>
    </li>
  `).join("");
  // open details from button
  $$("#faveList [data-open]").forEach(b => b.addEventListener("click", () => openDetails(b.dataset.open)));
}

// Initial route
if (!loggedIn()) {
  show("login");
} else {
  const route = location.hash.replace("#","") || "home";
  show(route);
}