const dict = document.getElementById("dictionary");
const searchInput = document.getElementById("search");
const themeBtn = document.getElementById("themeToggle");

const fKlasa = document.getElementById("filter-klasa");
const fFormim = document.getElementById("filter-formim");
const fNeo = document.getElementById("filter-neo");

let words = [];

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Dark mode
if (localStorage.theme === "dark") document.body.classList.add("dark");
themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.theme = document.body.classList.contains("dark") ? "dark" : "light";
};

// Load data
fetch("words.json")
  .then(r => r.json())
  .then(data => {
    words = data.sort((a, b) =>
      a.word.localeCompare(b.word, "sq", { sensitivity: "base" })
    );
    buildFilters();
    buildAlphabet();
    render(words);
  });

// Filters
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

  sets.klasa_morf.forEach(v => fKlasa.innerHTML += `<option>${v}</option>`);
  sets.fjaleformimi.forEach(v => fFormim.innerHTML += `<option>${v}</option>`);
  sets.neologjizem.forEach(v => fNeo.innerHTML += `<option>${v}</option>`);
}

// Alphabet
function buildAlphabet() {
  const nav = document.getElementById("alphabet");
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÇË".split("").forEach(l => {
    const b = document.createElement("button");
    b.textContent = l;
    b.onclick = () => {
      render(words.filter(w => normalize(w.word).startsWith(normalize(l))));
    };
    nav.appendChild(b);
  });
}

// Render
function render(list) {
  dict.innerHTML = "";
  list.forEach(w => {
    const d = document.createElement("details");
    d.className = "entry";
    d.id = normalize(w.word);

    d.innerHTML = `
      <summary>${w.word}</summary>
      <div class="content">
        <p><strong>Përkufizim:</strong> ${w.definition}</p>
        ${w.example ? `<p><strong>Shembull:</strong> ${w.example}</p>` : ""}
        <p><strong>Etiketa:</strong> ${Object.values(w.tags).flat().join(", ")}</p>
      </div>
    `;
    dict.appendChild(d);
  });
}

// Search + filters
function applyFilters() {
  const q = normalize(searchInput.value);

  render(words.filter(w => {
    if (q && !normalize(w.word).includes(q)) return false;
    if (fKlasa.value && !w.tags.klasa_morf.includes(fKlasa.value)) return false;
    if (fFormim.value && !w.tags.fjaleformimi.includes(fFormim.value)) return false;
    if (fNeo.value && !w.tags.neologjizem.includes(fNeo.value)) return false;
    return true;
  }));
}

[searchInput, fKlasa, fFormim, fNeo].forEach(e =>
  e.addEventListener("input", applyFilters)
);
