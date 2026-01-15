document.addEventListener("DOMContentLoaded", () => {
  const dict = document.getElementById("dictionary");
  const searchInput = document.getElementById("search");
  const themeBtn = document.getElementById("themeToggle");
  const alphabetNav = document.getElementById("alphabet");
  const breadcrumbDiv = document.getElementById("breadcrumb");
  const backButton = document.getElementById("backButton");

  let words = [];
  let letterSections = {};

  function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /* DARK MODE */
  function updateDarkMode() {
    if (localStorage.theme === "dark") {
      document.body.classList.add("dark");
      themeBtn.textContent = "☀️";
    } else {
      document.body.classList.remove("dark");
      themeBtn.textContent = "🌙";
    }
  }

  if (!localStorage.theme) localStorage.theme = "light";
  updateDarkMode();
  themeBtn.onclick = () => {
    localStorage.theme = document.body.classList.contains("dark") ? "light" : "dark";
    updateDarkMode();
  };

  /* BACK BUTTON */
  backButton.style.display = "none";
  breadcrumbDiv.style.display = "none";
  backButton.onclick = () => {
    searchInput.value = "";
    renderGrouped(words);
    breadcrumbDiv.style.display = "none";
    backButton.style.display = "none";
    location.hash = "";
  };

  /* FETCH JSON */
  const file = new URLSearchParams(location.search).get("file") || "words-pallati-i-endrrave.json";
  fetch(file)
    .then(r => r.json())
    .then(data => {
      if (!Array.isArray(data)) throw new Error("JSON must be an array");
      words = data.sort((a,b)=>a.baza.localeCompare(b.baza,"sq",{sensitivity:"base"}));
      renderGrouped(words);
      buildAlphabet();
      openFromHash();
      window.addEventListener("scroll", highlightCurrentLetter);
    })
    .catch(err => {
      console.error("Error loading words:", err);
      dict.textContent = "Fjalët nuk u ngarkuan. Kontrolloni rrugën e JSON-it.";
    });

  /* RENDER */
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

      list.filter(w => w.baza[0].toUpperCase() === letter).forEach(w => {
        const d = document.createElement("details");
        d.className = "entry";
        d.id = normalize(w.baza);

        d.addEventListener("toggle", () => {
          if (d.open) location.hash = `fjala/${d.id}`;
        });

        let defsHTML = "";
        if (Array.isArray(w.definitions)) {
          w.definitions.forEach((def, idx) => {
            defsHTML += `<p><strong>${idx+1}.</strong> ${def.meaning}</p>`;
            if (def.example) defsHTML += `<p><em>P.sh.::</em> ${def.example}</p>`;
          });
        }

        // Colored summary
        d.innerHTML = `
          <summary class="summary">
            <span class="word-base">${w.baza}</span>
            ${w["mbaresa-pashquar"] ? `(<span class="word-pashquar">${w["mbaresa-pashquar"]}</span>)` : ""}
            ~<span class="word-shquar">${w["mbaresa-shquar"]}</span>
            ~<span class="word-shumes">${w["mbaresa-shumes"]}</span>
          </summary>
          <div class="content">
            ${defsHTML}
            <p><strong>K.M.</strong> ${w.klasa_morf || ""}</p>
            <p><strong>F.f.:</strong> ${w.fjaleformimi || ""}</p>
          </div>
        `;
        section.appendChild(d);
      });

      dict.appendChild(section);
      letterSections[letter] = section;
    });
  }

  /* ALPHABET SIDEBAR */
  function buildAlphabet() {
    if (!alphabetNav) return;
    alphabetNav.innerHTML = "";
    Object.keys(letterSections).sort().forEach(letter => {
      const btn = document.createElement("button");
      btn.textContent = letter;
      btn.onclick = () => {
        const target = letterSections[letter];
        if (target) target.scrollIntoView({behavior: "smooth"});
      };
      alphabetNav.appendChild(btn);
    });
  }

  function highlightCurrentLetter() {
    const scrollY = window.scrollY;
    let current = null;
    for (const [letter, section] of Object.entries(letterSections)) {
      if (scrollY >= section.offsetTop - 100) current = letter;
    }
    if (!alphabetNav) return;
    alphabetNav.querySelectorAll("button").forEach(btn => {
      btn.style.fontWeight = btn.textContent === current ? "bold" : "normal";
      btn.style.color = btn.textContent === current ? "var(--text)" : "var(--accent)";
    });
  }

  /* SEARCH */
  function applySearch() {
    const q = normalize(searchInput.value.trim());
    if (!q) return renderGrouped(words);
    const filtered = words.filter(w => normalize(w.baza).startsWith(q));
    renderGrouped(filtered);
  }
  if (searchInput) searchInput.addEventListener("input", applySearch);

  /* HASH */
  function openFromHash() {
    const hash = location.hash.replace("#","");
    if (!hash) return;
    if (hash.startsWith("fjala/")) {
      const id = hash.replace("fjala/","");
      const el = document.getElementById(id);
      if (el) {
        el.open = true;
        el.scrollIntoView({behavior:"smooth", block:"start"});
        breadcrumbDiv.style.display = "block";
        backButton.style.display = "inline-block";
        breadcrumbDiv.innerHTML = `Fjalor / <strong>${el.querySelector("summary")?.textContent}</strong>`;
      }
    }
  }
  window.addEventListener("hashchange", openFromHash);

});
