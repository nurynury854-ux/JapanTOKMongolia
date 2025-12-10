// script.js

// ------------------------------------------------------------
// Product normalization helpers
// ------------------------------------------------------------

// Google Sheet → published CSV URL
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvL5pvuXByZ-E3fzauAB2ah25rGMBOYPG4xae9z0TgwgS8NRv3b_hRxranQJwV5w/pub?gid=2145496180&single=true&output=csv";

// ID ranges → category name
const CATEGORY_RANGES = [
  { label: "5 бул", min: 1, max: 20 },
  { label: "3 бул", min: 21, max: 28 },
  { label: "Хагас гол", min: 29, max: 30 },
  { label: "Ком бул", min: 31, max: 34 },
  { label: "Гармушик резин", min: 35, max: 58 },
  { label: "Цап / шарик", min: 59, max: 109 },
  { label: "Амортизатор", min: 110, max: 135 },
  { label: "Шарнер", min: 136, max: 150 },
  { label: "Тяг", min: 151, max: 157 },
  { label: "Өндөг", min: 158, max: 168 },
  { label: "Босоо", min: 169, max: 177 },
  { label: "Рулийн аппарат", min: 178, max: 179 },
  { label: "Втульк", min: 180, max: 185 }
];

// Category → Image mapping
const CATEGORY_IMAGES = {
  "5 бул": "assets/parts/5bul.jpg",
  "3 бул": "assets/parts/3bul.jpg",
  "Ком бул": "assets/parts/kombul.jpg",
  "Гармошик резин": "assets/parts/garmoshka_rezin.jpg",

  "Амортизатор": "assets/parts/amortizator_urd.jpg",
  "Босоо": "assets/parts/bosoo.jpg",
  "Өндөг": "assets/parts/undgun_tulguur.jpg",
  "Тяг": "assets/parts/ruliin_tyg.jpg",
  "Шарнер": "assets/parts/ruliin_sharner.jpg",
  "Цап / шарик": "assets/parts/urd_tsaibnii_sharik.jpg",

  // categories you don't have a special photo for yet
  "Хагас гол": "assets/parts/5bul.jpg",
  "Рулийн аппарат": "assets/parts/5bul.jpg",
  "Втульк": "assets/parts/5bul.jpg",

  // fallback
  "Бусад": "assets/parts/5bul.jpg"
};

const BRAND_MODELS = {
  toyota: [
    { key: "prius", label: "Prius" },
    { key: "corolla axio", label: "Corolla Axio" },
    { key: "corolla fielder", label: "Corolla Fielder" },
    { key: "corolla", label: "Corolla (бусад)" },
    { key: "allion", label: "Allion" },
    { key: "premio", label: "Premio" },
    { key: "aqua", label: "Aqua" },
    { key: "belta", label: "Belta" },
    { key: "vitz", label: "Vitz" },
    { key: "yaris", label: "Yaris" },
    { key: "rav4", label: "RAV4" },
    { key: "probox", label: "Probox" },
    { key: "ist", label: "Ist" },
    { key: "kluger", label: "Kluger" },
    { key: "harrier", label: "Harrier" },
    { key: "alphard", label: "Alphard" },
    { key: "land cruiser 80", label: "Land Cruiser 80" },
    { key: "land cruiser 100", label: "Land Cruiser 100" },
    { key: "land105", label: "Land Cruiser 105" },
    { key: "land cruiser 200", label: "Land Cruiser 200" },
    { key: "prado", label: "Prado" },
    { key: "fj cruiser", label: "FJ Cruiser" },
    { key: "hilux", label: "Hilux" },
    { key: "camry", label: "Camry" }
  ],
  lexus: [
    { key: "es350", label: "ES350" },
    { key: "rx270", label: "RX270" },
    { key: "rx350", label: "RX350" },
    { key: "rx450", label: "RX450" },
    { key: "rx400", label: "RX400" },
    { key: "lx470", label: "LX470" },
    { key: "gx470", label: "GX470" },
    { key: "gx400", label: "GX400" },
    { key: "gx460", label: "GX460" }
  ],
  nissan: [
    { key: "x-trail", label: "X-TRAIL" },
    { key: "xtrail", label: "X-TRAIL (бусад бичиглэл)" },
    { key: "note", label: "Note" }
  ],
  subaru: [
    { key: "forester", label: "Forester" },
    { key: "outback", label: "Outback" }
  ],
  honda: [
    { key: "honda fit", label: "Fit" },
    { key: "fit", label: "Fit (other names)" }
  ],
  chevrolet: [
    { key: "chevrolet cruze", label: "Cruze" },
    { key: "chevrolet", label: "Chevrolet (all)" },
    { key: "cruze", label: "Cruze (other spelling)" }
  ]
};

