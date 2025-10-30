let currentSurplus = 0;
let goals = [];
let editingGoalId = null; 

const surplusValueEl = document.getElementById('surplusValue');
const addGoalBtn = document.getElementById('addGoalBtn');
const goalForm = document.getElementById('goalForm');
const goalNameInput = document.getElementById('goalName');
const goalAmountInput = document.getElementById('goalAmount');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const goalsList = document.getElementById('goalsList');

// ---------- util de exibição ----------
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

// ---------- carregar superávit ----------
function fetchSurplus() {
  fetch('/obter_orcamentos', { credentials: 'same-origin'})
    .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
    .then(data => {
      currentSurplus = parseFloat(data.superavit) || 0;
      updateSurplusDisplay();
    })
    .catch(err => console.error('Erro ao carregar superavit:', err));
}

function updateSurplusDisplay() {
  surplusValueEl.textContent = formatCurrency(currentSurplus);
}

// ---------- abrir/fechar form ----------
addGoalBtn.addEventListener('click', () => {
  goalForm.style.display = 'block';
  goalNameInput.focus();
});

cancelBtn.addEventListener('click', () => {
  editingGoalId = null;
  saveGoalBtn.textContent = 'Salvar Meta';
  goalForm.style.display = 'none';
  goalNameInput.value = '';
  goalAmountInput.value = '';
});

// ---------- MÁSCARA DE MOEDA (R$) ----------
/**
 * Converte string "R$ 1.234,56" para número 1234.56
 */
function parseCurrencyToNumber(value) {
  if (!value) return 0;
  return parseFloat(
    value.replace(/\s/g, '')
         .replace('R$', '')
         .replace(/\./g, '')
         .replace(',', '.')
  ) || 0;
}

/**
 * Formata input enquanto digita com padrão BR (milhar com ponto e decimais com vírgula),
 * mantendo "R$ " visível quando focado/digitando.
 */
function formatCurrencyInput(input) {
  // pega somente dígitos
  let digits = input.value.replace(/\D/g, '');
  if (digits === '') {
    input.value = '';
    return;
  }
  // transforma em centavos (2 casas)
  const cents = (parseInt(digits, 10) / 100).toFixed(2);

  // formata em pt-BR
  const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(cents);

  // sempre mostra com prefixo R$
  input.value = `R$ ${formatted}`;
}

/**
 * Aplica máscara no input: mostra "R$ " ao focar e formata conforme digitação
 */
function attachCurrencyMask(input) {
  input.setAttribute('inputmode', 'numeric'); // teclado numérico no mobile
  input.addEventListener('focus', () => {
    if (input.value.trim() === '') input.value = 'R$ ';
  });

  input.addEventListener('input', () => {
    // mantém apenas o que importa e re-formata
    formatCurrencyInput(input);
  });

  input.addEventListener('blur', () => {
    // se vazio, limpa de vez (sem R$)
    const n = parseCurrencyToNumber(input.value);
    if (!n) input.value = '';
  });

  // permite colar valores "soltos" e normaliza
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const onlyDigits = text.replace(/\D/g, '');
    input.value = onlyDigits;
    formatCurrencyInput(input);
  });

  // bloqueia letras e símbolos invá­lidos
  input.addEventListener('keydown', (e) => {
    // permite navegação/edição
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab'];
    if (allowed.includes(e.key)) return;

    // permite números do teclado principal e numpad
    if (/^[0-9]$/.test(e.key)) return;

    // bloqueia o resto (inclui vírgula e ponto — a máscara cuida disso)
    e.preventDefault();
  });
}

// aplica no campo de criação
attachCurrencyMask(goalAmountInput);

// ---------- salvar meta ----------
saveGoalBtn.addEventListener('click', () => {
  const name = goalNameInput.value.trim();
  let amount = parseCurrencyToNumber(goalAmountInput.value);

  if (!name || name.length < 3 || name.length > 40 || isNaN(amount) || amount <= 0) {
    alert('Preencha os campos corretamente (nome até 40 caracteres e valor positivo).');
    return;
  }

  if (amount > 1000000) amount = 1000000;

  if (editingGoalId) {
    const goal = goals.find(g => g.id === editingGoalId);
    if (goal) {
      goal.name = name;
      goal.targetAmount = amount;
    }

    fetch('/atualizar_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: editingGoalId, titulo: name, valor_objetivo: amount })
    }).catch(err => console.error('Erro ao atualizar meta:', err));

    editingGoalId = null;
    saveGoalBtn.textContent = 'Salvar Meta';
  } else {
    fetch('/salvar_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ titulo: name, valor_objetivo: amount })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'sucesso') {
        carregarMetas();
      } else {
        console.error('Erro ao salvar meta no banco:', data.mensagem);
      }
    })
    .catch(err => console.error('Erro de rede ao salvar meta:', err));
  }

  goalNameInput.value = '';
  goalAmountInput.value = '';
  goalForm.style.display = 'none';
});

