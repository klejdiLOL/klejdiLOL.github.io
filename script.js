document.addEventListener("DOMContentLoaded", () => {
  const dict = document.getElementById("dictionary");
  const searchInput = document.getElementById("search");
  const themeBtns = Array.from(document.querySelectorAll('.theme-toggle'));
  const alphabetNav = document.getElementById("alphabet");
  const breadcrumbDiv = document.getElementById("breadcrumb");
  const backButton = document.getElementById("backButton");

  let words = [];
  let letterSections = {};

  function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function updateDarkMode() {
    if (localStorage.theme === "dark") {
      document.body.classList.add("dark");
      themeBtns.forEach(b => b.textContent = "☀️");
    } else {
      document.body.classList.remove("dark");
      themeBtns.forEach(b => b.textContent = "🌙");
    }
  }

  if (!localStorage.theme) localStorage.theme = "light";
  updateDarkMode();
  themeBtns.forEach(b => b.addEventListener('click', () => {
    localStorage.theme = document.body.classList.contains("dark") ? "light" : "dark";
    updateDarkMode();
  }));

  if (backButton) backButton.style.display = "none";
  if (breadcrumbDiv) breadcrumbDiv.style.display = "none";
  if (backButton) backButton.onclick = () => {
    if (searchInput) searchInput.value = "";
    if (typeof renderGrouped === 'function') renderGrouped(words);
    if (breadcrumbDiv) breadcrumbDiv.style.display = "none";
    if (backButton) backButton.style.display = "none";
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (err) {
      location.hash = "";
    }
    // Ensure any open entries are closed
    document.querySelectorAll('.entry[open]').forEach(other => other.open = false);
  };

  const file = new URLSearchParams(location.search).get("file") || "words-pallati-i-endrrave.json";
  if (dict) {
    fetch(file)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error("JSON must be an array");
        words = data.sort((a,b)=>a.tema.localeCompare(b.tema,"sq",{sensitivity:"base"}));
        renderGrouped(words);
        buildAlphabet();
        openFromHash();
        window.addEventListener("scroll", highlightCurrentLetter);
      })
      .catch(err => {
        console.error("Error loading words:", err);
        if (dict) dict.textContent = "Fjalët nuk u ngarkuan. Kontrolloni rrugën e JSON-it.";
      });
  }

  function renderGrouped(list) {
    dict.innerHTML = "";
    letterSections = {};
    // derive a safe display title for each entry (fallback to `baza` or `nyje` when `tema` is missing)
    const titles = list.map(w => {
      const t = (w.tema || w.baza || w.nyje || "").toString();
      const n = normalize(t);
      return n ? n[0].toUpperCase() : "";
    }).filter(Boolean);
    const letters = Array.from(new Set(titles)).sort((a,b) => a.localeCompare(b, "sq", {sensitivity: "base"}));

    letters.forEach(letter => {
      const section = document.createElement("div");
      section.id = `letter-${letter}`;
      section.className = "letter-section";

      const h = document.createElement("h2");
      h.textContent = letter;
      section.appendChild(h);

      list.filter(w => {
        const title = (w.tema || w.baza || w.nyje || "").toString();
        const first = normalize(title)[0];
        return first && first.toUpperCase() === letter;
      }).forEach(w => {
        const d = document.createElement("details");
        d.className = "entry";
        const displayTitle = (w.tema || w.baza || w.nyje || "").toString();
        d.id = normalize(displayTitle);

        d.addEventListener("toggle", () => {
          if (d.open) {
            // Close other open entries with a fade-out, then close them
            document.querySelectorAll('.entry').forEach(other => {
              if (other !== d && other.open) {
                const content = other.querySelector('.content');
                if (content) {
                  content.classList.add('fade-out');
                  const onAnim = function() {
                    content.classList.remove('fade-out');
                    other.open = false;
                    content.removeEventListener('animationend', onAnim);
                  };
                  content.addEventListener('animationend', onAnim);
                } else {
                  other.open = false;
                }
              }
            });
            location.hash = `fjala/${d.id}`;
          }
        });

        let defsHTML = "";
        if (Array.isArray(w.përcaktime)) {
          w.përcaktime.forEach((def, idx) => {
            if (def.kuptim) defsHTML += `<p><strong>${idx+1}.</strong> ${def.kuptim}</p>`;
            if (def.shembull) defsHTML += `<p><em>Sh.1:</em> ${def.shembull}</p>`;
            if (def.kuptim2) defsHTML += `<p><strong>${idx+2}.</strong> ${def.kuptim2}</p>`;
            if (def.shembull2) defsHTML += `<p><em>Sh.2:</em> ${def.shembull2}</p>`;
          });
        }

        let extraHTML = "";
        if (w.klasa_morf) extraHTML += `<p><strong>K.M.</strong> ${w.klasa_morf}</p>`;
        if (w.fjaleformimi) extraHTML += `<p><strong>F.f.:</strong> ${w.fjaleformimi}</p>`;

         d.innerHTML = `<summary class="summary">${w.nyje ? `<span class="word-nyje">${w.nyje}</span> ` : ""}
       <span class="word-base">${displayTitle}</span>${w["mbaresa-pashquar"] ? `(<span class="word-pashquar">${w["mbaresa-pashquar"]}</span>)` : ""}${w["mbaresa-pashquar-shumes"] ? `~<span class="word-pashquar-shumes">${w["mbaresa-pashquar-shumes"]}</span>` : ""}${w["mbaresa-shquar"] ? `~<span class="word-shquar">${w["mbaresa-shquar"]}</span>` : ""}${w["mbaresa-shumes"] ? `~<span class="word-shumes">${w["mbaresa-shumes"]}</span>` : ""}</summary><div class="content">${defsHTML}${extraHTML}</div>`;

        section.appendChild(d);
      });

      dict.appendChild(section);
      letterSections[letter] = section;
    });
  }

  function buildAlphabet() {
    if (!alphabetNav) return;
    alphabetNav.innerHTML = "";
    Object.keys(letterSections).sort((a,b) => a.localeCompare(b, "sq", {sensitivity: "base"})).forEach(letter => {
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
      btn.classList.toggle("active", btn.textContent === current);
    });

    // Auto-scroll alphabet nav on small screens so the active letter is centered.
    // Use horizontal scroll on the nav itself to avoid any vertical/page jump.
    const activeBtn = alphabetNav.querySelector("button.active");
    if (activeBtn && window.innerWidth <= 768 && alphabetNav.scrollWidth > alphabetNav.clientWidth) {
      const navRect = alphabetNav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const currentScroll = alphabetNav.scrollLeft;
      const targetScroll = currentScroll + (btnRect.left - navRect.left) - (alphabetNav.clientWidth / 2) + (btnRect.width / 2);
      alphabetNav.scrollTo({ left: Math.max(0, Math.round(targetScroll)), behavior: "smooth" });
    }
  }

  function applySearch() {
    const q = normalize(searchInput.value.trim());
    if (!q) return renderGrouped(words);
    const filtered = words.filter(w => normalize(w.tema).startsWith(q));
    renderGrouped(filtered);
  }
  if (searchInput) searchInput.addEventListener("input", applySearch);

  function openFromHash() {
    const hash = location.hash.replace("#","");
    if (!hash) return;
    if (hash.startsWith("fjala/")) {
      const id = hash.replace("fjala/","");
      const el = document.getElementById(id);
      if (el) {
        el.open = true;
        breadcrumbDiv.style.display = "block";
        backButton.style.display = "inline-block";
        breadcrumbDiv.innerHTML = `Fjalor / <strong>${el.querySelector("summary")?.textContent}</strong>`;
      }
    }
  }
  window.addEventListener("hashchange", openFromHash);
  // Back to Top button behavior
  const backToTop = document.getElementById("backToTop");
  function updateBackToTop() {
    if (!backToTop) return;
    if (window.scrollY > 20) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }
  }
  window.addEventListener("scroll", updateBackToTop, { passive: true });
  backToTop?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Collapse all open entries with fade-out animation
    document.querySelectorAll('.entry[open]').forEach(other => {
      const content = other.querySelector('.content');
      if (content) {
        content.classList.add('fade-out');
        const handler = function() {
          content.classList.remove('fade-out');
          other.open = false;
          content.removeEventListener('animationend', handler);
        };
        content.addEventListener('animationend', handler);
      } else {
        other.open = false;
      }
    });
    if (location.hash && location.hash.startsWith("#fjala/")) {
      try {
        history.replaceState(null, "", location.pathname + location.search);
      } catch (err) {
        location.hash = "";
      }
      if (breadcrumbDiv) breadcrumbDiv.style.display = "none";
      if (backButton) backButton.style.display = "none";
    }
  });
  updateBackToTop();

  // Manual page loader: look for #manual-content and load manual.json or manual.md
  const manualRoot = document.getElementById('manual-content');
  function mdToHtml(md) {
    if (!md) return '';
    // basic block replacements
    let html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // fenced code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function(_, lang, code) {
      const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cls = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${cls}>${esc}</code></pre>`;
    });

    // inline code `code`
    html = html.replace(/`([^`]+)`/g, function(_, c) {
      const esc = c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code>${esc}</code>`;
    });
    // headings
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // lists
    html = html.replace(/(^|\n)- (.*)/gim, '$1<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    // bold/italic/underline
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/__(.*?)__/gim, '<u>$1</u>');
    // links [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');
    // paragraphs
    html = html.replace(/(^|\n)([^<\n][^\n]*)(\n|$)/gim, function(_, a, b){
      if (b.match(/^<h|^<ul|^<li|^<blockquote|^<pre/)) return _;
      return '\n<p>' + b.trim() + '</p>\n';
    });
    // unescape allowed tags inside (including span with attributes)
    return html.replace(/&lt;(\/)?(strong|em|u|h[1-6]|a|p|ul|li|span)([^&]*)&gt;/gi, '<$1$2$3>');
  }

  async function loadManual() {
    if (!manualRoot) return;
    // simple loader: try manual.json, then manual.md
    manualRoot.innerHTML = '<p>Loading manual...</p>';
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
          wrapper.innerHTML = content.replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>');
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

const toggle = document.getElementById("searchToggle");
const search = document.getElementById("search");
if (toggle && search) {
  toggle.addEventListener("click", () => {
    search.classList.toggle("active");
    if (search.classList.contains("active")) {
      search.focus();
    }
  });
}