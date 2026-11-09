// === Catégories ===
const categories = [
  { id: "directories", name: "Ressources & Annuaires", icon: "fa-solid fa-compass", color: "#00ffa3", colorLight: "#059669" },
  { id: "pdf", name: "PDF & Documents", icon: "fa-solid fa-file-pdf", color: "#4d9fff", colorLight: "#2563eb" },
  { id: "images", name: "Images & Photos", icon: "fa-solid fa-image", color: "#50e3a4", colorLight: "#0d9488" },
  { id: "bg-removal", name: "Suppression de fond", icon: "fa-solid fa-scissors", color: "#ff6b9d", colorLight: "#e11d48" },
  { id: "illustrations", name: "Illustrations & Vecteurs", icon: "fa-solid fa-palette", color: "#ffd93d", colorLight: "#d97706" },
  { id: "icons", name: "Icônes", icon: "fa-solid fa-star", color: "#ff9f43", colorLight: "#ea580c" },
  { id: "fonts", name: "Polices & Couleurs", icon: "fa-solid fa-font", color: "#a78bfa", colorLight: "#7c3aed" },
  { id: "design", name: "Design & Dessin", icon: "fa-solid fa-pen-nib", color: "#38d9d9", colorLight: "#0891b2" },
  { id: "presentations", name: "Présentations", icon: "fa-solid fa-chalkboard-user", color: "#f368e0", colorLight: "#c026d3" },
  { id: "media", name: "GIF & Médias", icon: "fa-solid fa-film", color: "#ee5a6f", colorLight: "#e11d48" },
  { id: "qr", name: "QR Codes", icon: "fa-solid fa-qrcode", color: "#10b981", colorLight: "#059669" },
  { id: "shopping", name: "Shopping & Comparateurs", icon: "fa-solid fa-bag-shopping", color: "#f59e0b", colorLight: "#d97706" },
  { id: "dev", name: "Dev & Utilitaires", icon: "fa-solid fa-terminal", color: "#6366f1", colorLight: "#4f46e5" }
];

