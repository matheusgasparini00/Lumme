function mostrarMensagem(texto, categoria) {
  const div = document.createElement('div');
  div.classList.add('flash-message');

  if (categoria === 'erro') {
    div.classList.add('erro');
  } else if (categoria === 'alerta') {
    div.classList.add('alerta');
  } else if (categoria === 'sucesso') {
    div.classList.add('sucesso');
  } else {
    div.classList.add(categoria);
  }

  div.textContent = texto;
  document.body.appendChild(div);

  if (categoria === 'sucesso' && document.querySelector('form[action*="cadastro"]')) {
    const formCadastro = document.querySelector('form[action*="cadastro"]');
    formCadastro.style.display = 'none';

    setTimeout(() => div.remove(), 2000);
  }
  else if (categoria === 'sucesso' && document.querySelector('form[action*="login"]')) {
    setTimeout(() => {
      div.remove();
      window.location.href = "/index";
    }, 1000);
  }
  else {
    setTimeout(() => div.remove(), 2000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const mensagens = document.querySelectorAll('#mensagens-flash .flash');
  mensagens.forEach(el => {
    const texto = el.textContent.trim();
    const categoria = el.dataset.categoria;
    mostrarMensagem(texto, categoria);
  });
});