// ---------- renderização ----------
function renderGoals() {
  goalsList.innerHTML = '';

  const sortedGoals = [...goals].sort((a, b) => a.completed - b.completed);

  sortedGoals.forEach(goal => {
    const progress = goal.currentAmount / goal.targetAmount;
    const progressPercent = Math.min(100, Math.round(progress * 100));

    const goalItem = document.createElement('div');
    goalItem.className = `goal-item ${goal.completed ? 'completed' : ''}`;
    goalItem.dataset.id = goal.id;

    goalItem.innerHTML = `
      <div class="goal-header">
        <div class="goal-title">${goal.name}</div>
        <div class="goal-amount">
          ${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-text">${progressPercent}% concluído</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      <div class="goal-actions">
        ${!goal.completed ? `
          <input type="text" class="funds-input" id="funds-${goal.id}" placeholder="Valor para alimentar">
          <button class="add-funds-btn" data-id="${goal.id}">Alimentar Meta</button>
          <button class="complete-btn" data-id="${goal.id}">Concluir</button>
        ` : ''}
        <button class="edit-button" data-id="${goal.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-button" data-id="${goal.id}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;

    goalsList.appendChild(goalItem);
  });

  document.querySelectorAll('.add-funds-btn').forEach(btn => {
    btn.addEventListener('click', addFundsToGoal);
  });
  document.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', completeGoal);
  });
  document.querySelectorAll('.delete-button').forEach(btn => {
    btn.addEventListener('click', deleteGoal);
  });
  document.querySelectorAll('.edit-button').forEach(btn => {
    btn.addEventListener('click', editGoal);
  });

  // aplica máscara em TODOS os campos de alimentar meta recém-renderizados
  applyMaskToFundsInputs();
}

// aplica máscara aos inputs de alimentação
function applyMaskToFundsInputs() {
  document.querySelectorAll('.funds-input').forEach(input => {
    attachCurrencyMask(input);
  });
}

// ---------- ações ----------
function editGoal(e) {
  const goalId = parseInt(e.currentTarget.dataset.id);
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;

  editingGoalId = goalId;
  goalForm.style.display = 'block';
  goalNameInput.value = goal.name;
  // mostra já formatado no campo
  goalAmountInput.value = `R$ ${goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  saveGoalBtn.textContent = 'Salvar Alterações';
  goalNameInput.focus();
}

function addFundsToGoal(e) {
  const goalId = parseInt(e.target.dataset.id);
  const goal = goals.find(g => g.id === goalId);
  const inputEl = document.getElementById(`funds-${goalId}`);
  const amount = parseCurrencyToNumber(inputEl.value);

  if (isNaN(amount) || amount <= 0) {
    alert('Por favor, insira um valor válido.');
    return;
  }

  const remainingAmount = goal.targetAmount - goal.currentAmount;
  const amountToAdd = Math.min(amount, remainingAmount);

  if (amountToAdd > currentSurplus) {
    alert('Você não tem superávit suficiente para adicionar este valor.');
    return;
  }

  goal.currentAmount += amountToAdd;
  currentSurplus -= amountToAdd;

  if (goal.currentAmount >= goal.targetAmount) {
    goal.completed = true;
  }

  fetch('/atualizar_meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ id: goal.id, valor_atual: goal.currentAmount })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status !== 'sucesso') {
      console.error('Erro ao atualizar meta no banco:', data.mensagem);
    }
  })
  .catch(err => console.error('Erro na rede ao atualizar meta:', err));

  salvarSuperavitNoBanco();
  updateSurplusDisplay();
  renderGoals();
  inputEl.value = ''; // limpa depois de alimentar
}

function completeGoal(e) {
  const goalId = parseInt(e.target.dataset.id);
  const goal = goals.find(g => g.id === goalId);
  goal.completed = true;
  renderGoals();
}

function deleteGoal(e) {
  const button = e.target.closest('button[data-id]');
  if (!button) return;
  if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

  const goalId = parseInt(button.dataset.id);

  fetch(`/deletar_meta/${goalId}`, {
    method: 'DELETE',
    credentials: 'same-origin'
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'sucesso') {
      carregarMetas(); 
    } else {
      console.error('Erro ao deletar meta:', data.mensagem);
    }
  })
  .catch(err => console.error('Erro de rede ao deletar meta:', err));
}

// ---------- carregar metas ----------
function carregarMetas() {
  fetch('/obter_metas', { credentials: 'same-origin' })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        goals = data.map(m => ({
          id: m.id,
          name: m.name,
          targetAmount: parseFloat(m.targetAmount),
          currentAmount: parseFloat(m.currentAmount),
          completed: parseFloat(m.currentAmount) >= parseFloat(m.targetAmount)
        }));
        renderGoals();

        if (window.tracker) {
          window.tracker.goals = goals;
          window.tracker.calculateTotals();
          window.tracker.updateDisplay();
        }
      } else {
        console.error('Erro ao carregar metas:', data.mensagem);
      }
    })
    .catch(err => console.error('Erro ao buscar metas:', err));
}

// ---------- persistência de superávit ----------
function salvarSuperavitNoBanco() {
  fetch('/atualizar_superavit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ superavit: currentSurplus })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status !== 'sucesso') {
      console.error('Erro ao salvar superavit no banco:', data.mensagem);
    } else {
      localStorage.setItem('superavitAtualizado', Date.now());
    }
  })
  .catch(err => console.error('Erro na rede ao salvar superavit:', err));
}

// ---------- boot ----------
document.addEventListener('DOMContentLoaded', () => {
  fetchSurplus();
  carregarMetas();
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('financialGoals', JSON.stringify(goals));
  });
});
