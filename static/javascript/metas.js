let currentSurplus = 0;
let goals = [];

const surplusValueEl = document.getElementById('surplusValue');
const addGoalBtn = document.getElementById('addGoalBtn');
const goalForm = document.getElementById('goalForm');
const goalNameInput = document.getElementById('goalName');
const goalAmountInput = document.getElementById('goalAmount');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const goalsList = document.getElementById('goalsList');

function fetchSurplus() {
    currentSurplus = 5000.00;
    updateSurplusDisplay();
}

function updateSurplusDisplay() {
    surplusValueEl.textContent = `R$ ${currentSurplus.toFixed(2).replace('.', ',')}`;
}

addGoalBtn.addEventListener('click', () => {
    goalForm.style.display = 'block';
    goalNameInput.focus();
});

cancelBtn.addEventListener('click', () => {
    goalForm.style.display = 'none';
    goalNameInput.value = '';
    goalAmountInput.value = '';
});

saveGoalBtn.addEventListener('click', () => {
    const name = goalNameInput.value.trim();
    const amount = parseFloat(goalAmountInput.value);

    if (!name || isNaN(amount) || amount <= 0) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }

    const newGoal = {
        id: Date.now(),
        name,
        targetAmount: amount,
        currentAmount: 0,
        completed: false
    };

    goals.push(newGoal);
    renderGoals();

    goalNameInput.value = '';
    goalAmountInput.value = '';
    goalForm.style.display = 'none';
});

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
                    R$ ${goal.currentAmount.toFixed(2).replace('.', ',')} / 
                    R$ ${goal.targetAmount.toFixed(2).replace('.', ',')}
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
                    <input type="number" class="funds-input" id="funds-${goal.id}" placeholder="Valor" min="0" step="0.01">
                    <button class="add-funds-btn" data-id="${goal.id}">Alimentar Meta</button>
                    <button class="complete-btn" data-id="${goal.id}">Concluir</button>
                ` : ''}
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
}

function addFundsToGoal(e) {
    const goalId = parseInt(e.target.dataset.id);
    const goal = goals.find(g => g.id === goalId);
    const inputEl = document.getElementById(`funds-${goalId}`);
    const amount = parseFloat(inputEl.value);

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

    updateSurplusDisplay();
    renderGoals();
    inputEl.value = '';
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

    if (!confirm('Tem certeza que deseja excluir esta meta?')) {
        return;
    }

    const goalId = parseInt(button.dataset.id);
    const goalIndex = goals.findIndex(g => g.id === goalId);

    if (goalIndex !== -1) {
        currentSurplus += goals[goalIndex].currentAmount;
        goals.splice(goalIndex, 1);
        updateSurplusDisplay();
        renderGoals();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchSurplus();
    const savedGoals = localStorage.getItem('financialGoals');
    if (savedGoals) {
        goals = JSON.parse(savedGoals);
        renderGoals();
    }

    window.addEventListener('beforeunload', () => {
        localStorage.setItem('financialGoals', JSON.stringify(goals));
    });
});