// === Outils ===
const tools = [
  // Directories
  { name: "NoSignups", url: "https://nosignups.net/", category: "directories", icon: "fa-solid fa-compass", description: "Annuaire d'outils en ligne sans inscription requise." },
  { name: "FMHY", url: "https://fmhy.net/", category: "directories", icon: "fa-solid fa-list", description: "Free Media Heck Yeah — immense index de ressources gratuites." },
  { name: "AIXploria", url: "https://www.aixploria.com/", category: "directories", icon: "fa-solid fa-robot", description: "Annuaire complet des meilleures IA, classées par usage." },
  { name: "ResourceCards", url: "https://resourcecards.com/", category: "directories", icon: "fa-solid fa-layer-group", description: "Cartes de ressources design triées sur le volet." },
  { name: "Adobe Express", url: "https://express.adobe.com/fr-FR/sp/", category: "directories", icon: "fa-solid fa-wand-magic-sparkles", description: "Suite Adobe en ligne pour graphismes rapides. (& supp. d'arr. plans)" },

  // PDF
  { name: "SmallPDF", url: "https://smallpdf.com/fr/pdf-en-word", category: "pdf", icon: "fa-solid fa-file-word", description: "Conversion PDF vers Word rapide et soignée." },
  { name: "Sejda PDF Editor", url: "https://www.sejda.com/fr/pdf-editor", category: "pdf", icon: "fa-solid fa-file-pen", description: "Éditeur PDF en ligne : texte, images, signatures." },
  { name: "iLovePDF", url: "https://www.ilovepdf.com/fr", category: "pdf", icon: "fa-solid fa-file-circle-plus", description: "Boîte à outils PDF : fusion, compression, conversion." },
  { name: "PDF24", url: "https://tools.pdf24.org/fr/", category: "pdf", icon: "fa-solid fa-wrench", description: "Outils PDF gratuits et illimités, sans inscription." },

  // Images
  { name: "123RF", url: "https://fr.123rf.com/images-gratuites/", category: "images", icon: "fa-solid fa-image", description: "Banque d'images gratuites et libres de droits." },
  { name: "Pexels", url: "https://www.pexels.com/fr-fr/", category: "images", icon: "fa-solid fa-camera", description: "Photos et vidéos gratuites, haute qualité." },
  { name: "Pixabay", url: "https://pixabay.com/fr/", category: "images", icon: "fa-solid fa-circle-half-stroke", description: "Photos, illustrations et vidéos libres de droits." },
  { name: "PNGTree", url: "https://fr.pngtree.com/free-png", category: "images", icon: "fa-solid fa-image", description: "PNG transparents gratuits pour vos compositions." },
  { name: "FreePNG", url: "https://www.freepng.fr/", category: "images", icon: "fa-solid fa-image", description: "PNG transparents en français, facile à trouver." },
  { name: "Unsplash", url: "https://unsplash.com/", category: "images", icon: "fa-solid fa-camera-retro", description: "Photographies pro gratuites — les meilleures du web." },
  { name: "StockSnap", url: "https://stocksnap.io/", category: "images", icon: "fa-solid fa-image", description: "Photos haute résolution libres, mises à jour souvent." },

  // BG removal
  { name: "Unscreen", url: "https://www.unscreen.com/", category: "bg-removal", icon: "fa-solid fa-film", description: "Suppression de fond pour vidéos et GIFs, automatique." },
  { name: "ZMO AI Remover", url: "https://remover.zmo.ai/", category: "bg-removal", icon: "fa-solid fa-eraser", description: "Suppression d'arrière-plan et d'objets par IA." },
  { name: "Remove.bg", url: "https://www.remove.bg/fr/upload", category: "bg-removal", icon: "fa-solid fa-scissors", description: "Le classique pour supprimer un fond en 5 secondes." },
  { name: "Pixlr Remove BG", url: "https://pixlr.com/fr/remove-background/", category: "bg-removal", icon: "fa-solid fa-wand-magic-sparkles", description: "Suppression de fond intégrée à l'écosystème Pixlr." },

  // Illustrations
  { name: "unDraw", url: "https://undraw.co/illustrations", category: "illustrations", icon: "fa-solid fa-palette", description: "Illustrations open-source, customisables en couleur." },
  { name: "Vexels", url: "https://www.vexels.com/", category: "illustrations", icon: "fa-solid fa-shapes", description: "Vecteurs, illustrations et templates graphiques." },
  { name: "Blush Design", url: "https://blush.design/", category: "illustrations", icon: "fa-solid fa-paintbrush", description: "Créez et personnalisez des illustrations en un clic." },
  { name: "Storyset", url: "https://storyset.com/", category: "illustrations", icon: "fa-solid fa-wand-sparkles", description: "Illustrations animées et customisables gratuitement." },
  { name: "Humaaans", url: "https://www.humaaans.com/", category: "illustrations", icon: "fa-solid fa-users", description: "Personnages mix-and-match en SVG, superbes." },

  // Icons
  { name: "The Noun Project", url: "https://thenounproject.com/", category: "icons", icon: "fa-solid fa-square", description: "Millions d'icônes et pictogrammes." },
  { name: "Material Icons", url: "https://fonts.google.com/icons", category: "icons", icon: "fa-solid fa-star", description: "Icônes Material Design de Google, ouvertes." },
  { name: "Flaticon", url: "https://www.flaticon.com/", category: "icons", icon: "fa-solid fa-bookmark", description: "La plus grande base d'icônes vectorielles." },
  { name: "Heroicons", url: "https://heroicons.com/", category: "icons", icon: "fa-solid fa-shield-halved", description: "Icônes SVG par les créateurs de Tailwind CSS." },
  { name: "Lucide", url: "https://lucide.dev/", category: "icons", icon: "fa-solid fa-feather", description: "Icônes open-source élégantes et cohérentes." },
  { name: "Tabler Icons", url: "https://tabler.io/icons", category: "icons", icon: "fa-solid fa-circle", description: "Plus de 4000 icônes SVG gratuites." },
  { name: "Iconify", url: "https://iconify.design/", category: "icons", icon: "fa-solid fa-table-cells", description: "200 000+ icônes de toutes les bibliothèques." },

  // Fonts & Couleurs
  { name: "Font Squirrel", url: "https://www.fontsquirrel.com/", category: "fonts", icon: "fa-solid fa-font", description: "Polices commerciales gratuites, sélection rigoureuse." },
  { name: "Google Fonts", url: "https://fonts.google.com/", category: "fonts", icon: "fa-solid fa-text-height", description: "La référence des polices web gratuites." },
  { name: "Fontshare", url: "https://www.fontshare.com/", category: "fonts", icon: "fa-solid fa-paragraph", description: "Polices gratuites par Indian Type Foundry." },

  // Design & Drawing
  { name: "Method Draw", url: "https://editor.method.ac/", category: "design", icon: "fa-solid fa-pen-nib", description: "Éditeur SVG en ligne simple et efficace." },
  { name: "Boxy SVG", url: "https://boxy-svg.com/", category: "design", icon: "fa-solid fa-vector-square", description: "Éditeur SVG moderne avec interface soignée." },
  { name: "Photopea", url: "https://www.photopea.com/", category: "design", icon: "fa-solid fa-image", description: "Éditeur d'images type Photoshop gratuit en ligne." },
  { name: "SVGOMG", url: "https://jakearchibald.github.io/svgomg/", category: "design", icon: "fa-solid fa-compress", description: "Optimiseur SVG en ligne, par Jake Archibald." },

  // Presentations
  { name: "Genial.ly", url: "https://genial.ly/fr/", category: "presentations", icon: "fa-solid fa-chalkboard-user", description: "Création de contenus interactifs et présentations." },
  { name: "Slidesgo", url: "https://slidesgo.com/", category: "presentations", icon: "fa-solid fa-desktop", description: "Templates pour PowerPoint et Google Slides." },

  // Media
  { name: "TweenFrame GIF", url: "https://tweenframe.com/gif-compressor", category: "media", icon: "fa-solid fa-film", description: "Compression de GIFs animés sans perte visible." },
  { name: "EZGIF", url: "https://ezgif.com/", category: "media", icon: "fa-solid fa-film", description: "Suite complète d'outils pour GIFs." },
  { name: "Squoosh", url: "https://squoosh.app/", category: "media", icon: "fa-solid fa-file-arrow-down", description: "Compression d'images par Google, comparaison live." },
  { name: "TinyPNG", url: "https://tinypng.com/", category: "media", icon: "fa-solid fa-file-image", description: "Compression PNG/JPEG intelligente, le standard." },

  // QR
  { name: "QR Code Monkey", url: "https://www.qrcode-monkey.com/fr/#", category: "qr", icon: "fa-solid fa-qrcode", description: "Générateur de QR codes personnalisés, illimité." },

  // Shopping
  { name: "Idealo", url: "https://www.idealo.fr/", category: "shopping", icon: "fa-solid fa-bag-shopping", description: "Comparateur de prix pour trouver les meilleures offres." },
  { name: "Dupe", url: "https://dupe.com/", category: "shopping", icon: "fa-solid fa-copy", description: "Trouvez des alternatives moins chères à vos produits." }
];

