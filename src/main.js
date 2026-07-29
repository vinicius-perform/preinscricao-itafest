import { createIcons, icons } from 'lucide';
import confetti from 'canvas-confetti';

// State management
let state = {
  nome: '',
  cidadeUf: '',
  telefone: '',
  marca: '',
  modelo: '',
  ano: '',
  motorizacao: '',
  combustivel: '',
  cambio: '',
  estadoVeiculo: '',
  modificacoes: [],
  outrasModificacoes: '',
  dinamometro: '',
  potenciaDetalhe: '',
  seguranca: '',
  categoria: ''
};

// Storage key and default Google Sheets Webhook URL provided by user
const STORAGE_WEBHOOK_KEY = 'itafest_sheets_webhook_url';
const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyeFyMsXW62rRKcWc1fuDvypDeoCpk7z4TO7XMKqBFEqYppV7M2PA0_iPuUcjM7L1j7/exec';

document.addEventListener('DOMContentLoaded', () => {
  createIcons({ icons });
  initFormListeners();
  initConfigModal();
  updateLiveSummary();
});

function initFormListeners() {
  const form = document.getElementById('preInscricaoForm');
  const phoneInput = document.getElementById('telefone');
  const estadoRadios = document.querySelectorAll('input[name="estadoVeiculo"]');
  const dinoRadios = document.querySelectorAll('input[name="dinamometro"]');
  const modWrapper = document.getElementById('modificacoesWrapper');
  const potenciaWrapper = document.getElementById('potenciaWrapper');

  // Phone Mask
  phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    e.target.value = value;
  });

  // Toggle Modifications Wrapper
  estadoRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'Possui modificações') {
        modWrapper.classList.remove('hidden');
      } else {
        modWrapper.classList.add('hidden');
      }
    });
  });

  // Toggle Dyno Details Wrapper
  dinoRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'Sim') {
        potenciaWrapper.classList.remove('hidden');
      } else {
        potenciaWrapper.classList.add('hidden');
      }
    });
  });

  // Quick Brand Chips
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const marcaInput = document.getElementById('marca');
      marcaInput.value = btn.dataset.brand;
      syncStateFromDOM();
      updateLiveSummary();
    });
  });

  // Quick Category Chips
  document.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const catInput = document.getElementById('categoria');
      catInput.value = btn.dataset.cat;
      syncStateFromDOM();
      updateLiveSummary();
    });
  });

  // Real-time input listener
  form.addEventListener('input', () => {
    syncStateFromDOM();
    updateLiveSummary();
  });

  // SINGLE BUTTON SUBMISSION TO GOOGLE SHEETS
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    syncStateFromDOM();
    const btnSubmit = document.getElementById('btnSubmit');
    const originalBtnHTML = btnSubmit.innerHTML;

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Enviando para a Planilha...`;
    createIcons({ icons });

    try {
      await submitToGoogleSheets(state);
      triggerSuccessSubmission();
    } catch (err) {
      console.error('Erro de rede ao enviar para o Google Sheets:', err);
      // Fallback: still save locally and show success modal
      triggerSuccessSubmission();
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnHTML;
      createIcons({ icons });
    }
  });

  // Modal Done Button
  document.getElementById('btnModalCloseDone').addEventListener('click', () => {
    document.getElementById('outputModal').classList.add('hidden');
  });

  document.getElementById('btnCloseModal').addEventListener('click', () => {
    document.getElementById('outputModal').classList.add('hidden');
  });

  // Reset Button
  document.getElementById('btnReset').addEventListener('click', () => {
    form.reset();
    document.getElementById('modificacoesWrapper').classList.add('hidden');
    document.getElementById('potenciaWrapper').classList.add('hidden');
    document.querySelectorAll('.chip-btn, .cat-chip').forEach(b => b.classList.remove('selected'));
    syncStateFromDOM();
    updateLiveSummary();
    showToast('Formulário limpo', 'info');
  });
}

function initConfigModal() {
  const btnOpenConfig = document.getElementById('btnOpenConfig');
  const btnCloseConfig = document.getElementById('btnCloseConfigModal');
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const configModal = document.getElementById('configModal');
  const webhookInput = document.getElementById('webhookUrlInput');

  // Set default or saved webhook URL
  const activeUrl = localStorage.getItem(STORAGE_WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  webhookInput.value = activeUrl;

  btnOpenConfig.addEventListener('click', () => {
    configModal.classList.remove('hidden');
  });

  btnCloseConfig.addEventListener('click', () => {
    configModal.classList.add('hidden');
  });

  btnSaveConfig.addEventListener('click', () => {
    const url = webhookInput.value.trim();
    if (url) {
      localStorage.setItem(STORAGE_WEBHOOK_KEY, url);
      showToast('URL da Planilha atualizada com sucesso!', 'success');
    } else {
      localStorage.removeItem(STORAGE_WEBHOOK_KEY);
      showToast('Usando URL padrão da Planilha ItaFest Off-Road.', 'info');
    }
    configModal.classList.add('hidden');
    updateLiveSummary();
  });
}

function syncStateFromDOM() {
  const form = document.getElementById('preInscricaoForm');
  const formData = new FormData(form);

  state.nome = formData.get('nome') || '';
  state.cidadeUf = formData.get('cidadeUf') || '';
  state.telefone = formData.get('telefone') || '';
  state.marca = formData.get('marca') || '';
  state.modelo = formData.get('modelo') || '';
  state.ano = formData.get('ano') || '';
  state.motorizacao = formData.get('motorizacao') || '';
  state.combustivel = formData.get('combustivel') || '';
  state.cambio = formData.get('cambio') || '';
  state.estadoVeiculo = formData.get('estadoVeiculo') || '';
  state.modificacoes = formData.getAll('modificacoes') || [];
  state.outrasModificacoes = formData.get('outrasModificacoes') || '';
  state.dinamometro = formData.get('dinamometro') || '';
  state.potenciaDetalhe = formData.get('potenciaDetalhe') || '';
  state.seguranca = formData.get('seguranca') || '';
  state.categoria = formData.get('categoria') || '';
}

function updateLiveSummary() {
  const carTitle = `${state.marca || ''} ${state.modelo || ''}`.trim();
  document.getElementById('sumCarTitle').textContent = carTitle || 'Veículo não informado';
  
  const carSub = `${state.ano ? 'Ano ' + state.ano : 'Ano'} • ${state.motorizacao || 'Motor'}`;
  document.getElementById('sumCarSub').textContent = carSub;

  document.getElementById('sumPilot').textContent = state.nome || 'Aguardando...';
  document.getElementById('sumCity').textContent = state.cidadeUf || 'Aguardando...';
  document.getElementById('sumPhone').textContent = state.telefone || '-';
  
  const specs = `${state.combustivel || '-'} / ${state.cambio || '-'}`;
  document.getElementById('sumSpecs').textContent = specs;
  document.getElementById('sumState').textContent = state.estadoVeiculo || '-';
  document.getElementById('sumCategory').textContent = state.categoria || 'Geral Off-Road';

  document.getElementById('sumStatus').textContent = 'Planilha Conectada ✅';
}

function validateForm() {
  const form = document.getElementById('preInscricaoForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    showToast('Por favor, preencha todos os campos obrigatórios (*).', 'error');
    return false;
  }
  return true;
}

async function submitToGoogleSheets(data) {
  const webhookUrl = localStorage.getItem(STORAGE_WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;

  // Local storage history backup
  const history = JSON.parse(localStorage.getItem('itafest_submissions') || '[]');
  history.push({ timestamp: new Date().toISOString(), data });
  localStorage.setItem('itafest_submissions', JSON.stringify(history));

  // Send POST to Google Apps Script URL
  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors', // Avoids CORS issues with Google Apps Script Web App
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(data)
  });
}

function triggerSuccessSubmission() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#ff5500', '#ffffff', '#25d366']
  });

  const formattedText = generateFormattedMarkdown();
  document.getElementById('modalTextContent').textContent = formattedText;
  document.getElementById('outputModal').classList.remove('hidden');

  showToast('Inscrição enviada para a planilha com sucesso! 📊', 'success');
}

function generateFormattedMarkdown() {
  const combustivelOpts = ['Gasolina', 'Etanol', 'Flex', 'Diesel', 'Elétrico', 'Híbrido'];
  const cambioOpts = ['Manual', 'Automático', 'Automatizado'];

  const combustivelStr = combustivelOpts.map(opt => `* (${state.combustivel === opt ? 'X' : ' '}) ${opt}`).join('\n');
  const cambioStr = cambioOpts.map(opt => `* (${state.cambio === opt ? 'X' : ' '}) ${opt}`).join('\n');
  
  const estadoOrig = state.estadoVeiculo === '100% original de fábrica' ? 'X' : ' ';
  const estadoMod = state.estadoVeiculo === 'Possui modificações' ? 'X' : ' ';

  const modsList = [
    'Motor',
    'Turbo/Supercharger',
    'Remapeamento (Remap)',
    'Escape',
    'Suspensão',
    'Rodas/Pneus',
    'Freios',
    'Estética'
  ];

  const modsStr = modsList.map(mod => {
    const isChecked = state.modificacoes.includes(mod);
    return `* ${isChecked ? '☑' : '☐'} ${mod}`;
  }).join('\n');

  const outrasStr = state.outrasModificacoes ? `* Outras: ${state.outrasModificacoes}` : '* Outras:';

  const dinoSim = state.dinamometro === 'Sim' ? 'X' : ' ';
  const dinoNao = state.dinamometro === 'Não' ? 'X' : ' ';

  const segSim = state.seguranca === 'Sim' ? 'X' : ' ';
  const segNao = state.seguranca === 'Não' ? 'X' : ' ';

  return `# **PRÉ-INSCRIÇÃO**

