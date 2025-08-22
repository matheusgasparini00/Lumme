document.addEventListener("DOMContentLoaded", () => {
  const botoes = document.querySelectorAll("#botoes-categorias button");
  const inputCategoria = document.getElementById("noteCategory");
  const addBtn = document.getElementById("addNoteBtn");
  const notesList = document.getElementById("notesList");
  const titleInput = document.getElementById("noteTitle");
  const contentInput = document.getElementById("noteContent");

  let editId = null;

  function slugFromCategory(cat) {
  const map = {
    "Alimentação": "cat-alimentacao",
    "Transporte": "cat-transporte",
    "Lazer": "cat-lazer",
    "Saúde": "cat-saude",
    "Educação": "cat-educacao",
    "Outros": "cat-outros"
  };
  return map[cat] || "cat-outros";
}

  botoes.forEach(botao => {
    botao.addEventListener("click", () => {
      botoes.forEach(b => b.classList.remove("selecionado"));
      botao.classList.add("selecionado");
      inputCategoria.value = botao.dataset.cat;
    });
  });

  function renderNotas(notas) {
    notesList.innerHTML = "<h2>Minhas Anotações</h2>";

    const grupos = {};
    notas.forEach(n => {
      grupos[n.categoria] = grupos[n.categoria] || [];
      grupos[n.categoria].push(n);
    });

    Object.keys(grupos).sort().forEach(cat => {
      const categorySection = document.createElement("div");
      categorySection.className = "category-section";
      categorySection.dataset.category = cat;

      const categoryTitle = document.createElement("h3");
      categoryTitle.textContent = cat;
      categorySection.appendChild(categoryTitle);

      grupos[cat].forEach(n => {
        const note = document.createElement("div");
        note.className = `note-item ${slugFromCategory(n.categoria)}`;


        const noteTitle = document.createElement("h4");
        noteTitle.textContent = n.titulo;

        const noteContent = document.createElement("p");
        noteContent.textContent = n.texto;
        noteContent.style.whiteSpace = "pre-wrap";

        const editBtn = document.createElement("button");
        editBtn.textContent = "Editar";
        editBtn.className = "edit-btn";
        editBtn.addEventListener("click", () => {
          inputCategoria.value = n.categoria;
          titleInput.value = n.titulo;
          contentInput.value = n.texto;
          botoes.forEach(b => {
            if (b.dataset.cat === n.categoria) b.classList.add("selecionado");
            else b.classList.remove("selecionado");
          });
          editId = n.id;
          addBtn.textContent = "Salvar alterações";
          titleInput.focus();
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Deseja realmente excluir esta anotação?")) return;
          const r = await fetch(`/api/diario/notes/${n.id}`, { method: 'DELETE' });
          if (r.ok) {
            carregarNotas();
          } else {
            alert("Erro ao excluir.");
          }
        });

        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";
        btnContainer.style.marginTop = "10px";

        btnContainer.appendChild(editBtn);
        btnContainer.appendChild(deleteBtn);

        note.appendChild(noteTitle);
        note.appendChild(noteContent);
        note.appendChild(btnContainer);

        categorySection.appendChild(note);
      });

      notesList.appendChild(categorySection);
    });

    if (notas.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhuma anotação encontrada.";
      notesList.appendChild(empty);
    }
  }

  async function carregarNotas() {
    const r = await fetch('/api/diario/notes');
    if (!r.ok) {
      alert("Erro ao carregar anotações.");
      return;
    }
    const notas = await r.json();
    renderNotas(notas);
  }

  async function criarNota(body) {
    const r = await fetch('/api/diario/notes', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    return r.ok;
  }

  async function atualizarNota(id, body) {
    const r = await fetch(`/api/diario/notes/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    return r.ok;
  }

  addBtn.addEventListener("click", async () => {
    const categoria = (document.getElementById("noteCategory").value || "").trim();
    const titulo = (document.getElementById("noteTitle").value || "").trim();
    const texto = (document.getElementById("noteContent").value || "").trim();

    if (!categoria || !titulo || !texto) {
      alert("Preencha todos os campos!");
      return;
    }

    const body = { categoria, titulo, texto };

    let ok = false;
    if (editId) {
      ok = await atualizarNota(editId, body);
    } else {
      ok = await criarNota(body);
    }

    if (ok) {
      document.getElementById("noteCategory").value = "";
      document.getElementById("noteTitle").value = "";
      document.getElementById("noteContent").value = "";
      botoes.forEach(b => b.classList.remove("selecionado"));
      editId = null;
      addBtn.textContent = "Adicionar";
      carregarNotas();
    } else {
      alert("Erro ao salvar anotação.");
    }
  });

  carregarNotas();
});
