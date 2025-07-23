class FinancialTracker {
  constructor() {
    this.salary = 0;
    this.expenses = [];
    this.totalExpenses = 0;
    this.surplus = 0;
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateDisplay();
  }

  bindEvents() {
    const salaryInput = document.getElementById('salary-input');
    if (salaryInput) {
      salaryInput.addEventListener('input', (e) => {
        this.salary = parseFloat(e.target.value) || 0;
        this.calculateTotals();
        this.updateDisplay();
      });
    }

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

  calculateTotals() {
    this.totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    this.surplus = this.salary - this.totalExpenses;
  }

  updateDisplay() {
    this.updateCircularFields();
    this.updateExpenseList();
    this.updateSummary();
    this.updateAddButtonState();
  }

  updateCircularFields() {
    const salaryDisplay = document.getElementById('salary-display');
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
                    🗑️
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
