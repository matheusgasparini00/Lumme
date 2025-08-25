class FinancialTracker {
  constructor() {
    this.salary = 0;
    this.expenses = [];
    this.totalExpenses = 0;
    this.surplus = 0;
    this.init();
  }

  init() {
    this.fetchSavedBudget();
    this.bindEvents();
    this.updateDisplay();
  }

  bindEvents() {
    const addExpenseBtn = document.getElementById('add-expense-btn');
    if (addExpenseBtn) {
      addExpenseBtn.addEventListener('click', () => {
        this.addExpense();
      });
    }

    const expenseInputs = document.querySelectorAll('.expense-input');
    expenseInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addExpense();
        }
      });
    });

const salaryEdit = document.getElementById('salary-display');
if (salaryEdit) {
  salaryEdit.addEventListener('input', (e) => {
    const raw = e.target.value
      .replace(/\s/g, '')
      .replace(/R\$/i, '')
      .replace(/\./g, '')
      .replace(',', '.');

    if (raw === '') {
      this.salary = 0;
      return;
    }

const value = parseFloat(raw);
if (!isNaN(value) && value >= 0) {
  const limiteSalario = 1000000;
  this.salary = Math.min(value, limiteSalario);
  this.calculateTotals(false); 
}
});

  salaryEdit.addEventListener('blur', () => {
    salaryEdit.value = this.formatCurrency(this.salary);
    this.calculateTotals();
    this.updateDisplay();
  });
}

  }

  fetchSavedBudget() {
    fetch('/obter_orcamentos')
      .then(res => res.json())
      .then(data => {
        this.salary = parseFloat(data.salario) || 0;
        this.expenses = (data.despesas || []).map((d, index) => ({
          id: Date.now().toString() + index,
          name: d.name,
          amount: parseFloat(d.amount),
          date: this.formatDate(new Date())
        }));

        this.surplus = parseFloat(data.superavit) || 0;

        this.calculateTotals(false);
        this.updateDisplay();

const salaryOutput = document.getElementById('salary-input');
if (salaryOutput) salaryOutput.textContent = this.formatCurrency(this.salary);

const salaryEdit = document.getElementById('salary-display');
if (salaryEdit) salaryEdit.value = this.formatCurrency(this.salary);

      })
      .catch(err => console.error('Erro ao carregar orçamento salvo:', err));
  }

  addExpense() {
    const nameInput = document.getElementById('expense-name');
    const amountInput = document.getElementById('expense-amount');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value) || 0;

    if (name && amount > 0) {
      const expense = {
        id: Date.now().toString(),
        name: name,
        amount: amount,
        date: this.formatDate(new Date())
      };

      this.expenses.push(expense);
      this.calculateTotals();
      this.updateDisplay();

      nameInput.value = '';
      amountInput.value = '';

      this.updateAddButtonState();
    }
  }

  removeExpense(id) {
    this.expenses = this.expenses.filter(expense => expense.id !== id);
    this.calculateTotals();
    this.updateDisplay();
  }

  calculateTotals(updateSurplus = true) {
    this.totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    if (updateSurplus) {
      this.surplus = this.salary - this.totalExpenses;
    }
    this.salvarNoServidor(this.salary, this.totalExpenses, this.surplus);
  }

  salvarNoServidor(salario, despesa_total, superavit) {
    fetch('/salvar_orcamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ salario, despesa_total, superavit, despesas: this.expenses })
    })
      .then(res => res.json())
      .then(data => console.log('Resposta do servidor:', data))
      .catch(err => console.error('Erro ao salvar orçamento:', err));
  }

  updateDisplay() {
    this.updateCircularFields();
    this.updateExpenseList();
    this.updateSummary();
    this.updateAddButtonState();
    atualizarGrafico(this.expenses);
  }

  updateCircularFields() {
 const salaryDisplay = document.getElementById('salary-input');
if (salaryDisplay) {
  salaryDisplay.textContent = this.formatCurrency(this.salary);
}


    const expensesDisplay = document.getElementById('expenses-display');
    if (expensesDisplay) {
      expensesDisplay.textContent = this.formatCurrency(this.totalExpenses);
    }

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill && progressText) {
      const percentage = this.salary > 0 ? Math.min((this.totalExpenses / this.salary) * 100, 100) : 0;
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${percentage.toFixed(1)}% do salário`;
    }

    const surplusDisplay = document.getElementById('surplus-display');
    const surplusStatus = document.getElementById('surplus-status');
    if (surplusDisplay && surplusStatus) {
      surplusDisplay.textContent = this.formatCurrency(Math.abs(this.surplus));
      surplusDisplay.className = `surplus-value ${this.surplus >= 0 ? 'surplus-positive' : 'surplus-negative'}`;

      surplusStatus.textContent = this.surplus >= 0 ? 'Economia' : 'Déficit';
      surplusStatus.className = `surplus-status ${this.surplus >= 0 ? 'status-positive' : 'status-negative'}`;
    }
  }

  updateExpenseList() {
    const listTitle = document.getElementById('list-title');
    const expenseContainer = document.getElementById('expense-container');

    if (listTitle) {
      listTitle.textContent = `Lista de Despesas (${this.expenses.length})`;
    }

    if (expenseContainer) {
      if (this.expenses.length === 0) {
        expenseContainer.innerHTML = '<p class="empty-state">Nenhuma despesa cadastrada</p>';
      } else {
        expenseContainer.innerHTML = `
          <div class="expense-items">
            ${this.expenses.map(expense => `
              <div class="expense-item">
                <div class="expense-info">
                  <h3>${expense.name}</h3>
                  <p>${expense.date}</p>
                </div>
                <div class="expense-actions">
                  <span class="expense-amount">${this.formatCurrency(expense.amount)}</span>
                  <button class="delete-button" onclick="tracker.removeExpense('${expense.id}')">
                  <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
  }

  updateSummary() {
    const salaryTotal = document.getElementById('salary-total');
    if (salaryTotal) {
      salaryTotal.textContent = this.formatCurrency(this.salary);
    }

    const expensesTotal = document.getElementById('expenses-total');
    if (expensesTotal) {
      expensesTotal.textContent = this.formatCurrency(this.totalExpenses);
    }

    const balanceTotal = document.getElementById('balance-total');
    const balanceItem = document.getElementById('balance-item');
    if (balanceTotal && balanceItem) {
      balanceTotal.textContent = this.formatCurrency(this.surplus);
      balanceItem.className = `summary-item summary-balance ${this.surplus < 0 ? 'negative' : ''}`;
    }
  }

  updateAddButtonState() {
    const nameInput = document.getElementById('expense-name');
    const amountInput = document.getElementById('expense-amount');
    const addBtn = document.getElementById('add-expense-btn');

    if (nameInput && amountInput && addBtn) {
      const hasName = nameInput.value.trim().length > 0;
      const hasAmount = parseFloat(amountInput.value) > 0;
      addBtn.disabled = !(hasName && hasAmount);
    }
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatDate(date) {
    return date.toLocaleDateString('pt-BR');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.tracker = new FinancialTracker();

  const nameInput = document.getElementById('expense-name');
  const amountInput = document.getElementById('expense-amount');

  if (nameInput && amountInput) {
    [nameInput, amountInput].forEach(input => {
      input.addEventListener('input', () => {
        window.tracker.updateAddButtonState();
      });
    });
  }
});

class ExpenseChart {
  constructor(canvasId) {
    const canvas = document.getElementById(canvasId);
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.chart = null;
  }

  updateChart(expenses) {
    if (!this.ctx) return;

    const labels = expenses.map(item => item.name);
    const data = expenses.map(item => item.amount);
  }
}

let chart = null;

function atualizarGrafico(despesas) {
  const canvas = document.getElementById('expense-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const labels = despesas.map(e => e.name);
  const valores = despesas.map(e => parseFloat(e.amount));

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = valores;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: 'Despesas',
          data: valores,
          backgroundColor: [
            '#A339FA','#7A2BBA','#4f46e5','#501C7A','#3e046dff',
            '#025A9D','#0386E9','#0261AA','#024B83','#01355D',
            '#FFA90A','#FF8F1C', '#FF671C','#FF3F1C','#FF0D1D',
            '#FF0A40','#FC4D88','#FF1CD6','#CB1CFF','#811CFF',
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === 'superavitAtualizado') {
    if (window.tracker && typeof window.tracker.fetchSavedBudget === 'function') {
      console.log('Superavit atualizado detectado. Recarregando orçamento...');
      window.tracker.fetchSavedBudget();
    }
  }
});