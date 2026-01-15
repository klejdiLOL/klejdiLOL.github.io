// ELEMENTS
const dict = document.getElementById("dictionary");
const searchInput = document.getElementById("search");
const themeBtn = document.getElementById("themeToggle");

const fKlasa = document.getElementById("filter-klasa");
const fFormim = document.getElementById("filter-formim");
const fNeo = document.getElementById("filter-neo");

let words = [];

// --------------------
// HELPERS
// --------------------
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// --------------------
// DARK MODE
// --------------------
if (localStorage.theme === "dark") {
  document.body.classList.add("dark");
}

if (themeBtn) {
  themeBtn.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.theme = document.body.classList.contains("dark")
      ? "dark"
      : "light";
  };
}

// --------------------
// LOAD DATA
// --------------------
fetch("words.json")
  .then(r => r.json())
  .then(data => {
    words = data.sort((a, b) =>
      a.word.localeCompare(b.word, "sq", { sensitivity: "base" })
    );

    buildFilters();
    buildAlphabet();
    render(words);
    openFromHash(); // ✅ MUST be last
  });

// --------------------
// FILTER DROPDOWNS
// --------------------
function buildFilters() {
  const sets = {
    klasa_morf: new Set(),
    fjaleformimi: new Set(),
    neologjizem: new Set()
  };

  words.forEach(w => {
    Object.keys(sets).forEach(k => {
      (w.tags[k] || []).forEach(v => sets[k].add(v));
    });
  });

  sets.klasa_morf.forEach(v =>
    fKlasa.innerHTML += `<option value="${v}">${v}</option>`
  );
  sets.fjaleformimi.forEach(v =>
    fFormim.innerHTML += `<option value="${v}">${v}</option>`
  );
  sets.neologjizem.forEach(v =>
    fNeo.innerHTML += `<option value="${v}">${v}</option>`
  );
}

// --------------------
// ALPHABET SIDEBAR
// --------------------
function buildAlphabet() {
  const nav = document.getElementById("alphabet");
  if (!nav) return;

  "ABCDEFGHIJKLMNOPQRSTUVWXYZÇË".split("").forEach(letter => {
    const btn = document.createElement("button");
    btn.textContent = letter;

    btn.onclick = () => {
      const filtered = words.filter(w =>
        normalize(w.word).startsWith(normalize(letter))
      );
      render(filtered);
      location.hash = ""; // reset hash
    };

    nav.appendChild(btn);
  });
}

// --------------------
// RENDER WORDS
// --------------------
function render(list) {
  dict.innerHTML = "";

  list.forEach(w => {
    const d = document.createElement("details");
    d.className = "entry";
    d.id = normalize(w.word);

    d.addEventListener("toggle", () => {
      if (d.open) {
        location.hash = `fjala/${d.id}`;
      }
    });

    d.innerHTML = `
      <summary>${w.word}</summary>
      <div class="content">
        <p><strong>Përkufizim:</strong> ${w.definition}</p>

        ${w.example ? `<p><strong>Shembull:</strong> ${w.example}</p>` : ""}

        <p><strong>Klasa morf.:</strong>
          ${w.tags.klasa_morf.map(t =>
            `<a href="#kategori/klasa_morf/${t}">${t}</a>`
          ).join(", ")}
        </p>

        <p><strong>Fjalëformimi:</strong>
          ${w.tags.fjaleformimi.map(t =>
            `<a href="#kategori/fjaleformimi/${t}">${t}</a>`
          ).join(", ")}
        </p>

        ${w.tags.neologjizem.length ? `
          <p><strong>Neologjizëm:</strong>
            ${w.tags.neologjizem.map(t =>
              `<a href="#kategori/neologjizem/${t}">${t}</a>`
            ).join(", ")}
          </p>` : ""}
      </div>
    `;

    dict.appendChild(d);
  });
}

// --------------------
// SEARCH + FILTERS
// --------------------
function applyFilters() {
  const q = normalize(searchInput.value);

  const filtered = words.filter(w => {
    if (q && !normalize(w.word).includes(q)) return false;
    if (fKlasa.value && !w.tags.klasa_morf.includes(fKlasa.value)) return false;
    if (fFormim.value && !w.tags.fjaleformimi.includes(fFormim.value)) return false;
    if (fNeo.value && !w.tags.neologjizem.includes(fNeo.value)) return false;
    return true;
  });

  render(filtered);
  location.hash = "";
}

[searchInput, fKlasa, fFormim, fNeo].forEach(el => {
  if (el) el.addEventListener("input", applyFilters);
});

// --------------------
// HASH ROUTING
// --------------------
function openFromHash() {
  const hash = location.hash.replace("#", "");
  if (!hash) return;

  // WORD VIEW
  if (hash.startsWith("fjala/")) {
    const id = hash.replace("fjala/", "");
    const el = document.getElementById(id);
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: "start" });
    }
  }

  // CATEGORY VIEW
  if (hash.startsWith("kategori/")) {
    const [, type, value] = hash.split("/");

    const filtered = words.filter(w =>
      (w.tags[type] || []).includes(value)
    );

    render(filtered);
  }
}

window.addEventListener("hashchange", openFromHash);
