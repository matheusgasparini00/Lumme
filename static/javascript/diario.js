document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addNoteBtn");

  addBtn.addEventListener("click", () => {
    const category = document.getElementById("noteCategory").value.trim();
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();

    if (!category || !title || !content) {
      alert("Preencha todos os campos!");
      return;
    }

    // Verificar se já existe seção para esta categoria
    let categorySection = document.querySelector(.category-section[data-category="${category}"]);
    
    if (!categorySection) {
      categorySection = document.createElement("div");
      categorySection.className = "category-section";
      categorySection.dataset.category = category;
      
      const categoryTitle = document.createElement("h3");
      categoryTitle.textContent = category;
      // Estilos para quebra de linha
      categoryTitle.style.wordBreak = "break-word";
      categoryTitle.style.overflowWrap = "break-word";
      categoryTitle.style.whiteSpace = "normal";
      categoryTitle.style.maxWidth = "100%";
      
      categorySection.appendChild(categoryTitle);
      document.getElementById("notesList").appendChild(categorySection);
    }

    // Criar nova anotação
    const note = document.createElement("div");
    note.className = "note-item";

    const noteTitle = document.createElement("h4");
    noteTitle.textContent = title;

    const noteContent = document.createElement("p");
    noteContent.textContent = content;
    noteContent.style.whiteSpace = "pre-wrap";
    noteContent.style.wordBreak = "break-word";
    noteContent.style.overflowWrap = "break-word";
    noteContent.style.overflow = "hidden";

    // Botão editar
    const editBtn = document.createElement("button");
    editBtn.textContent = "Editar";
    editBtn.className = "edit-btn";
    editBtn.addEventListener("click", () => {
      const newCategory = prompt("Nova categoria:", category);
      const newTitle = prompt("Novo título:", noteTitle.textContent);
      const newContent = prompt("Novo conteúdo:", noteContent.textContent);
      
      if (newCategory !== null && newCategory !== category) {
        note.remove();
        if (newCategory) {
          document.getElementById("noteCategory").value = newCategory;
          document.getElementById("noteTitle").value = newTitle || noteTitle.textContent;
          document.getElementById("noteContent").value = newContent || noteContent.textContent;
          addBtn.click();
        }
      } else {
        if (newTitle !== null) noteTitle.textContent = newTitle;
        if (newContent !== null) noteContent.textContent = newContent;
      }
    });

// Botão excluir (estilo igual ao metas.js)
const deleteBtn = document.createElement("button");
deleteBtn.className = "delete-button"; // mesma classe usada em metas.js
deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
deleteBtn.addEventListener("click", () => {
  if (confirm("Deseja realmente excluir esta anotação?")) {
    note.remove();
    const categorySection = note.parentElement;
    if (categorySection.querySelectorAll('.note-item').length === 0) {
      categorySection.remove();
    }
  }
});

    // Adicionar elementos
    note.appendChild(noteTitle);
    note.appendChild(noteContent);
    note.appendChild(editBtn);
    note.appendChild(deleteBtn);

    categorySection.appendChild(note);

    // Limpar campos
    document.getElementById("noteCategory").value = "";
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
  });
});