(() => {
  'use strict';

  // ---------- Textos padrão dos scripts (editáveis pela tela de Configurações) ----------

  const DEFAULT_TEMPLATES = {
    boasvindas:
`Bem-vindo(a) à Farmácia Francy da Torre!

Me chamo *{{ATENDENTE}}* e vou conduzir o seu atendimento. 
Caso eu demore a responder, é porque estarei em atendimento presencial, mas volto logo para concluirmos.

Se for algo mais urgente, é só dar uma ligadinha pra gente`,

    entrega:
`Olá! 😊
Seu pedido da Francy já está a caminho! 🚚💨
Acompanhe a entrega em tempo real pelo link abaixo. A mesma está sendo realizada por uma plataforma terceirizada, o processo é mais rápido, então fique atento(a) ao rastreamento.
⛔ Importante:
* A entrega é realizada somente na portaria do prédio ou condomínio.
* Os entregadores não sobem até o apartamento.
* Fique atento(a) ao celular para facilitar o recebimento do seu pedido.
🔗 Link de rastreamento:
{{LINK}}
Agradecemos pela preferência! 💙`,

    forahorario:
`Nesse horário não realizamos entregas, mas temos a opção do iFood no link abaixo:
https://www.ifood.com.br/delivery/joao-pessoa-pb/farmacias-francy---torre-torre/
Ou se preferir você pode pedir um *Uber Flash ou 99 Entregas* que nós entregamos seu pedido a ele.`
  };

  // Estado atual dos templates (começa nos padrões; é sobrescrito no
  // carregamento do config.json, se houver algo salvo).
  let templates = {
    boasvindas: DEFAULT_TEMPLATES.boasvindas,
    entrega: DEFAULT_TEMPLATES.entrega,
    forahorario: DEFAULT_TEMPLATES.forahorario
  };

  // ---------- Utilidades ----------

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Converte *negrito* em <b>negrito</b> apenas para a prévia visual.
  // O texto copiado permanece com os asteriscos literais, exatamente
  // como o WhatsApp espera para aplicar o negrito.
  function toPreviewHtml(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(/\*([^\n*]+)\*/g, '<b>$1</b>');
  }

  function parseCurrency(str) {
    if (!str) return 0;
    const cleaned = str
      .toString()
      .trim()
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3}(,|$))/g, '') // remove pontos de milhar
      .replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  function formatCurrency(n) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function nowStamp() {
    const d = new Date();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Troca de abas ----------

  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  let activeTab = 'boasvindas';

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeTab = tab.dataset.tab;
      document.getElementById('panel-' + activeTab).classList.add('active');
      updatePreview();
    });
  });

  // ---------- Script 1: Boas-vindas ----------

  const atendentesList = document.getElementById('atendentes-list');
  const addAtendenteBtn = document.getElementById('add-atendente');
  const atendenteRowTemplate = document.getElementById('atendente-row-template');
  let atendenteIdSeq = 0;

  function addAtendenteRow(checked, nomeInicial) {
    const node = atendenteRowTemplate.content.cloneNode(true);
    const row = node.querySelector('.atendente-row');
    const radio = row.querySelector('.atendente-radio');
    const nome = row.querySelector('.atendente-nome');

    row.dataset.id = 'atd' + (++atendenteIdSeq);
    radio.checked = !!checked;
    if (nomeInicial) nome.value = nomeInicial;

    radio.addEventListener('change', updatePreview);
    nome.addEventListener('input', updatePreview);
    row.querySelector('.atendente-remove').addEventListener('click', () => {
      const wasChecked = radio.checked;
      row.remove();
      if (wasChecked) {
        const first = atendentesList.querySelector('.atendente-radio');
        if (first) first.checked = true;
      }
      updatePreview();
    });

    atendentesList.appendChild(row);
  }

  addAtendenteBtn.addEventListener('click', () => {
    // Se ainda não houver nenhum selecionado, o novo campo já entra selecionado.
    const jaTemSelecionado = !!atendentesList.querySelector('.atendente-radio:checked');
    addAtendenteRow(!jaTemSelecionado);
    updatePreview();
  });

  function getAtendenteRows() {
    return Array.from(atendentesList.querySelectorAll('.atendente-row'));
  }

  // Salva a lista de atendentes em disco (atendentes.json) com um pequeno
  // atraso, para não gravar o arquivo a cada tecla digitada.
  let saveAtendentesTimer = null;
  function saveAtendentesToDisk() {
    if (!(window.francy && typeof window.francy.saveAtendentes === 'function')) return;
    clearTimeout(saveAtendentesTimer);
    saveAtendentesTimer = setTimeout(() => {
      const data = getAtendenteRows().map((row) => ({
        nome: row.querySelector('.atendente-nome').value.trim(),
        selecionado: row.querySelector('.atendente-radio').checked
      }));
      window.francy.saveAtendentes(data).catch(() => {});
    }, 400);
  }

  function getAtendenteSelecionado() {
    const checkedRadio = atendentesList.querySelector('.atendente-radio:checked');
    if (!checkedRadio) return '';
    const row = checkedRadio.closest('.atendente-row');
    return row.querySelector('.atendente-nome').value.trim();
  }

  function buildBoasVindas() {
    const nome = getAtendenteSelecionado() || 'ATENDENTE';
    return templates.boasvindas.replace(/\{\{ATENDENTE\}\}/g, nome);
  }


  // ---------- Script 2: Entrega ----------

  const linkInput = document.getElementById('link-entrega');
  const clearLinkBtn = document.getElementById('clear-link');

  clearLinkBtn.addEventListener('click', () => {
    linkInput.value = '';
    updatePreview();
    linkInput.focus();
  });

  function buildEntrega() {
    const link = linkInput.value.trim() || '[Inserir link]';
    return templates.entrega.replace(/\{\{LINK\}\}/g, link);
  }

  // ---------- Script 3: Resumo do pedido ----------

  const itemsList = document.getElementById('items-list');
  const addItemBtn = document.getElementById('add-item');
  const clearResumoBtn = document.getElementById('clear-resumo');
  const taxaInput = document.getElementById('taxa-entrega');
  const totalValorEl = document.getElementById('total-valor');
  const rowTemplate = document.getElementById('item-row-template');

  function addItemRow() {
    const node = rowTemplate.content.cloneNode(true);
    const row = node.querySelector('.item-row');

    row.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => { recalcTotal(); updatePreview(); });
    });
    row.querySelector('.item-remove').addEventListener('click', () => {
      row.remove();
      recalcTotal();
      updatePreview();
    });

    itemsList.appendChild(row);
  }

  addItemBtn.addEventListener('click', () => {
    addItemRow();
    updatePreview();
  });

  // Limpa tudo de uma vez (itens + taxa) e deixa pronto para um novo pedido.
  clearResumoBtn.addEventListener('click', () => {
    itemsList.innerHTML = '';
    taxaInput.value = '';
    addItemRow();
    recalcTotal();
    updatePreview();
  });

  taxaInput.addEventListener('input', () => { recalcTotal(); updatePreview(); });

  function getItems() {
    return Array.from(itemsList.querySelectorAll('.item-row'))
      .map((row) => ({
        qtdRaw: row.querySelector('.item-qtd').value.trim(),
        descRaw: row.querySelector('.item-desc').value.trim(),
        valorRaw: row.querySelector('.item-valor').value.trim(),
        valor: parseCurrency(row.querySelector('.item-valor').value)
      }))
      // ignora linhas totalmente vazias na hora de montar o texto/total
      .filter((it) => it.qtdRaw || it.descRaw || it.valorRaw);
  }

  function recalcTotal() {
    const items = getItems();
    const taxa = parseCurrency(taxaInput.value);
    const itensTotal = items.reduce((acc, it) => acc + (parseFloat(it.qtdRaw) || (it.descRaw || it.valorRaw ? 1 : 0)) * it.valor, 0);
    const total = itensTotal + taxa;
    totalValorEl.textContent = 'R$ ' + formatCurrency(total);
    return total;
  }

  function buildResumo() {
    const items = getItems();
    const taxaPreenchida = taxaInput.value.trim() !== '';
    const taxa = parseCurrency(taxaInput.value);
    const total = recalcTotal();

    // Nenhum item preenchido ainda: não gera texto de exemplo, apenas
    // deixa a prévia vazia até que o usuário digite algo.
    if (items.length === 0) return '';

    const linhas = items.map((it) => {
      const qtd = it.qtdRaw || '1';
      const desc = it.descRaw || 'descrição do produto';
      return `• ${qtd}x ${desc} R$ ${formatCurrency(it.valor)}`;
    });

    const partes = ['*RESUMO DO PEDIDO:*', ...linhas];

    // A linha de taxa de entrega só aparece se algo foi digitado no campo.
    if (taxaPreenchida) {
      partes.push(`• Taxa de entrega: R$ ${formatCurrency(taxa)}`);
    }

    partes.push(`*VALOR TOTAL: R$ ${formatCurrency(total)}*`);

    return partes.join('\n');
  }

  // ---------- Script 4: Fora do horário ----------

  const forahorarioSelect = document.getElementById('forahorario-atendente');
  const copySaudacaoBtn = document.getElementById('btn-copy-saudacao');

  // Mantém o <select> desta tela sempre sincronizado com os atendentes
  // cadastrados na aba Boas-vindas (mesma lista, mesmo estado selecionado).
  function syncForaHorarioSelect() {
    const rows = getAtendenteRows();
    forahorarioSelect.innerHTML = '';

    if (rows.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'Nenhum atendente cadastrado';
      forahorarioSelect.appendChild(opt);
      forahorarioSelect.disabled = true;
      copySaudacaoBtn.disabled = true;
      return;
    }

    forahorarioSelect.disabled = false;
    copySaudacaoBtn.disabled = false;

    rows.forEach((row, i) => {
      const radio = row.querySelector('.atendente-radio');
      const nome = row.querySelector('.atendente-nome').value.trim();
      const opt = document.createElement('option');
      opt.value = row.dataset.id;
      opt.textContent = nome || `Atendente ${i + 1} (sem nome)`;
      if (radio.checked) opt.selected = true;
      forahorarioSelect.appendChild(opt);
    });
  }

  forahorarioSelect.addEventListener('change', () => {
    const row = getAtendenteRows().find((r) => r.dataset.id === forahorarioSelect.value);
    if (row) row.querySelector('.atendente-radio').checked = true;
    updatePreview();
  });

  function buildForaHorario() {
    return templates.forahorario;
  }

  // ---------- Prévia + cópia ----------

  const previewBubble = document.getElementById('preview-bubble');
  const copyBtn = document.getElementById('btn-copy');
  const copyToast = document.getElementById('copy-toast');

  function currentScript() {
    if (activeTab === 'boasvindas') return buildBoasVindas();
    if (activeTab === 'entrega') return buildEntrega();
    if (activeTab === 'resumo') return buildResumo();
    return buildForaHorario();
  }

  function hasMeaningfulContent(text) {
    return !!(text && text.replace(/\*/g, '').trim().length > 0);
  }

  function updatePreview() {
    syncForaHorarioSelect();
    saveAtendentesToDisk();

    const text = currentScript();
    if (!hasMeaningfulContent(text)) {
      previewBubble.innerHTML = '<span class="empty-hint">Preencha os campos para ver a prévia…</span>';
      return;
    }
    previewBubble.innerHTML = toPreviewHtml(text) + `<span class="meta">${nowStamp()} ✓✓</span>`;
  }

  // Fallback universal de cópia (funciona mesmo se o IPC do Electron falhar
  // por algum motivo) usando um textarea temporário + execCommand.
  function copyViaTextarea(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function showToast(msg, isError) {
    copyToast.textContent = msg;
    copyToast.classList.toggle('is-error', !!isError);
    copyToast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => copyToast.classList.remove('show'), 1800);
  }

  // Tenta copiar por múltiplas vias (IPC do Electron → textarea/execCommand
  // → Clipboard API do navegador), retornando true assim que uma funcionar.
  async function copyText(text) {
    let copied = false;

    try {
      if (window.francy && typeof window.francy.copyToClipboard === 'function') {
        await window.francy.copyToClipboard(text);
        copied = true;
      }
    } catch (err) {
      copied = false;
    }

    if (!copied) {
      copied = copyViaTextarea(text);
    }

    if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (err) {
        copied = false;
      }
    }

    return copied;
  }

  copyBtn.addEventListener('click', async () => {
    const text = currentScript();

    if (!hasMeaningfulContent(text)) {
      showToast('Preencha os campos antes de copiar.', true);
      return;
    }

    const copied = await copyText(text);
    showToast(copied ? 'Copiado!' : 'Não foi possível copiar. Selecione o texto na prévia.', !copied);
  });

  // Botão da tela 04: copia a saudação da tela 01 (com o atendente
  // selecionado no seletor desta mesma tela) sem precisar trocar de aba.
  copySaudacaoBtn.addEventListener('click', async () => {
    const text = buildBoasVindas();

    if (!hasMeaningfulContent(text)) {
      showToast('Cadastre um atendente na aba Boas-vindas.', true);
      return;
    }

    const copied = await copyText(text);
    showToast(copied ? 'Saudação copiada!' : 'Não foi possível copiar.', !copied);
  });

  // ---------- Pin (sempre no topo) ----------

  const pinBtn = document.getElementById('btn-pin');
  const pinLabel = pinBtn.querySelector('.pin-label');
  let pinned = false;

  pinBtn.addEventListener('click', async () => {
    const proximoEstado = !pinned;
    try {
      if (window.francy && typeof window.francy.setAlwaysOnTop === 'function') {
        pinned = await window.francy.setAlwaysOnTop(proximoEstado);
      } else {
        pinned = proximoEstado;
      }
    } catch (err) {
      pinned = false;
    }
    pinBtn.classList.toggle('active', pinned);
    pinLabel.textContent = pinned ? 'Fixado' : 'Fixar';
    pinBtn.title = pinned
      ? 'Clique para não ficar mais sempre por cima'
      : 'Manter esta janela sempre visível por cima das outras';
  });

  // ---------- Configurações (protegidas por senha) ----------

  // Hash SHA-256 da senha padrão "francy123" — evita deixar a senha em
  // texto puro visível no código-fonte do app.
  const SETTINGS_PASSWORD_HASH = 'd4f82215de469956efea038377b23b85f88616a2d68ca8c9c92cc4f4d49dcab9';

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const settingsBtn = document.getElementById('btn-settings');
  const passwordOverlay = document.getElementById('password-overlay');
  const passwordInput = document.getElementById('password-input');
  const passwordError = document.getElementById('password-error');
  const passwordCancelBtn = document.getElementById('password-cancel');
  const passwordConfirmBtn = document.getElementById('password-confirm');

  const settingsOverlay = document.getElementById('settings-overlay');
  const cfgBoasvindas = document.getElementById('cfg-boasvindas');
  const cfgEntrega = document.getElementById('cfg-entrega');
  const cfgForahorario = document.getElementById('cfg-forahorario');
  const settingsError = document.getElementById('settings-error');
  const settingsRestoreBtn = document.getElementById('settings-restore');
  const settingsCancelBtn = document.getElementById('settings-cancel');
  const settingsSaveBtn = document.getElementById('settings-save');

  function openPasswordModal() {
    passwordInput.value = '';
    passwordError.textContent = '';
    passwordOverlay.classList.add('show');
    setTimeout(() => passwordInput.focus(), 30);
  }
  function closePasswordModal() {
    passwordOverlay.classList.remove('show');
  }

  function openSettingsModal() {
    cfgBoasvindas.value = templates.boasvindas;
    cfgEntrega.value = templates.entrega;
    cfgForahorario.value = templates.forahorario;
    settingsError.textContent = '';
    settingsOverlay.classList.add('show');
  }
  function closeSettingsModal() {
    settingsOverlay.classList.remove('show');
  }

  settingsBtn.addEventListener('click', openPasswordModal);
  passwordCancelBtn.addEventListener('click', closePasswordModal);

  async function tentarSenha() {
    const digitada = passwordInput.value;
    const hash = await sha256Hex(digitada);
    if (hash === SETTINGS_PASSWORD_HASH) {
      closePasswordModal();
      openSettingsModal();
    } else {
      passwordError.textContent = 'Senha incorreta.';
      passwordInput.value = '';
      passwordInput.focus();
    }
  }

  passwordConfirmBtn.addEventListener('click', tentarSenha);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tentarSenha();
  });

  // Clicar no fundo escurecido (fora da caixa) fecha o modal, como um cancelar.
  passwordOverlay.addEventListener('click', (e) => {
    if (e.target === passwordOverlay) closePasswordModal();
  });
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettingsModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (settingsOverlay.classList.contains('show')) closeSettingsModal();
    else if (passwordOverlay.classList.contains('show')) closePasswordModal();
  });

  settingsCancelBtn.addEventListener('click', closeSettingsModal);

  settingsRestoreBtn.addEventListener('click', () => {
    cfgBoasvindas.value = DEFAULT_TEMPLATES.boasvindas;
    cfgEntrega.value = DEFAULT_TEMPLATES.entrega;
    cfgForahorario.value = DEFAULT_TEMPLATES.forahorario;
    settingsError.textContent = '';
  });

  settingsSaveBtn.addEventListener('click', async () => {
    const novoBoasvindas = cfgBoasvindas.value;
    const novoEntrega = cfgEntrega.value;
    const novoForahorario = cfgForahorario.value;

    // O nome do atendente e o link precisam continuar substituíveis —
    // por isso os placeholders não podem ser removidos do texto.
    if (!novoBoasvindas.includes('{{ATENDENTE}}')) {
      settingsError.textContent = 'O texto de Saudação precisa manter {{ATENDENTE}}.';
      return;
    }
    if (!novoEntrega.includes('{{LINK}}')) {
      settingsError.textContent = 'O texto de Entrega precisa manter {{LINK}}.';
      return;
    }

    templates = {
      boasvindas: novoBoasvindas,
      entrega: novoEntrega,
      forahorario: novoForahorario
    };

    try {
      if (window.francy && typeof window.francy.saveConfig === 'function') {
        await window.francy.saveConfig({ templates });
      }
    } catch (err) {
      // Mesmo se salvar falhar, mantém a alteração aplicada nesta sessão.
    }

    closeSettingsModal();
    updatePreview();
  });

  // ---------- Inicialização ----------

  linkInput.addEventListener('input', updatePreview);

  // Começa com uma única linha em branco — o usuário preenche do zero.
  addItemRow();
  recalcTotal();

  // Carrega os atendentes salvos de sessões anteriores (atendentes.json).
  // Se não houver nada salvo (primeira vez usando o app), começa com um
  // único campo em branco, já selecionado.
  (async function initAtendentes() {
    let salvos = [];
    try {
      if (window.francy && typeof window.francy.loadAtendentes === 'function') {
        const resultado = await window.francy.loadAtendentes();
        if (Array.isArray(resultado)) salvos = resultado;
      }
    } catch (err) {
      salvos = [];
    }

    if (salvos.length > 0) {
      salvos.forEach((a) => addAtendenteRow(!!(a && a.selecionado), a && a.nome ? a.nome : ''));
      if (!atendentesList.querySelector('.atendente-radio:checked')) {
        const primeiro = atendentesList.querySelector('.atendente-radio');
        if (primeiro) primeiro.checked = true;
      }
    } else {
      addAtendenteRow(true);
    }

    updatePreview();
  })();

  // Carrega os textos padrão personalizados (config.json), se existirem.
  // Se algum template salvo não tiver o placeholder obrigatório (arquivo
  // editado manualmente, por exemplo), usa o padrão de fábrica por segurança.
  (async function initConfig() {
    try {
      if (window.francy && typeof window.francy.loadConfig === 'function') {
        const cfg = await window.francy.loadConfig();
        const t = cfg && cfg.templates;
        if (t && typeof t === 'object') {
          templates = {
            boasvindas: (typeof t.boasvindas === 'string' && t.boasvindas.includes('{{ATENDENTE}}'))
              ? t.boasvindas : DEFAULT_TEMPLATES.boasvindas,
            entrega: (typeof t.entrega === 'string' && t.entrega.includes('{{LINK}}'))
              ? t.entrega : DEFAULT_TEMPLATES.entrega,
            forahorario: (typeof t.forahorario === 'string' && t.forahorario.trim())
              ? t.forahorario : DEFAULT_TEMPLATES.forahorario
          };
        }
      }
    } catch (err) {
      // Mantém os padrões de fábrica se algo der errado ao carregar.
    }
    updatePreview();
  })();
})();