const BRAND_LABELS = {
  all: "Бүх брэнд",
  toyota: "Toyota",
  lexus: "Lexus",
  nissan: "Nissan",
  subaru: "Subaru",
  honda: "Honda",
  chevrolet: "Chevrolet"
};

let products = [];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function cleanText(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (value == null) return null;
  // remove spaces thousands separators if any
  const normalized = value.toString().replace(/\s+/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function deriveCategory(id) {
  const numericId = Number(id);
  const found = CATEGORY_RANGES.find(
    (range) => numericId >= range.min && numericId <= range.max
  );
  return found ? found.label : "Бусад";
}

function derivePrice(item) {
  // 1) Prefer price_wholesale_with_vat from sheet
  const withVat = toNumber(item.price_wholesale_with_vat);
  if (withVat) return Math.round(withVat);

  // 2) Fallback: no_vat * 1.1
  const noVat = toNumber(item.price_wholesale_no_vat);
  if (noVat) return Math.round(noVat * 1.1);

  // 3) Fallback: if you ever use price_wholesale_sheet2
  const sheet = toNumber(item.price_wholesale_sheet2);
  if (sheet) return Math.round(sheet * 1.1);

  // 4) Last resort: price_retail if present
  const retail = toNumber(item.price_retail);
  if (retail) return Math.round(retail);

  return null;
}

function normalizeProduct(item) {
  const name = cleanText(item.title || "Сэлбэгийн нэр");
  const fit = cleanText(item.model_only) || name;

  return {
    id: Number(item.id) || 0,
    category: deriveCategory(item.id),
    name,
    fit,
    price: derivePrice(item),
    tok: cleanText(item.tok_code),
    oem: cleanText(item.oem)
  };
}

// ------------------------------------------------------------
// CSV parsing + loadProducts
// ------------------------------------------------------------

// Simple CSV parser that understands quotes, commas, newlines
function parseCSV(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      current.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (value !== "" || current.length) {
        current.push(value);
        rows.push(current);
        current = [];
        value = "";
      }
      if (c === "\r" && next === "\n") i++;
    } else {
      value += c;
    }
  }

  if (value !== "" || current.length) {
    current.push(value);
    rows.push(current);
  }

  return rows;
}

async function loadProducts() {
  const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Google Sheet CSV уншиж чадсангүй");

  const csvText = await response.text();
  const rows = parseCSV(csvText);
  if (!rows.length) return [];

  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  const rawItems = dataRows
    .filter((row) => row.some((cell) => (cell || "").trim() !== ""))
    .map((row) => {
      const obj = {};
      header.forEach((key, idx) => {
        if (!key) return;
        obj[key] = row[idx] ?? "";
      });
      return obj;
    });

  return rawItems
    .map(normalizeProduct)
    .filter((p) => {
      if (!p.id || p.id <= 0) return false;
      const name = (p.name || "").toLowerCase();
      if (name === "сэлбэгийн нэр") return false;
      if (name.startsWith("барааны нэр")) return false;
      return true;
    })
    .sort((a, b) => a.id - b.id);
}

// ------------------------------------------------------------
// Formatting & rendering
// ------------------------------------------------------------

function formatMNT(number) {
  if (!Number.isFinite(number)) return "";
  return number.toLocaleString("mn-MN") + " ₮";
}