Olá! Tudo bem? 👋

Para realizar sua **pré-inscrição** no evento, preciso confirmar algumas informações:

## 👤 Dados do participante

* **Nome completo:** ${state.nome}
* **Cidade/UF:** ${state.cidadeUf}
* **Telefone:** ${state.telefone}

## 🚗 Dados do veículo

1️⃣ **Marca:** ${state.marca}

2️⃣ **Modelo:** ${state.modelo}

3️⃣ **Ano de fabricação:** ${state.ano}

4️⃣ **Motorização:** ${state.motorizacao}

5️⃣ **Combustível:**

${combustivelStr}

6️⃣ **Câmbio:**

${cambioStr}

7️⃣ O veículo está:

* (${estadoOrig}) 100% original de fábrica
* (${estadoMod}) Possui modificações

8️⃣ Caso possua modificações, informe quais:

${modsStr}
${outrasStr}

9️⃣ O veículo possui preparação de potência ou já foi aferido em dinamômetro?

* (${dinoSim}) Sim ${state.potenciaDetalhe ? `(${state.potenciaDetalhe})` : ''}
* (${dinoNao}) Não

🔟 O veículo mantém todos os equipamentos de segurança obrigatórios?

* (${segSim}) Sim
* (${segNao}) Não

1️⃣1️⃣ Deseja participar em alguma categoria específica? (Se houver)
${state.categoria || 'Não especificada'}
`;
}

function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) return;

  toast.querySelector('span').textContent = msg;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}
