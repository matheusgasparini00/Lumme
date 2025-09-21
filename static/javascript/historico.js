// Dados mockados
const financialData = {
  '2024-06': {
    salario: 4500,
    despesas: 2800,
    superavit: 1700,
    metas: [
      {
        id: 1,
        titulo: 'Reserva de emergência',
        valorAlvo: 10000,
        valorAtual: 6500,
        concluida: false,
        dataLimite: '2024-12-31'
      },
      {
        id: 2,
        titulo: 'Viagem para praia',
        valorAlvo: 3000,
        valorAtual: 3000,
        concluida: true,
        dataLimite: '2024-08-15'
      },
      {
        id: 3,
        titulo: 'Novo notebook',
        valorAlvo: 2500,
        valorAtual: 1200,
        concluida: false,
        dataLimite: '2024-10-01'
      }
    ]
  },
  '2024-05': {
    salario: 4500,
    despesas: 3200,
    superavit: 1300,
    metas: [
      {
        id: 1,
        titulo: 'Reserva de emergência',
        valorAlvo: 10000,
        valorAtual: 4800,
        concluida: false,
        dataLimite: '2024-12-31'
      },
      {
        id: 2,
        titulo: 'Viagem para praia',
        valorAlvo: 3000,
        valorAtual: 1800,
        concluida: false,
        dataLimite: '2024-08-15'
      }
    ]
  },
  '2024-04': {
    salario: 4500,
    despesas: 3500,
    superavit: 1000,
    metas: [
      {
        id: 1,
        titulo: 'Reserva de emergência',
        valorAlvo: 10000,
        valorAtual: 3500,
        concluida: false,
        dataLimite: '2024-12-31'
      }
    ]
  }
};

// Estado atual do mês selecionado
let selectedMonth = '2024-06';

// Função para formatar valores em moeda BRL
function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para formatar data para "Mês Ano"
function formatMonthYear(monthStr) {
  const date = new Date(monthStr + '-01');
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Renderiza os botões de seleção de mês
function renderMonthButtons() {
  const container = document.getElementById('month-buttons');
  container.innerHTML = '';

  Object.keys(financialData).forEach(month => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn me-2 mb-2 ' + (month === selectedMonth ? 'btn-primary' : 'btn-outline-primary');
    btn.textContent = formatMonthYear(month);
    btn.addEventListener('click', () => {
      selectedMonth = month;
      renderAll();
    });
    container.appendChild(btn);
  });
}

// Renderiza o resumo financeiro
function renderFinancialSummary() {
  const container = document.getElementById('financial-summary');
  container.innerHTML = '';

  const data = financialData[selectedMonth];
  if (!data) return;

  // Salário
  const salarioCard = document.createElement('div');
  salarioCard.className = 'col-md-4 mb-3';
  salarioCard.innerHTML = `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title">Salário</h5>
        <p class="card-text text-primary fs-4 fw-bold">${formatBRL(data.salario)}</p>
        <small class="text-muted">Total recebido no mês</small>
      </div>
    </div>
  `;

  // Despesas
  const despesasCard = document.createElement('div');
  despesasCard.className = 'col-md-4 mb-3';
  despesasCard.innerHTML = `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title">Despesas</h5>
        <p class="card-text text-danger fs-4 fw-bold">${formatBRL(data.despesas)}</p>
        <small class="text-muted">Total gasto no mês</small>
      </div>
    </div>
  `;

  // Superávit
  const superavitClass = data.superavit >= 0 ? 'superavit-positivo' : 'superavit-negativo';
  const superavitCard = document.createElement('div');
  superavitCard.className = 'col-md-4 mb-3';
  superavitCard.innerHTML = `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title">Superávit</h5>
        <p class="card-text fs-4 ${superavitClass}">${formatBRL(data.superavit)}</p>
        <small class="text-muted">Saldo positivo do mês</small>
      </div>
    </div>
  `;

  container.appendChild(salarioCard);
  container.appendChild(despesasCard);
  container.appendChild(superavitCard);
}

// Renderiza as metas financeiras
function renderFinancialGoals() {
  const container = document.getElementById('financial-goals');
  container.innerHTML = '';

  const data = financialData[selectedMonth];
  if (!data || !data.metas || data.metas.length === 0) {
    container.innerHTML = '<p class="text-muted">Nenhuma meta cadastrada para este período.</p>';
    return;
  }

  data.metas.forEach(meta => {
    const progresso = Math.min((meta.valorAtual / meta.valorAlvo) * 100, 100);

    const card = document.createElement('div');
    card.className = 'card-meta';

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5>${meta.titulo}</h5>
          <small class="text-muted">
            Meta: ${formatBRL(meta.valorAlvo)} • Prazo: ${new Date(meta.dataLimite).toLocaleDateString('pt-BR')}
          </small>
        </div>
        <span class="badge ${meta.concluida ? 'badge-concluida' : 'badge-andamento'}">
          ${meta.concluida ? 'Concluída' : 'Em andamento'}
        </span>
      </div>
      <div class="mb-2">
        <div class="d-flex justify-content-between small mb-1">
          <span>${formatBRL(meta.valorAtual)} de ${formatBRL(meta.valorAlvo)}</span>
          <span>${Math.round(progresso)}%</span>
        </div>
        <div class="progress">
          <div class="progress-bar ${meta.concluida ? 'bg-success' : 'bg-secondary'}" role="progressbar" style="width: ${progresso}%" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
      <div class="small text-muted">
        ${meta.concluida 
          ? '<span class="text-success">✓ Meta atingida com sucesso!</span>' 
          : `Faltam ${formatBRL(meta.valorAlvo - meta.valorAtual)} para concluir`}
      </div>
    `;

    container.appendChild(card);
  });
}

// Renderiza tudo
function renderAll() {
  renderMonthButtons();
  renderFinancialSummary();
  renderFinancialGoals();
}

// Inicializa a tela após o DOM estar carregado
document.addEventListener('DOMContentLoaded', () => {
  renderAll();
});

// Após a função renderAll ou no final do arquivo JS

document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  const printBtn = document.getElementById('print-report');
  printBtn.addEventListener('click', () => {
    window.print();
  });
});