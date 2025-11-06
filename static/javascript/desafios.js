document.addEventListener('DOMContentLoaded', () => {
  const progressText = document.getElementById('progressText');
  const cardElems = Array.from(document.querySelectorAll('.challenge-card'));

  const CARD_ORDER = [
    'META_CREATED', 'PCT_25', 'PCT_50', 'PCT_75', 'PCT_100',
    'META2_CREATED', 'META2_50', 'META2_100'
  ];

  function aplicarEstadoCards(codesSet) {
    cardElems.forEach(el => {
      const code = el.dataset.cardCode;
      el.classList.toggle('completed', codesSet.has(code));
    });
    const total = cardElems.length;
    const completos = cardElems.filter(el => el.classList.contains('completed')).length;
    progressText.textContent = `🎉 Você completou ${completos} de ${total} desafios!`;
  }

  function parseAndSortGoals(data) {
    const toNum = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const goals = (Array.isArray(data) ? data : []).map(m => {

      const id = Number(m.id ?? m.meta_id ?? m.ID ?? 0);
      const target =
        toNum(m.targetAmount ?? m.target_amount ?? m.alvo ?? m.meta ?? m.valor_meta);
      const current =
        toNum(m.currentAmount ?? m.current_amount ?? m.atual ?? m.progresso ?? m.valor_atual);
      const createdAt = m.created_at ?? m.createdAt ?? m.data_criacao ?? null;
      return { id, target, current, createdAt };
    });

    goals.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        const da = new Date(a.createdAt), db = new Date(b.createdAt);
        const ta = isNaN(da) ? 0 : da.getTime();
        const tb = isNaN(db) ? 0 : db.getTime();
        if (ta !== tb) return ta - tb;
      }
      return a.id - b.id;
    });
    return goals;
  }

  function codesFromGoals(goals) {
  const codes = new Set();
  if (!goals.length) return codes;

  const first = goals[0];
  const second = goals.length >= 2 ? goals[1] : null;

  codes.add('META_CREATED');

  if (first) {
    const pctFirst = first.target > 0 ? (first.current / first.target) * 100 : 0;
    if (pctFirst >= 25) codes.add('PCT_25');
    if (pctFirst >= 50) codes.add('PCT_50');
    if (pctFirst >= 75) codes.add('PCT_75');
    if (first.target > 0 && first.current >= first.target) codes.add('PCT_100');
  }

  if (second) {
    codes.add('META2_CREATED'); 
    const pctSecond = second.target > 0 ? (second.current / second.target) * 100 : 0;
    if (pctSecond >= 50) codes.add('META2_50');
    if (second.target > 0 && second.current >= second.target) codes.add('META2_100');
  }

  return codes;
}

  async function carregar() {
    try {
      const [cardsRes, metasRes] = await Promise.allSettled([
        fetch('/metas/cards', { credentials: 'same-origin' }),
        fetch('/obter_metas', { credentials: 'same-origin' })
      ]);

      const codes = new Set();

      if (cardsRes.status === 'fulfilled' && cardsRes.value.ok) {
        const rows = await cardsRes.value.json();
        rows.forEach(r => { if (r && r.code) codes.add(String(r.code)); });
      }

      if (metasRes.status === 'fulfilled' && metasRes.value.ok) {
        const metasJson = await metasRes.value.json();
        const goals = parseAndSortGoals(metasJson);
        const goalCodes = codesFromGoals(goals);
        goalCodes.forEach(c => codes.add(c));
      }

      if (codes.size === 0) {
        throw new Error('Nenhuma fonte de progresso disponível');
      }

      aplicarEstadoCards(codes);
    } catch (err) {
      console.error('Erro ao carregar desafios:', err);
      progressText.textContent = 'Falha ao carregar progresso.';
    }
  }

  carregar();
  setInterval(carregar, 3000);
});