// === State ===
let activeCategory = "all";
let searchQuery = "";
let favorites = [];

// Sécurisation du localStorage pour éviter tout crash sur les fichiers locaux
try {
  favorites = JSON.parse(localStorage.getItem("toolhub-favs") || "[]");
} catch(e) {
  favorites = [];
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// === Init ===
function init(){
  renderSidebar();
  renderMobileCats();
  renderStats();
  renderGrid();
  bindEvents();
}

function renderSidebar(){
  const sidebar = $("#sidebar");
  sidebar.innerHTML = "";
  sidebar.appendChild(createCatBtn({ id: "all", name: "Tous les outils", icon: "fa-solid fa-table-cells-large", color: "var(--accent)", colorLight: "var(--accent)" }, tools.length, true));
  categories.forEach(cat => {
    const count = tools.filter(t => t.category === cat.id).length;
    sidebar.appendChild(createCatBtn(cat, count));
  });
  const sep = document.createElement("div");
  sep.style.cssText = "height:1px;background:var(--border);margin:8px 0";
  sidebar.appendChild(sep);
  sidebar.appendChild(createCatBtn({ id: "favorites", name: "Favoris", icon: "fa-solid fa-star", color: "var(--accent-2)", colorLight: "var(--accent-2)" }, favorites.length));
}

function createCatBtn(cat, count, active=false){
  const btn = document.createElement("button");
  btn.className = "cat-btn" + (active ? " active" : "");
  btn.dataset.cat = cat.id;
  btn.style.setProperty("--cat-color", cat.color);
  if (cat.colorLight) {
    btn.style.setProperty("--cat-color-light", cat.colorLight);
  }
  btn.innerHTML = `
    <div class="cat-icon">
      <i class="${cat.icon}"></i>
    </div>
    <span>${cat.name}</span>
    <span class="cat-count">${count}</span>
  `;
  btn.addEventListener("click", () => selectCategory(cat.id));
  return btn;
}

function renderMobileCats(){
  const container = $("#mobile-cats");
  container.innerHTML = "";
  container.appendChild(createCatBtn({ id: "all", name: "Tous", icon: "fa-solid fa-table-cells-large", color: "var(--accent)", colorLight: "var(--accent)" }, tools.length, true));
  categories.forEach(cat => {
    const count = tools.filter(t => t.category === cat.id).length;
    container.appendChild(createCatBtn(cat, count));
  });
  container.appendChild(createCatBtn({ id: "favorites", name: "Favoris", icon: "fa-solid fa-star", color: "var(--accent-2)", colorLight: "var(--accent-2)" }, favorites.length));
}

function selectCategory(catId){
  activeCategory = catId;
  $$(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === catId));
  const title = $("#grid-title");
  if (catId === "all") title.textContent = "Tous les outils";
  else if (catId === "favorites") title.textContent = "Mes favoris";
  else {
    const cat = categories.find(c => c.id === catId);
    title.textContent = cat ? cat.name : "Tous les outils";
  }
  renderGrid();
  if (window.innerWidth <= 980) {
    const activeBtn = document.querySelector(`.mobile-cats .cat-btn[data-cat="${catId}"]`);
    if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function renderGrid(){
  const grid = $("#grid");
  const favSection = $("#favorites-section");
  const favGrid = $("#favorites-grid");

  let filtered = tools;

  if (activeCategory === "favorites") {
    filtered = tools.filter(t => favorites.includes(t.url));
    favSection.style.display = "none";
  } else {
    if (activeCategory !== "all") {
      filtered = tools.filter(t => t.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q) ||
        (categories.find(c => c.id === t.category) ? categories.find(c => c.id === t.category).name.toLowerCase().includes(q) : false)
      );
    }
    if (favorites.length > 0 && activeCategory === "all" && !searchQuery) {
      favSection.style.display = "block";
      const favs = tools.filter(t => favorites.includes(t.url));
      favGrid.innerHTML = "";
      favs.forEach((t, i) => favGrid.appendChild(createCard(t, i)));
      $("#fav-count").textContent = favs.length;
    } else {
      favSection.style.display = "none";
    }
  }

  grid.innerHTML = "";
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-magnifying-glass-minus"></i>
        <h3>Aucun outil trouvé</h3>
        <p>Essayez une autre recherche ou catégorie.</p>
      </div>
    `;
  } else {
    filtered.forEach((t, i) => grid.appendChild(createCard(t, i)));
  }

  $("#grid-count").textContent = filtered.length;
  $("#stat-favs").textContent = favorites.length;
  $$('.cat-btn[data-cat="favorites"] .cat-count').forEach(el => el.textContent = favorites.length);
}

function createCard(tool, index){
  const cat = categories.find(c => c.id === tool.category);
  const card = document.createElement("div");
  card.className = "card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", tool.name);
  card.dataset.cat = tool.category;
  card.style.animationDelay = `${Math.min(index * 0.015, 0.2)}s`;
  card.style.setProperty("--cat-color", cat ? cat.color : "var(--accent)");
  if (cat && cat.colorLight) {
    card.style.setProperty("--cat-color-light", cat.colorLight);
  }

  const isFav = favorites.includes(tool.url);
  let hostname = tool.url;
  try { hostname = new URL(tool.url).hostname.replace("www.", ""); } catch(e){}

  card.innerHTML = `
    <div class="card-head">
      <div class="card-icon">
        <i class="${tool.icon}"></i>
      </div>
      <button class="card-fav ${isFav ? "active" : ""}" aria-label="Ajouter aux favoris">
        <i class="fa-solid fa-star"></i>
      </button>
    </div>
    <div class="card-name">${tool.name}</div>
    <div class="card-desc">${tool.description}</div>
    <div class="card-url">
      <i class="fa-solid fa-arrow-up-right-from-square"></i>
      ${hostname}
    </div>
  `;

  const favBtn = card.querySelector(".card-fav");
  favBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(tool.url, favBtn);
  });

  const openTool = (e) => {
    if (e.target.closest(".card-fav")) return;
    showToast(tool.name, tool.url);
    window.open(tool.url, "_blank", "noopener,noreferrer");
  };

  card.addEventListener("click", openTool);
  card.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".card-fav")) {
      e.preventDefault();
      openTool(e);
    }
  });

  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mx", x + "%");
    card.style.setProperty("--my", y + "%");
  });

  return card;
}

function toggleFav(url, btn){
  if (favorites.includes(url)) {
    favorites = favorites.filter(f => f !== url);
    btn.classList.remove("active");
  } else {
    favorites.push(url);
    btn.classList.add("active");
    btn.style.transform = "scale(1.25) rotate(15deg)";
    setTimeout(() => btn.style.transform = "", 250);
  }
  try {
    localStorage.setItem("toolhub-favs", JSON.stringify(favorites));
  } catch(e) {}
  renderGrid();
}

function showToast(name, url){
  const toast = document.createElement("div");
  toast.className = "toast";
  let hostname = url;
  try { hostname = new URL(url).hostname.replace("www.", ""); } catch(e){}
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
    <div>
      <div style="font-weight:600">Ouverture de ${name}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${hostname}</div>
    </div>
  `;
  $("#toast-wrap").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function renderStats(){
  $("#stat-tools").textContent = tools.length;
  $("#stat-cats").textContent = categories.length;
  $("#stat-favs").textContent = favorites.length;
}

function bindEvents(){
  const onSearch = (e) => {
    searchQuery = e.target.value;
    $("#search").value = searchQuery;
    $("#search-mobile").value = searchQuery;
    renderGrid();
  };
  $("#search").addEventListener("input", onSearch);
  $("#search-mobile").addEventListener("input", onSearch);

  $("#theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    const iconEl = $("#theme-toggle i");
    iconEl.className = next === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", next === "light" ? "#f8fafc" : "#07070d");
    try {
      localStorage.setItem("toolhub-theme", next);
    } catch(e) {}
  });

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const savedTheme = urlParams.get('theme') || localStorage.getItem("toolhub-theme");
    if (savedTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      $("#theme-toggle i").className = "fa-solid fa-sun";
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute("content", "#f8fafc");
    }
  } catch(e) {}

  const randBtn = $("#random-btn");
  if (randBtn) {
    randBtn.addEventListener("click", () => {
      const t = tools[Math.floor(Math.random() * tools.length)];
      showToast(t.name, t.url);
      window.open(t.url, "_blank", "noopener");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
      e.preventDefault();
      $("#search").focus();
    }
    if (e.key === "Escape") {
      if (searchQuery) {
        searchQuery = "";
        $("#search").value = "";
        $("#search-mobile").value = "";
        renderGrid();
      } else if (document.activeElement.tagName === "INPUT") {
        document.activeElement.blur();
      }
    }
  });
}

init();

// Désenregistrement de tout ancien Service Worker PWA s'il existait
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) r.unregister();
  }).catch(() => {});
}
