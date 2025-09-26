function parseBRLToNumber(str) {
  if (typeof str !== 'string') return 0;
  const digits = str.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

function formatBRL(n) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(n);
}

function setupCurrencyInputWithPrefix(input) {
  if (!input) return;
  const prefix = "R$ ";

  input.addEventListener("focus", () => {
    if (!input.value.startsWith(prefix)) {
      input.value = prefix;
    }
    moveCursorToEnd(input);
  });

  input.addEventListener("input", (e) => {
    let num = parseBRLToNumber(e.target.value);
    if (num > 1000000) num = 1000000;
    input.value = num ? formatBRL(num) : prefix;
    moveCursorToEnd(input);
  });

  input.addEventListener("blur", () => {
    const val = parseBRLToNumber(input.value);
    if (val > 1000000) {
      input.value = formatBRL(1000000);
    }
    if (input.value === prefix) {
      input.value = "";
    }
  });

  function moveCursorToEnd(el) {
    requestAnimationFrame(() => {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  }
}

class FinancialTracker {
  constructor() {
    this.salary = 0;
    this.expenses = [];
    this.goals = [];
    this.totalExpenses = 0;
    this.totalGoals = 0;
    this.surplus = 0;
    this.editingExpenseId = null; 
    this.init();
  }

  init() {
    this.fetchSavedBudget();
    this.bindEvents();
    this.updateDisplay();
  }

  bindEvents() {
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    if (addExpenseBtn) {
      addExpenseBtn.addEventListener('click', () => {
        if (this.editingExpenseId) {
          this.saveExpense(this.editingExpenseId);
        } else {
          this.addExpense();
        }
      });
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => this.cancelEdit());
    }

    const expenseInputs = document.querySelectorAll('.expense-input');
    expenseInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (this.editingExpenseId) {
            this.saveExpense(this.editingExpenseId);
          } else {
            this.addExpense();
          }
        }
      });
    });

    const addSalaryBtn = document.getElementById('add-salary-btn');
    if (addSalaryBtn) {
      addSalaryBtn.addEventListener('click', () => {
        const salaryEdit = document.getElementById('salary-display');
        if (!salaryEdit) return;

        let value = parseBRLToNumber(salaryEdit.value);
        if (value <= 0) return;
        if (value > 1000000) value = 1000000;

        this.salary += value;
        this.calculateTotals();
        this.updateDisplay();
        salaryEdit.value = '';
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
        if (salaryEdit) salaryEdit.value = '';

        const prevSurplusEl = document.getElementById('previous-surplus-display');
        if (prevSurplusEl) {
          prevSurplusEl.textContent = this.formatCurrency(data.superavit_anterior || 0);
        }
      })
      .catch(err => console.error('Erro ao carregar orçamento salvo:', err));
  }

  addExpense() {
    const nameInput = document.getElementById('expense-name');
    const amountInput = document.getElementById('expense-amount');

    const name = nameInput.value.trim();
    const amount = parseBRLToNumber(amountInput.value);

    if (name.length >= 3 && name.length <= 40 && amount > 0 && amount <= 1000000) {
      const expense = {
        id: Date.now().toString(),
        name,
        amount,
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

  editExpense(id) {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return;

    this.editingExpenseId = id;
    document.getElementById('expense-name').value = expense.name;
    document.getElementById('expense-amount').value = formatBRL(expense.amount);

    document.getElementById('add-expense-btn').textContent = "Salvar alterações";
    document.getElementById('cancel-edit-btn').style.display = "inline-block";
  }

  saveExpense(id) {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return;

    const nameEl = document.getElementById('expense-name');
    const amountEl = document.getElementById('expense-amount');
    const newName = nameEl.value.trim();
    const newAmount = parseBRLToNumber(amountEl.value);

    if (newName.length >= 3 && newName.length <= 40 && newAmount > 0 && newAmount <= 1000000) {
      expense.name = newName;
      expense.amount = newAmount;
      this.editingExpenseId = null;

      nameEl.value = '';
      amountEl.value = '';
      document.getElementById('add-expense-btn').textContent = "Adicionar";
      document.getElementById('cancel-edit-btn').style.display = "none";

      this.calculateTotals();
      this.updateDisplay();
    }
  }

  cancelEdit() {
    this.editingExpenseId = null;
    document.getElementById('expense-name').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('add-expense-btn').textContent = "Adicionar";
    document.getElementById('cancel-edit-btn').style.display = "none";
  }

  removeExpense(id) {
    this.expenses = this.expenses.filter(expense => expense.id !== id);
    this.calculateTotals();
    this.updateDisplay();
  }

  calculateTotals(updateSurplus = true) {
    this.totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    this.totalGoals = this.goals.reduce((sum, g) => sum + g.currentAmount, 0);
    if (updateSurplus) {
      this.surplus = this.salary - this.totalExpenses - this.totalGoals;
    }
    this.salvarNoServidor(this.salary, this.totalExpenses, this.surplus);
  }

  salvarNoServidor(salario, despesa_total, superavit) {
    fetch('/salvar_orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salario,
        despesa_total,
        superavit,
        despesas: this.expenses
      })
    }).catch(err => console.error("Erro ao salvar orçamento:", err));
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
    if (salaryDisplay) salaryDisplay.textContent = this.formatCurrency(this.salary);

    const expensesDisplay = document.getElementById('expenses-display');
    if (expensesDisplay) expensesDisplay.textContent = this.formatCurrency(this.totalExpenses);

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

    if (listTitle) listTitle.textContent = `Lista de Despesas (${this.expenses.length})`;

    if (expenseContainer) {
      if (this.expenses.length === 0) {
        expenseContainer.innerHTML = '<p class="empty-state">Nenhuma despesa cadastrada</p>';
      } else {
        expenseContainer.innerHTML = `
          <div class="expense-items">
            ${this.expenses.map(expense => `
              <div class="expense-item" data-id="${expense.id}">
                <div class="expense-info">
                  <h3>${expense.name}</h3>
                  <p>${expense.date}</p>
                </div>
                <div class="expense-actions">
                  <span class="expense-amount">${this.formatCurrency(expense.amount)}</span>
                  <button class="edit-button" onclick="tracker.editExpense('${expense.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
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
    if (salaryTotal) salaryTotal.textContent = this.formatCurrency(this.salary);

    const expensesTotal = document.getElementById('expenses-total');
    if (expensesTotal) expensesTotal.textContent = this.formatCurrency(this.totalExpenses);

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
      const hasName = nameInput.value.trim().length >= 3;
      const hasAmount = parseBRLToNumber(amountInput.value) > 0;
      addBtn.disabled = !(hasName && hasAmount);
    }
  }

  formatCurrency(value) {
    return formatBRL(value);
  }

  formatDate(date) {
    return date.toLocaleDateString('pt-BR');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.tracker = new FinancialTracker();
  const nameInput = document.getElementById('expense-name');
  const amountInput = document.getElementById('expense-amount');
  const salaryInput = document.getElementById('salary-display');

  if (nameInput && amountInput) {
    [nameInput, amountInput].forEach(input => {
      input.addEventListener('input', () => window.tracker.updateAddButtonState());
    });
  }

  setupCurrencyInputWithPrefix(salaryInput);
  setupCurrencyInputWithPrefix(amountInput);
});

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
            '#FFA90A','#FF8F1C','#FF671C','#FF3F1C','#FF0D1D',
            '#FF0A40','#FC4D88','#FF1CD6','#CB1CFF','#811CFF',
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === 'superavitAtualizado') {
    if (window.tracker && typeof window.tracker.fetchSavedBudget === 'function') {
      window.tracker.fetchSavedBudget();
    }
  }
});
