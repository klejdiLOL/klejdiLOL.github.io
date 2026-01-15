const container = document.getElementById("dictionary");
const searchInput = document.getElementById("search");

let words = [];

fetch("words.json")
  .then(res => res.json())
  .then(data => {
    words = data.sort((a, b) =>
      a.word.localeCompare(b.word, "sq", { sensitivity: "base" })
    );
    render(words);
  });

function render(list) {
  container.innerHTML = "";

  list.forEach(item => {
    const entry = document.createElement("details");
    entry.className = "entry";

    entry.innerHTML = `
      <summary>${item.word}</summary>
      <div class="content">
        <p><strong>Përkufizim:</strong> ${item.definition}</p>
        ${item.example ? `<p><strong>Shembull:</strong> ${item.example}</p>` : ""}
      </div>
    `;

    container.appendChild(entry);
  });
}

searchInput.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();

  const filtered = words.filter(w =>
    w.word.toLowerCase().includes(q)
  );

  render(filtered);
});
