document.addEventListener("DOMContentLoaded", () => {
  const dict = document.getElementById("dictionary");
  const searchInput = document.getElementById("search");
  const themeBtns = Array.from(document.querySelectorAll('.theme-toggle'));
  const alphabetNav = document.getElementById("alphabet");
  const breadcrumbDiv = document.getElementById("breadcrumb");
  const backButton = document.getElementById("backButton");
  const filterBar = document.getElementById("classFilter");
  const statusRegion = document.getElementById("resultStatus");

  let words = [];
  let letterSections = {};
  let activeClass = null;
  let currentQuery = "";

  function normalize(text) {
    return (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function esc(s) {
    return (s || "").toString()
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(text, query) {
    const safe = esc(text);
    if (!query) return safe;
    const normText = normalize(text);
    const idx = normText.indexOf(query);
    if (idx === -1) return safe;
    const before = esc(text.slice(0, idx));
    const match = esc(text.slice(idx, idx + query.length));
    const after = esc(text.slice(idx + query.length));
    return `${before}<mark class="search-hit">${match}</mark>${after}`;
  }

  function updateDarkMode() {
    const isDark = localStorage.theme === "dark";
    document.body.classList.toggle("dark", isDark);
    themeBtns.forEach(b => {
      b.textContent = isDark ? "☀️" : "🌙";
      b.setAttribute("aria-label", isDark ? "Kalo në modalitetin e ndritshëm" : "Kalo në modalitetin e errët");
      b.setAttribute("aria-pressed", String(isDark));
    });
  }

  if (!localStorage.theme) localStorage.theme = "light";
  updateDarkMode();
  themeBtns.forEach(b => b.addEventListener('click', () => {
    localStorage.theme = document.body.classList.contains("dark") ? "light" : "dark";
    updateDarkMode();
  }));

  function moveThemeMobile() {
    const mobileBtn = document.getElementById('themeToggleMobile');
    const topLeft = document.querySelector('.top-left');
    const topRight = document.querySelector('.top-right');
    if (!mobileBtn || !topLeft || !topRight) return;
    if (window.innerWidth <= 300) {
      if (!topLeft.contains(mobileBtn)) {
        topLeft.appendChild(mobileBtn);
        mobileBtn.style.marginTop = '6px';
        mobileBtn.style.marginLeft = '0';
        mobileBtn.style.position = '';
        mobileBtn.style.right = '';
        mobileBtn.style.transform = '';
      }
    } else {
      if (!topRight.contains(mobileBtn)) {
        topRight.appendChild(mobileBtn);
        mobileBtn.style.marginTop = '';
        mobileBtn.style.marginLeft = '';
        mobileBtn.style.position = '';
        mobileBtn.style.right = '';
        mobileBtn.style.transform = '';
      }
    }
  }
  moveThemeMobile();
  let _mvResize;
  window.addEventListener('resize', () => {
    clearTimeout(_mvResize);
    _mvResize = setTimeout(moveThemeMobile, 120);
  });

  function hideBreadcrumb() {
    if (breadcrumbDiv) breadcrumbDiv.style.display = "none";
    if (backButton) backButton.style.display = "none";
  }
  function showBreadcrumb(baseWord) {
    if (breadcrumbDiv) {
      breadcrumbDiv.style.display = "block";
      breadcrumbDiv.innerHTML = `Fjalor / <strong>${esc(baseWord)}</strong> `;
    }
    if (backButton) backButton.style.display = "inline-block";
  }
  hideBreadcrumb();

  function closeAllEntries(animated) {
    document.querySelectorAll('.entry[open]').forEach(other => {
      if (animated) {
        const content = other.querySelector('.content');
        if (content) {
          content.classList.add('fade-out');
          const onAnim = function () {
            content.classList.remove('fade-out');
            other.open = false;
            content.removeEventListener('animationend', onAnim);
          };
          content.addEventListener('animationend', onAnim);
          return;
        }
      }
      other.open = false;
    });
  }

  if (backButton) backButton.onclick = () => {
    if (searchInput) searchInput.value = "";
    currentQuery = "";
    render();
    hideBreadcrumb();
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (err) {
      location.hash = "";
    }
    closeAllEntries(false);
  };

  const file = new URLSearchParams(location.search).get("file") || "words-pallati-i-endrrave.json";
  if (dict) {
    fetch(file)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error("JSON must be an array");
        words = data.sort((a, b) =>
          (a.tema || "").localeCompare(b.tema || "", "sq", { sensitivity: "base" }));
        buildClassFilter();
        render();
        openFromHash();
        window.addEventListener("scroll", highlightCurrentLetter, { passive: true });
      })
      .catch(err => {
        console.error("Error loading words:", err);
        if (dict) dict.textContent = "Fjalët nuk u ngarkuan. Kontrolloni rrugën e JSON-it.";
      });
  }

  function buildContentHTML(w) {
    let defsHTML = "";
    let counter = 0;
    if (Array.isArray(w.përkufizime)) {
      w.përkufizime.forEach((def) => {
        if (def.kuptim) {
          counter++;
          defsHTML += `<p><strong>${counter}.</strong> ${esc(def.kuptim)}</p>`;
        }
        if (def.shembull) defsHTML += `<p><em>Sh.:</em> ${esc(def.shembull)}</p>`;
        if (def.kuptim2) {
          counter++;
          defsHTML += `<p><strong>${counter}.</strong> ${esc(def.kuptim2)}</p>`;
        }
        if (def.shembull2) defsHTML += `<p><em>Sh.:</em> ${esc(def.shembull2)}</p>`;
      });
    }
    let extraHTML = "";
    if (w.klasa_morf) extraHTML += `<p><strong>K.M.</strong> ${esc(w.klasa_morf)}</p>`;
    if (w.fjaleformimi) extraHTML += `<p><strong>F.f.:</strong> ${esc(w.fjaleformimi)}</p>`;
    return defsHTML + extraHTML;
  }

  function buildPlainText(w) {
    const base = (w.tema || w.baza || w.nyje || "").toString();
    let out = base + "\n";
    if (Array.isArray(w.përkufizime)) {
      let c = 0;
      w.përkufizime.forEach(def => {
        if (def.kuptim) { c++; out += `${c}. ${def.kuptim}\n`; }
        if (def.shembull) out += `   Sh.: ${def.shembull}\n`;
        if (def.kuptim2) { c++; out += `${c}. ${def.kuptim2}\n`; }
        if (def.shembull2) out += `   Sh.: ${def.shembull2}\n`;
      });
    }
    if (w.klasa_morf) out += `K.M. ${w.klasa_morf}\n`;
    if (w.fjaleformimi) out += `F.f.: ${w.fjaleformimi}\n`;
    return out.trim();
  }

  function currentList() {
    let list = words;
    if (activeClass) {
      list = list.filter(w => (w.klasa_morf || "").trim() === activeClass);
    }
    if (currentQuery) {
      const q = currentQuery;
      const scored = [];
      list.forEach(w => {
        const title = normalize(w.tema || w.baza || w.nyje || "");
        let score = -1;
        if (title.startsWith(q)) score = 0;
        else if (title.includes(q)) score = 1;
        else {
          const inDef = Array.isArray(w.përkufizime) && w.përkufizime.some(d =>
            normalize(d.kuptim).includes(q) || normalize(d.kuptim2).includes(q));
          if (inDef) score = 2;
        }
        if (score >= 0) scored.push({ w, score, title });
      });
      scored.sort((a, b) =>
        a.score - b.score || a.title.localeCompare(b.title, "sq", { sensitivity: "base" }));
      list = scored.map(s => s.w);
    }
    return list;
  }

  function announce(count) {
    if (!statusRegion) return;
    if (currentQuery || activeClass) {
      statusRegion.textContent = count === 1
        ? "1 fjalë u gjet."
        : `${count} fjalë u gjetën.`;
    } else {
      statusRegion.textContent = "";
    }
  }

  function render() {
    const list = currentList();
    dict.innerHTML = "";
    letterSections = {};

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.id = "noResults";
      empty.textContent = "Nuk u gjet asnjë fjalë.";
      dict.appendChild(empty);
      buildAlphabet();
      announce(0);
      return;
    }

    const titlesByLetter = {};
    list.forEach(w => {
      const t = (w.tema || w.baza || w.nyje || "").toString();
      const n = normalize(t);
      const letter = n ? n[0].toUpperCase() : "";
      if (!letter) return;
      (titlesByLetter[letter] = titlesByLetter[letter] || []).push(w);
    });

    const letters = Object.keys(titlesByLetter)
      .sort((a, b) => a.localeCompare(b, "sq", { sensitivity: "base" }));

    letters.forEach(letter => {
      const section = document.createElement("div");
      section.id = `letter-${letter}`;
      section.className = "letter-section";

      const h = document.createElement("h2");
      h.textContent = letter;
      section.appendChild(h);

      titlesByLetter[letter].forEach(w => {
        const d = document.createElement("details");
        d.className = "entry";
        const displayTitle = (w.tema || w.baza || w.nyje || "").toString();
        d.id = normalize(displayTitle);

        const baseHTML = highlight(displayTitle, currentQuery);
        d.innerHTML =
          `<summary class="summary" aria-label="${esc(displayTitle)}">` +
          `${w.nyje ? `<span class="word-nyje">${esc(w.nyje)}</span> ` : ""}` +
          `<span class="word-base">${baseHTML}</span>` +
          `${w["mbaresa-pashquar"] ? `(<span class="word-pashquar">${esc(w["mbaresa-pashquar"])}</span>)` : ""}` +
          `${w["mbaresa-pashquar-shumes"] ? `~<span class="word-pashquar-shumes">${esc(w["mbaresa-pashquar-shumes"])}</span>` : ""}` +
          `${w["mbaresa-shquar"] ? `~<span class="word-shquar">${esc(w["mbaresa-shquar"])}</span>` : ""}` +
          `${w["mbaresa-shumes"] ? `~<span class="word-shumes">${esc(w["mbaresa-shumes"])}</span>` : ""}` +
          `</summary><div class="content"></div>`;

        d.addEventListener("toggle", () => {
          if (d.open) {
            const content = d.querySelector(".content");
            if (content && !content.dataset.filled) {
              content.innerHTML = buildContentHTML(w);
              const btn = document.createElement("button");
              btn.className = "copy-btn";
              btn.type = "button";
              btn.textContent = "Kopjo";
              btn.setAttribute("aria-label", `Kopjo fjalën ${displayTitle}`);
              btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = buildPlainText(w);
                navigator.clipboard?.writeText(text).then(() => {
                  btn.textContent = "U kopjua!";
                  btn.classList.add("copied");
                  setTimeout(() => { btn.textContent = "Kopjo"; btn.classList.remove("copied"); }, 1500);
                }).catch(() => {
                  btn.textContent = "Gabim";
                  setTimeout(() => { btn.textContent = "Kopjo"; }, 1500);
                });
              });
              content.appendChild(btn);
              content.dataset.filled = "1";
            }
            document.querySelectorAll('.entry').forEach(other => {
              if (other !== d && other.open) {
                const c = other.querySelector('.content');
                if (c) {
                  c.classList.add('fade-out');
                  const onAnim = function () {
                    c.classList.remove('fade-out');
                    other.open = false;
                    c.removeEventListener('animationend', onAnim);
                  };
                  c.addEventListener('animationend', onAnim);
                } else {
                  other.open = false;
                }
              }
            });
            location.hash = `fjala/${d.id}`;
            showBreadcrumb(displayTitle);
          } else {
            if (!document.querySelector('.entry[open]')) hideBreadcrumb();
          }
        });

        section.appendChild(d);
      });

      dict.appendChild(section);
      letterSections[letter] = section;
    });

    buildAlphabet();
    announce(list.length);
  }

  function buildClassFilter() {
    if (!filterBar) return;
    const classes = Array.from(new Set(
      words.map(w => (w.klasa_morf || "").trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, "sq", { sensitivity: "base" }));

    if (classes.length === 0) { filterBar.style.display = "none"; return; }

    filterBar.innerHTML = "";
    const makeChip = (label, value) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip" + (value === activeClass ? " active" : "");
      chip.textContent = label;
      chip.setAttribute("aria-pressed", String(value === activeClass));
      chip.addEventListener("click", () => {
        activeClass = (activeClass === value) ? null : value;
        filterBar.querySelectorAll(".filter-chip").forEach(c => {
          const on = c === chip && activeClass === value;
          c.classList.toggle("active", on);
          c.setAttribute("aria-pressed", String(on));
        });
        render();
      });
      return chip;
    };

    const allChip = makeChip("Të gjitha", null);
    allChip.classList.toggle("active", activeClass === null);
    filterBar.appendChild(allChip);
    classes.forEach(c => filterBar.appendChild(makeChip(c, c)));
  }

  function buildAlphabet() {
    if (!alphabetNav) return;
    alphabetNav.innerHTML = "";
    Object.keys(letterSections)
      .sort((a, b) => a.localeCompare(b, "sq", { sensitivity: "base" }))
      .forEach(letter => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = letter;
        btn.setAttribute("aria-label", `Shko te shkronja ${letter}`);
        btn.onclick = () => {
          const target = letterSections[letter];
          if (target) target.scrollIntoView({ behavior: "smooth" });
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
      btn.classList.toggle("active", btn.textContent === current);
    });

    const activeBtn = alphabetNav.querySelector("button.active");
    if (activeBtn && window.innerWidth <= 768 && alphabetNav.scrollWidth > alphabetNav.clientWidth) {
      const navRect = alphabetNav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const currentScroll = alphabetNav.scrollLeft;
      const targetScroll = currentScroll + (btnRect.left - navRect.left) - (alphabetNav.clientWidth / 2) + (btnRect.width / 2);
      alphabetNav.scrollTo({ left: Math.max(0, Math.round(targetScroll)), behavior: "smooth" });
    }
  }

  let _searchTimer;
  function applySearch() {
    currentQuery = normalize(searchInput.value.trim());
    render();
  }
  if (searchInput) searchInput.addEventListener("input", () => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(applySearch, 120);
  });

  function openFromHash() {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    if (hash.startsWith("fjala/")) {
      const id = hash.replace("fjala/", "");
      const el = document.getElementById(id);
      if (el) {
        el.open = true;
        const base = el.querySelector(".word-base")?.textContent || id;
        showBreadcrumb(base);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
  window.addEventListener("hashchange", openFromHash);

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea";
    if (e.key === "/" && !typing) {
      e.preventDefault();
      if (searchInput) {
        searchInput.classList.add("active");
        searchInput.focus();
      }
      return;
    }
    if (e.key === "Escape") {
      const open = document.querySelector('.entry[open]');
      if (open) {
        closeAllEntries(false);
        hideBreadcrumb();
        try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}
      } else if (searchInput && searchInput.value) {
        searchInput.value = "";
        currentQuery = "";
        render();
      }
    }
  });

  const backToTop = document.getElementById("backToTop");
  function updateBackToTop() {
    if (!backToTop) return;
    backToTop.classList.toggle("visible", window.scrollY > 20);
  }
  window.addEventListener("scroll", updateBackToTop, { passive: true });
  backToTop?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeAllEntries(true);
    if (location.hash && location.hash.startsWith("#fjala/")) {
      try {
        history.replaceState(null, "", location.pathname + location.search);
      } catch (err) {
        location.hash = "";
      }
      hideBreadcrumb();
    }
  });
  updateBackToTop();

  const manualRoot = document.getElementById('manual-content');
  function mdToHtml(md) {
    if (!md) return '';
    let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function (_, lang, code) {
      const e = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cls = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${cls}>${e}</code></pre>`;
    });
    html = html.replace(/`([^`]+)`/g, function (_, c) {
      const e = c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code>${e}</code>`;
    });
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^[ \t]*- (.*)$/gim, '<li>$1</li>');
    html = html.replace(/(?:<li>.*<\/li>\n?)+/g, function (block) {
      return '<ul>' + block.replace(/\n/g, '') + '</ul>';
    });
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/__(.*?)__/gim, '<u>$1</u>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');
    html = html.replace(/(^|\n)([^<\n][^\n]*)(\n|$)/gim, function (m, a, b) {
      if (b.match(/^<(h|ul|li|blockquote|pre)/)) return m;
      return '\n<p>' + b.trim() + '</p>\n';
    });
    return html.replace(/&lt;(\/)?(strong|em|u|h[1-6]|a|p|ul|li|span)([^&]*)&gt;/gi, '<$1$2$3>');
  }

  async function loadManual() {
    if (!manualRoot) return;
    manualRoot.innerHTML = '<p>Duke ngarkuar manualin...</p>';
    try {
      let res = await fetch('./manual.json');
      if (!res.ok) res = await fetch('manual.json');
      if (!res.ok) throw new Error('no json');
      const data = await res.json();
      const mt = document.getElementById('manual-title');
      const ms = document.getElementById('manual-subtitle');
      if (mt) mt.textContent = data.title || '';
      if (ms) ms.textContent = data.subtitle || '';
      manualRoot.innerHTML = '';
      const sections = Array.isArray(data.sections) ? data.sections : [];
      sections.forEach((s) => {
        if (s.title) {
          const h = document.createElement('h2');
          h.textContent = s.title;
          manualRoot.appendChild(h);
        }
        const fmt = (s.format || '').toLowerCase();
        const content = s.content || '';
        const wrapper = document.createElement('div');
        wrapper.className = 'manual-plain';
        if (fmt === 'md') {
          wrapper.innerHTML = mdToHtml(content);
        } else if (s.contentHtml) {
          wrapper.innerHTML = s.contentHtml;
        } else {
          wrapper.innerHTML = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }
        manualRoot.appendChild(wrapper);
      });
    } catch (err) {
      try {
        let r2 = await fetch('./manual.md');
        if (!r2.ok) r2 = await fetch('manual.md');
        if (!r2.ok) throw err;
        const md = await r2.text();
        manualRoot.innerHTML = mdToHtml(md);
      } catch (e) {
        manualRoot.innerHTML = `<p style="color:crimson">Manual not found.</p>`;
      }
    }
  }
  loadManual();
});

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("searchToggle");
  const search = document.getElementById("search");
  if (toggle && search) {
    toggle.addEventListener("click", () => {
      search.classList.toggle("active");
      if (search.classList.contains("active")) search.focus();
    });
  }
});