function getProductImage(p) {
  const text = `${p.name} ${p.fit}`.toLowerCase();

  if (text.includes("3 бул")) return CATEGORY_IMAGES["3 бул"];
  if (text.includes("5 бул")) return CATEGORY_IMAGES["5 бул"];
  if (text.includes("ком бул")) return CATEGORY_IMAGES["Ком бул"];
  if (text.includes("амортизатор")) return CATEGORY_IMAGES["Амортизатор"];
  if (text.includes("гармош")) return CATEGORY_IMAGES["Гармошик резин"];
  if (text.includes("тяг")) return CATEGORY_IMAGES["Тяг"];
  if (text.includes("шарнер")) return CATEGORY_IMAGES["Шарнер"];
  if (text.includes("өндгөн") || text.includes("өндөг"))
    return CATEGORY_IMAGES["Өндөг"];
  if (text.includes("цап") || text.includes("шарик"))
    return CATEGORY_IMAGES["Цап / шарик"];
  if (text.includes("босоо")) return CATEGORY_IMAGES["Босоо"];

  return (
    CATEGORY_IMAGES[p.category] ||
    CATEGORY_IMAGES["Бусад"] ||
    "assets/parts/5bul.jpg"
  );
}

function renderCatalog(list, options = {}) {
  const catalog = document.getElementById("catalog");
  const countEl = document.getElementById("results-count");

  if (!catalog || !countEl) return;

  if (!list.length) {
    catalog.innerHTML = `<p class="muted">${
      options.emptyMessage ||
      "Таны хайсан шалгуурт тохирох бараа олдсонгүй."
    }</p>`;
    countEl.textContent = "0 бараа";
    return;
  }

  countEl.textContent = `${list.length} бараа`;

  catalog.innerHTML = list
    .map((p) => {
      const priceLabel = p.price ? formatMNT(p.price) : "Утсаар лавлана";

      const MAX_NAME = 60;
      const displayName =
        p.name.length > MAX_NAME
          ? p.name.slice(0, MAX_NAME).trim() + "..."
          : p.name;

      const oemText = p.oem
        ? `<span class="product-card__oem">OEM: ${p.oem}</span>`
        : "";

      const imgSrc = getProductImage(p);

      return `
        <article class="product-card">
          <div class="product-card__image">
            <img src="${imgSrc}"
                 alt="${displayName}"
                 style="width:100%;height:100%;object-fit:cover;">
          </div>

          <div class="product-card__body">
            <div class="product-card__top">
              <span class="product-card__brandline">JAPAN TOK · ${p.category}</span>
              <span class="product-card__id">№ ${p.id || "-"}</span>
            </div>

            <h3 class="product-card__name">${displayName}</h3>

            <div class="product-card__price">
              <div>
                <span class="label">НӨАТ-тай үнэ</span>
                <strong>${priceLabel}</strong>
              </div>
              ${oemText}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

// ------------------------------------------------------------
// Brand + model filter helpers
// ------------------------------------------------------------

function buildHaystackForProduct(p) {
  return [p.name, p.fit, p.category, p.tok, p.oem].join(" ").toLowerCase();
}

function productMatchesBrandAndModel(p, brand, modelKey) {
  const haystack = buildHaystackForProduct(p);

  if (brand === "all" && !modelKey) return true;

  const models = BRAND_MODELS[brand] || [];

  if (modelKey) {
    return haystack.includes(modelKey.toLowerCase());
  }

  if (brand !== "all" && models.length) {
    return models.some((m) => haystack.includes(m.key.toLowerCase()));
  }

  return true;
}

// ------------------------------------------------------------
// Filter + search logic
// ------------------------------------------------------------

function initProductCatalog() {
  const body = document.body;
  if (!body || body.dataset.page !== "products") return;

  const searchInput = document.getElementById("search");
  const categoryButtons = document.querySelectorAll(".category-btn");
  const countEl = document.getElementById("results-count");
  const catalog = document.getElementById("catalog");

  const brandTabs = document.querySelectorAll(".brand-tab");
  const modelMenu = document.getElementById("model-menu");
  const modelToggle = document.getElementById("model-toggle");

  let currentCategory = "all";
  let currentQuery = "";
  let currentBrand = "all";
  let currentModelKey = "";
  let hasDataLoaded = false;

  function applyFilters() {
    if (!hasDataLoaded) return;

    const q = currentQuery.trim().toLowerCase();

    const filtered = products.filter((p) => {
      if (!productMatchesBrandAndModel(p, currentBrand, currentModelKey))
        return false;

      const matchesCategory =
        currentCategory === "all" || p.category === currentCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      const haystack = buildHaystackForProduct(p);
      return haystack.includes(q);
    });

    renderCatalog(filtered);
  }

  function buildModelMenu(brand) {
    if (!modelMenu) return;
    const models = BRAND_MODELS[brand] || [];

    if (!models.length) {
      modelMenu.innerHTML =
        `<div class="model-menu__empty">Энэ брэндийн дэлгэрэнгүй жагсаалт удахгүй нэмэгдэнэ.</div>`;
      return;
    }

    modelMenu.innerHTML = models
      .map(
        (m) =>
          `<button class="model-btn" data-key="${m.key.toLowerCase()}">${m.label}</button>`
      )
      .join("");

    const modelButtons = modelMenu.querySelectorAll(".model-btn");
    modelButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        currentModelKey = btn.dataset.key || "";
        if (modelToggle) modelToggle.textContent = btn.textContent;
        modelMenu.classList.remove("open");
        applyFilters();
      });
    });
  }

  function setBrand(brand) {
    currentBrand = brand;
    currentModelKey = "";

    brandTabs.forEach((tab) => {
      const b = tab.dataset.brand || "all";
      tab.classList.toggle("active", b === brand);
    });

    if (modelToggle) {
      if (brand === "all") {
        modelToggle.disabled = true;
        modelToggle.textContent =
          "Машины марка (эхлээд брэндээ сонгоно уу)";
        if (modelMenu) modelMenu.innerHTML = "";
      } else {
        modelToggle.disabled = false;
        const label = BRAND_LABELS[brand] || "Брэнд";
        modelToggle.textContent = `${label} – модел сонгох`;
        buildModelMenu(brand);
      }
    }

    applyFilters();
  }

  if (modelToggle && modelMenu) {
    modelToggle.addEventListener("click", () => {
      if (modelToggle.disabled) return;
      modelMenu.classList.toggle("open");
    });

    document.addEventListener("click", (evt) => {
      if (!modelMenu.classList.contains("open")) return;
      const target = evt.target;
      if (!modelMenu.contains(target) && target !== modelToggle) {
        modelMenu.classList.remove("open");
      }
    });
  }

  brandTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const b = tab.dataset.brand || "all";
      setBrand(b);
    });
  });

  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category || "all";
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentQuery = searchInput.value;
      applyFilters();
    });
  }

  if (catalog) {
    catalog.innerHTML = `<p class="muted">Каталог ачаалж байна...</p>`;
  }
  if (countEl) countEl.textContent = "Ачаалж байна...";

  loadProducts()
    .then((loaded) => {
      products = loaded;
      hasDataLoaded = true;
      setBrand("all");
      applyFilters();
    })
    .catch((err) => {
      console.error(err);
      hasDataLoaded = false;
      renderCatalog([], {
        emptyMessage:
          "Каталогыг ачаалж чадсангүй. Google Sheet / CSV тохиргоог шалгана уу."
      });
    });
}

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  initProductCatalog();
  initMobileNav();
  initChatbotToggle();

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});

// ------------------------------------------------------------
// Mobile nav toggle
// ------------------------------------------------------------

function initMobileNav() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  const links = nav.querySelectorAll("a");

  function setOpen(open) {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    const shouldOpen = !nav.classList.contains("open");
    setOpen(shouldOpen);
  });

  links.forEach((link) =>
    link.addEventListener("click", () => {
      if (window.innerWidth <= 900) setOpen(false);
    })
  );
}

// ------------------------------------------------------------
// Chatbot toggle + fallback
// ------------------------------------------------------------

function initChatbotToggle() {
  const toggle = document.getElementById("chatbot-toggle");
  const container = document.getElementById("chatbot-container");
  const iframe = document.getElementById("chatbot-frame");
  const fallback = document.getElementById("chatbot-fallback");

  if (!toggle || !container) return;

  function setOpen(open) {
    container.style.display = open ? "block" : "none";
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    const isHidden =
      container.style.display === "none" || container.style.display === "";
    setOpen(isHidden);
  });

  if (iframe) {
    iframe.addEventListener("error", () => {
      if (fallback) fallback.hidden = false;
    });

    iframe.addEventListener("load", () => {
      if (fallback) fallback.hidden = true;
    });
  }
}
