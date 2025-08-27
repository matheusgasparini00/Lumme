document.addEventListener('DOMContentLoaded', () => {
  const challenge1 = document.getElementById('challenge1');
  const challenge2 = document.getElementById('challenge2');
  const challenge3 = document.getElementById('challenge3');
  const challenge4 = document.getElementById('challenge4');
  const challenge5 = document.getElementById('challenge5');
  const progressText = document.getElementById('progressText');

  let goals = [];

  function carregarMetas() {
    fetch('/obter_metas', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          goals = data.map(m => ({
            id: m.id,
            name: m.name,
            targetAmount: parseFloat(m.targetAmount) || 0,
            currentAmount: parseFloat(m.currentAmount) || 0,
            completed: (parseFloat(m.currentAmount) || 0) >= (parseFloat(m.targetAmount) || 1)
          }));
          verificarDesafios();
        } else {
          console.error('Erro ao carregar metas:', data?.mensagem || 'Dados inválidos');
          progressText.textContent = 'Erro ao carregar dados.';
        }
      })
      .catch(err => {
        console.error('Erro ao buscar metas:', err);
        progressText.textContent = 'Falha ao carregar progresso.';
      });
  }

  function verificarDesafios() {
    const totalGoals = goals.length;
    const hasGoals = totalGoals > 0;

    const bestGoal = hasGoals
      ? goals.reduce((a, b) => {
          const progressA = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
          const progressB = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
          return progressA > progressB ? a : b;
        })
      : null;

    const progress = bestGoal ? bestGoal.currentAmount / bestGoal.targetAmount : 0;
    const completedGoals = goals.filter(g => g.completed).length;

    challenge1.classList.toggle('completed', hasGoals);
    challenge2.classList.toggle('completed', progress >= 0.25);
    challenge3.classList.toggle('completed', progress >= 0.5);
    challenge4.classList.toggle('completed', progress >= 0.75);
    challenge5.classList.toggle('completed', completedGoals > 0);

    const completedCount = [
      hasGoals,
      progress >= 0.25,
      progress >= 0.5,
      progress >= 0.75,
      completedGoals > 0
    ].filter(Boolean).length;

    progressText.textContent = `🎉 Você completou ${completedCount} de 5 desafios!`;
  }

  carregarMetas();

  setInterval(carregarMetas, 3000);
});