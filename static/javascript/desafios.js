document.addEventListener('DOMContentLoaded', () => {
  const progressText = document.getElementById('progressText');
  const cardElems = Array.from(document.querySelectorAll('.challenge-card'));

  // Ordem oficial (para contagem de 5/5)
  const CARD_ORDER = ['META_CREATED', 'PCT_25', 'PCT_50', 'PCT_75', 'PCT_100'];

  function aplicarEstadoCards(codesSet) {
    let completedCount = 0;

    cardElems.forEach(el => {
      const code = el.dataset.cardCode;
      const done = codesSet.has(code);
      el.classList.toggle('completed', done);
    });

    completedCount = CARD_ORDER.reduce((acc, code) => acc + (codesSet.has(code) ? 1 : 0), 0);
    progressText.textContent = `🎉 Você completou ${completedCount} de 5 desafios!`;
  }

  async function carregarCards() {
    try {
      const res = await fetch('/metas/cards', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();

      // rows: [{ meta_id, code, label, threshold_percent, unlocked_at }, ...]
      const codes = new Set(rows.map(r => r.code));
      aplicarEstadoCards(codes);
    } catch (e) {
      // Fallback: se /metas/cards falhar, usa o progresso das metas
      console.warn('Falha em /metas/cards, usando fallback /obter_metas:', e);
      carregarFallbackPorMetas();
    }
  }

  async function carregarFallbackPorMetas() {
    try {
      const res = await fetch('/obter_metas', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!Array.isArray(data)) throw new Error('Formato inválido em /obter_metas');

      const goals = data.map(m => ({
        id: m.id,
        target: parseFloat(m.targetAmount) || 0,
        current: parseFloat(m.currentAmount) || 0
      }));

      const hasGoals = goals.length > 0;
      const any100 = goals.some(g => g.target > 0 && g.current >= g.target);

      // Melhor progresso entre as metas
      const best = hasGoals ? goals.reduce((a, b) => {
        const pa = a.target > 0 ? a.current / a.target : 0;
        const pb = b.target > 0 ? b.current / b.target : 0;
        return pa > pb ? a : b;
      }) : null;

      const pct = best && best.target > 0 ? (best.current / best.target) * 100 : 0;

      const codes = new Set();
      if (hasGoals) codes.add('META_CREATED');
      if (pct >= 25) codes.add('PCT_25');
      if (pct >= 50) codes.add('PCT_50');
      if (pct >= 75) codes.add('PCT_75');
      if (any100) codes.add('PCT_100');

      aplicarEstadoCards(codes);
    } catch (err) {
      console.error('Erro no fallback /obter_metas:', err);
      progressText.textContent = 'Falha ao carregar progresso.';
    }
  }

  // Primeira carga e polling leve (a cada 3s)
  carregarCards();
  setInterval(carregarCards, 3000);
});
