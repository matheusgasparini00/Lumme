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

  // Normaliza e ordena metas (por created_at se existir; senão por id)
  function parseAndSortGoals(data) {
    const toNum = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const goals = (Array.isArray(data) ? data : []).map(m => {
      // Suporte a diferentes nomes de campos
      const id = Number(m.id ?? m.meta_id ?? m.ID ?? 0);
      const target =
        toNum(m.targetAmount ?? m.target_amount ?? m.alvo ?? m.meta ?? m.valor_meta);
      const current =
        toNum(m.currentAmount ?? m.current_amount ?? m.atual ?? m.progresso ?? m.valor_atual);
      const createdAt = m.created_at ?? m.createdAt ?? m.data_criacao ?? null;
      return { id, target, current, createdAt };
    });

    // Ordena por created_at quando possível; senão por id crescente
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

  // Calcula códigos a partir das metas (fallback/augment)
  function codesFromGoals(goals) {
  const codes = new Set();
  if (!goals.length) return codes;

  // Ordenação já foi feita fora (por createdAt/id)
  const first = goals[0];
  const second = goals.length >= 2 ? goals[1] : null;

  // Sempre que houver pelo menos 1 meta
  codes.add('META_CREATED');

  // ---- PCT_* (GENÉRICOS) SÓ PARA A 1ª META ----
  if (first) {
    const pctFirst = first.target > 0 ? (first.current / first.target) * 100 : 0;
    if (pctFirst >= 25) codes.add('PCT_25');
    if (pctFirst >= 50) codes.add('PCT_50');
    if (pctFirst >= 75) codes.add('PCT_75');
    if (first.target > 0 && first.current >= first.target) codes.add('PCT_100');
  }

  // ---- META2_* SÓ PARA A 2ª META ----
  if (second) {
    codes.add('META2_CREATED'); // existir a 2ª meta já desbloqueia
    const pctSecond = second.target > 0 ? (second.current / second.target) * 100 : 0;
    if (pctSecond >= 50) codes.add('META2_50');
    if (second.target > 0 && second.current >= second.target) codes.add('META2_100');
  }

  return codes;
}

  async function carregar() {
    try {
      // Busca ambas as fontes em paralelo
      const [cardsRes, metasRes] = await Promise.allSettled([
        fetch('/metas/cards', { credentials: 'same-origin' }),
        fetch('/obter_metas', { credentials: 'same-origin' })
      ]);

      const codes = new Set();

      // 1) Códigos vindos do backend (/metas/cards), se disponível
      if (cardsRes.status === 'fulfilled' && cardsRes.value.ok) {
        const rows = await cardsRes.value.json();
        // rows: [{ meta_id, code, label, threshold_percent, unlocked_at }, ...]
        rows.forEach(r => { if (r && r.code) codes.add(String(r.code)); });
      }

      // 2) Augment: calcula a partir das metas e une com os existentes
      if (metasRes.status === 'fulfilled' && metasRes.value.ok) {
        const metasJson = await metasRes.value.json();
        const goals = parseAndSortGoals(metasJson);
        const goalCodes = codesFromGoals(goals);
        goalCodes.forEach(c => codes.add(c));
      }

      // Se nada deu certo, mostra erro amigável
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
