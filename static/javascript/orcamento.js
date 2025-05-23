document.addEventListener('DOMContentLoaded', () => {
  let contador = 1;
  let chart = null;
  const nomesPessoas = ['joão', 'maria', 'jose', 'ana', 'pedro', 'lucas', 'marcos', 'paula', 'bruna', 'carlos'];
  let historico = JSON.parse(localStorage.getItem('historico')) || [];

  document.getElementById('btn-adicionar').addEventListener('click', adicionarCampo);
  document.getElementById('salario').addEventListener('input', atualizarSuperavit);

  function adicionarCampo() {
    const container = document.getElementById('campos-adicionais');
    const novoCampo = document.createElement('div');
    novoCampo.className = 'campo';

    const labelTipo = document.createElement('label');
    labelTipo.textContent = 'Nome do campo:';
    const inputTipo = document.createElement('input');
    inputTipo.type = 'text';
    inputTipo.name = 'tipo' + contador;
    inputTipo.placeholder = 'Ex: Aluguel, Internet, etc.';
    inputTipo.required = true;

    const erroMsg = document.createElement('div');
    erroMsg.className = 'erro';

    const labelValor = document.createElement('label');
    labelValor.textContent = 'Valor:';
    const inputValor = document.createElement('input');
    inputValor.type = 'number';
    inputValor.name = 'valor' + contador;
    inputValor.placeholder = 'Digite o valor';
    inputValor.required = true;

    inputValor.addEventListener('input', atualizarSuperavit);

    inputTipo.addEventListener('input', () => {
      const texto = inputTipo.value.trim().toLowerCase();
      erroMsg.textContent = '';
      if (/\d/.test(texto)) {
        erroMsg.textContent = 'Números não são permitidos no nome do campo.';
      } else if (nomesPessoas.some(nome => texto.includes(nome))) {
        erroMsg.textContent = 'Não use nomes de pessoas no nome do campo.';
      }
    });

    novoCampo.appendChild(labelTipo);
    novoCampo.appendChild(inputTipo);
    novoCampo.appendChild(erroMsg);
    novoCampo.appendChild(labelValor);
    novoCampo.appendChild(inputValor);
    container.appendChild(novoCampo);
    contador++;

    atualizarSuperavit();
  }

  function atualizarSuperavit() {
    const salario = parseFloat(document.getElementById('salario').value) || 0;
    let totalDescontos = 0;
    const camposValor = document.querySelectorAll('#campos-adicionais input[type="number"]');
    camposValor.forEach(campo => {
      const valor = parseFloat(campo.value);
      if (!isNaN(valor)) {
        totalDescontos += valor;
      }
    });
    const superavit = salario - totalDescontos;
    document.getElementById('superavit').textContent = `Superávit: R$ ${superavit.toFixed(2)}`;
  }

  document.getElementById('formulario').addEventListener('submit', function (e) {
    e.preventDefault();

    const salario = parseFloat(document.getElementById('salario').value);
    const mes = document.getElementById('mes').value;
    const ano = document.getElementById('ano').value;

    if (isNaN(salario) || salario <= 0 || mes === "" || ano === "") {
      alert("Informe um salário válido e selecione o mês e ano.");
      return;
    }

    const nomes = [];
    const valores = [];
    const camposTexto = document.querySelectorAll('#campos-adicionais input[type="text"]');
    const camposValor = document.querySelectorAll('#campos-adicionais input[type="number"]');

    for (let i = 0; i < camposTexto.length; i++) {
      const texto = camposTexto[i].value.trim().toLowerCase();
      const valor = parseFloat(camposValor[i].value);

      if (/\d/.test(texto) || nomesPessoas.some(nome => texto.includes(nome))) {
        alert("Um ou mais nomes de campo são inválidos. Corrija antes de confirmar.");
        return;
      }

      if (isNaN(valor) || valor < 0) {
        alert("Verifique os valores inseridos.");
        return;
      }

      nomes.push(`${mes} ${ano} - ${camposTexto[i].value.trim()}`);
      valores.push(valor);
    }

    const novoHistorico = { mes, ano, salario, gastos: nomes, valores: valores };
    historico.push(novoHistorico);
    localStorage.setItem('historico', JSON.stringify(historico));

    atualizarSelecaoHistorico();
    gerarGrafico(novoHistorico);
    atualizarSuperavit();
  });

  function gerarGrafico(historicoData) {
    const { gastos, valores } = historicoData;
    const ctx = document.getElementById('graficoGastos').getContext('2d');
    document.getElementById('grafico-container').style.display = 'block';

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: gastos,
        datasets: [{
          label: 'Gastos',
          data: valores,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#8BC34A',
            '#FF9800', '#9C27B0', '#00BCD4', '#E91E63',
            '#4CAF50', '#F44336'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.chart._metasets[0].total;
                const value = context.raw;
                const percent = ((value / total) * 100).toFixed(1);
                return `${context.label}: R$ ${value.toFixed(2)} (${percent}%)`;
              }
            }
          },
          datalabels: {
            formatter: (value, context) => {
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percent = ((value / total) * 100).toFixed(1);
              return `${percent}%`;
            },
            color: '#fff',
            font: { weight: 'bold' }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  function atualizarSelecaoHistorico() {
    const anoSelect = document.getElementById('historico-ano');
    anoSelect.innerHTML = '<option value="">Selecione o Ano</option>';
    const anos = [...new Set(historico.map(item => item.ano))];
    anos.forEach(ano => {
      const option = document.createElement('option');
      option.value = ano;
      option.textContent = ano;
      anoSelect.appendChild(option);
    });
  }

  function atualizarMeses() {
    const ano = document.getElementById('historico-ano').value;
    const mesSelect = document.getElementById('historico-mes');
    mesSelect.innerHTML = '<option value="">Selecione o Mês</option>';

    if (ano) {
      const meses = historico.filter(item => item.ano === ano).map(item => item.mes);
      [...new Set(meses)].forEach(mes => {
        const option = document.createElement('option');
        option.value = mes;
        option.textContent = mes;
        mesSelect.appendChild(option);
      });
    }
  }

  function mostrarGraficoHistorico() {
    const ano = document.getElementById('historico-ano').value;
    const mes = document.getElementById('historico-mes').value;
    if (ano && mes) {
      const dadosHistorico = historico.find(item => item.ano === ano && item.mes === mes);
      gerarGrafico(dadosHistorico);
    }
  }

  atualizarSelecaoHistorico();
  document.getElementById('historico-ano').addEventListener('change', atualizarMeses);
  document.getElementById('historico-mes').addEventListener('change', mostrarGraficoHistorico);
});
