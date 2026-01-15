const list = document.getElementById("wordList");
const search = document.getElementById("search");
const themeBtn = document.getElementById("themeToggle");

// Theme
if (localStorage.theme === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️";
}

themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.theme = dark ? "dark" : "light";
  themeBtn.textContent = dark ? "☀️" : "🌙";
};

// Load words
let words = [];

fetch("words.json")
  .then(res => res.json())
  .then(data => {
    words = data;
    render(words);
  });

function render(data) {
  list.innerHTML = "";
  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "word";
    div.innerHTML = `
      <h2>${item.word}</h2>
      <p><strong>Përkufizim:</strong> ${item.definition}</p>
      ${item.example ? `<p><strong>Shembull:</strong> ${item.example}</p>` : ""}
    `;
    div.onclick = () => div.classList.toggle("open");
    list.appendChild(div);
  });
}

// Search
search.addEventListener("input", e => {
  const value = e.target.value.toLowerCase();
  const filtered = words.filter(w =>
    w.word.toLowerCase().includes(value)
  );
  render(filtered);
});
