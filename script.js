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
      .normalize("NFD")                // split accents
      .replace(/[\u0300-\u036f]/g, ""); // remove accents
  }

  // --------------------
  // DARK MODE
  // --------------------
  if (localStorage.theme === "dark") document.body.classList.add("dark");
  if (themeBtn) {
    themeBtn.onclick = () => {
      document.body.classList.toggle("dark");
      localStorage.theme = document.body.classList.contains("dark")
        ? "dark"
        : "light";
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
  fetch("words.json")
    .then(r => r.json())
    .then(data => {
      words = data.sort((a, b) =>
        a.word.localeCompare(b.word, "sq", { sensitivity: "base" })
      );
      renderGrouped(words);
      buildAlphabet();
      openFromHash();
      window.addEventListener("scroll", highlightCurrentLetter);
    });

  // --------------------
  // RENDER GROUPED BY FIRST LETTER
  // --------------------
  function renderGrouped(list) {
    dict.innerHTML = "";
    letterSections = {};
    const letters = Array.from(new Set(list.map(w => w.word[0].toUpperCase()))).sort();

    letters.forEach(letter => {
      const section = document.createElement("div");
      section.id = `letter-${letter}`;
      section.className = "letter-section";

      const h = document.createElement("h2");
      h.textContent = letter;
      section.appendChild(h);

      list
        .filter(w => w.word[0].toUpperCase() === letter)
        .forEach(w => {
          const d = document.createElement("details");
          d.className = "entry";
          d.id = normalize(w.word);

          d.addEventListener("toggle", () => {
            if (d.open) location.hash = `fjala/${d.id}`;
          });

          // Multiple definitions support
          let defsHTML = "";
          if (Array.isArray(w.definitions)) {
            w.definitions.forEach((def, idx) => {
              defsHTML += `<p><strong>${idx + 1}.</strong> ${def.meaning}</p>`;
              if (def.example) defsHTML += `<p><em>Shembull:</em> ${def.example}</p>`;
            });
          } else {
            defsHTML = `<p>${w.definition || ""}</p>`;
            if (w.example) defsHTML += `<p><em>Shembull:</em> ${w.example}</p>`;
          }

          d.innerHTML = `
            <summary>${w.word}</summary>
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
                  ${w.tags.neologjizem.map(t => `<a href="#kategori/neologjizem/${t}">${t}</a>`).join(", ")}
                </p>` : ""}
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
      const offsetTop = section.offsetTop - 100; // adjust for sticky header
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

    const filtered = words.filter(w => normalize(w.word).startsWith(q));
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

      // Highlight active links inside word entries
      document.querySelectorAll(".entry a").forEach(a => {
        if (a.textContent === value) a.style.fontWeight = "bold";
        else a.style.fontWeight = "normal";
      });
    }
  }

  window.addEventListener("hashchange", openFromHash);

});



