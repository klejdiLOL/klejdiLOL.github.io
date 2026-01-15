document.addEventListener("DOMContentLoaded", () => {

  // --------------------
  // ELEMENTS
  // --------------------
  const dict = document.getElementById("dictionary");
  const searchInput = document.getElementById("search");
  const themeBtn = document.getElementById("themeToggle");
  const alphabetNav = document.getElementById("alphabet");
  const container = document.getElementById("container");

  let words = [];
  let letterSections = {}; // for A-Z navigation

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
  if (localStorage.theme === "dark") document.body.classList.add("dark");
  if (themeBtn) {
    themeBtn.onclick = () => {
      document.body.classList.toggle("dark");
      localStorage.theme = document.body.classList.contains("dark") ? "dark" : "light";
    };
  }

  // --------------------
  // BREADCRUMB + BACK BUTTON
  // --------------------
  let breadcrumbDiv = document.getElementById("breadcrumb");
  if (!breadcrumbDiv) {
    breadcrumbDiv = document.createElement("div");
    breadcrumbDiv.id = "breadcrumb";
    breadcrumbDiv.style.display = "none";
    container.parentNode.insertBefore(breadcrumbDiv, container);
  }

  let backButton = document.getElementById("backButton");
  if (!backButton) {
    backButton = document.createElement("button");
    backButton.id = "backButton";
    backButton.textContent = "← Kthehu te fjalori";
    backButton.style.display = "none";
    backButton.onclick = () => {
      searchInput.value = "";
      renderGrouped(words);
      breadcrumbDiv.style.display = "none";
      backButton.style.display = "none";
      location.hash = "";
    };
    container.parentNode.insertBefore(backButton, container);
  }

  // --------------------
  // LOAD DATA
  // --------------------
  const urlParams = new URLSearchParams(window.location.search);
  const file = urlParams.get("file") || "words.json";

  fetch(file)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error("JSON is not an array");
      words = data.sort((a, b) =>
        a.baza.localeCompare(b.baza, "sq", { sensitivity: "base" })
      );
      renderGrouped(words);
      buildAlphabet();
      openFromHash();
      window.addEventListener("scroll", highlightCurrentLetter);
    })
    .catch(err => {
      dict.innerHTML = `<p>Fjalët nuk u ngarkuan. Kontrolloni rrugën e JSON-it: ${file}</p>`;
      console.error("Error loading words:", err);
    });

  // --------------------
  // RENDER GROUPED BY FIRST LETTER
  // --------------------
  function renderGrouped(list) {
    dict.innerHTML = "";
    letterSections = {};
    const letters = Array.from(new Set(list.map(w => w.baza[0].toUpperCase()))).sort();

    letters.forEach(letter => {
      const section = document.createElement("div");
      section.id = `letter-${letter}`;
      section.className = "letter-section";

      const h = document.createElement("h2");
      h.textContent = letter;
      section.appendChild(h);

      list
        .filter(w => w.baza[0].toUpperCase() === letter)
        .forEach(w => {
          const d = document.createElement("details");
          d.className = "entry";
          d.id = normalize(w.baza);

          d.addEventListener("toggle", () => {
            if (d.open) location.hash = `fjala/${d.id}`;
          });

          // Word header with colors and no extra spaces
          const header = `
            <span class="word-base">${w.baza}</span>
            <span class="word-pashquar">(${w["mbaresa-pashquar"]})</span>
            ~<span class="word-shquar">${w["mbaresa-shquar"]}</span>
            ~<span class="word-shumes">${w["mbaresa-shumes"]}</span>
          `;

          // Multiple definitions
          let defsHTML = "";
          if (Array.isArray(w.definitions)) {
            w.definitions.forEach((def, idx) => {
              defsHTML += `<p><strong>${idx + 1}.</strong> ${def.meaning}</p>`;
              if (def.example) defsHTML += `<p><em>Shembull:</em> ${def.example}</p>`;
            });
          }

          d.innerHTML = `
            <summary>${header}</summary>
            <div class="content">
              ${defsHTML}
              <p><strong>Klasa morf.:</strong>
                ${(w.tags.klasa_morf || []).map(t => `<a href="#kategori/klasa_morf/${t}">${t}</a>`).join(", ")}
              </p>
              <p><strong>Fjalëformimi:</strong>
                ${(w.tags.fjaleformimi || []).map(t => `<a href="#kategori/fjaleformimi/${t}">${t}</a>`).join(", ")}
              </p>
              ${(w.tags.neologjizem?.length) ? `
                <p><strong>Neologjizëm:</strong>
                  ${w.tags.neologjizem.map(t => `<a href="#kategori/neologjizem/${t}">${t}</a>`).join(", ")}</p>` : ""}
            </div>
          `;
          section.appendChild(d);
        });

      dict.appendChild(section);
      letterSections[letter] = section;
    });
  }

  // --------------------
  // BUILD SIDE ALPHABET
  // --------------------
  function buildAlphabet() {
    if (!alphabetNav) return;
    alphabetNav.innerHTML = "";
    const letters = Object.keys(letterSections).sort();

    letters.forEach(letter => {
      const btn = document.createElement("button");
      btn.textContent = letter;
      btn.onclick = () => {
        const target = letterSections[letter];
        if (target) target.scrollIntoView({ behavior: "smooth" });
      };
      alphabetNav.appendChild(btn);
    });
  }

  // --------------------
  // HIGHLIGHT CURRENT LETTER
  // --------------------
  function highlightCurrentLetter() {
    const scrollY = window.scrollY;
    let current = null;
    for (const [letter, section] of Object.entries(letterSections)) {
      const offsetTop = section.offsetTop - 100;
      if (scrollY >= offsetTop) current = letter;
    }

    if (!alphabetNav) return;
    alphabetNav.querySelectorAll("button").forEach(btn => {
      btn.style.fontWeight = btn.textContent === current ? "bold" : "normal";
      btn.style.color = btn.textContent === current ? "var(--text)" : "var(--accent)";
    });
  }

  // --------------------
  // SEARCH FILTER (PREFIX ONLY)
  // --------------------
  function applySearch() {
    const q = normalize(searchInput.value.trim());
    if (!q) return renderGrouped(words);

    const filtered = words.filter(w => normalize(w.baza).startsWith(q));
    renderGrouped(filtered);
  }
  if (searchInput) searchInput.addEventListener("input", applySearch);

  // --------------------
  // HASH ROUTING
  // --------------------
  function openFromHash() {
    const hash = location.hash.replace("#", "");
    if (!hash) return;

    if (hash.startsWith("fjala/")) {
      const id = hash.replace("fjala/", "");
      const el = document.getElementById(id);
      if (el) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        breadcrumbDiv.style.display = "block";
        backButton.style.display = "inline-block";
        breadcrumbDiv.innerHTML = `Fjalor / <strong>${el.querySelector("summary")?.textContent}</strong>`;
      }
    }

    if (hash.startsWith("kategori/")) {
      const [, type, value] = hash.split("/");
      const filtered = words.filter(w => (w.tags[type] || []).includes(value));
      renderGrouped(filtered);

      breadcrumbDiv.style.display = "block";
      backButton.style.display = "inline-block";
      breadcrumbDiv.innerHTML = `Fjalor / ${type.replace("_", " ")} / <strong>${value}</strong>`;

      document.querySelectorAll(".entry a").forEach(a => {
        if (a.textContent === value) a.style.fontWeight = "bold";
        else a.style.fontWeight = "normal";
      });
    }
  }

  window.addEventListener("hashchange", openFromHash);

});
