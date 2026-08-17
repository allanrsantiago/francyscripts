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
Ou se preferir você pode pedir um *Uber Flash ou 99 Entregas* que nós entregamos seu pedido a ele.`,

    endereco:
`Avenida Ministro José Américo de Almeida, 1378, Torre, João Pessoa - PB (ao lado da Unimed da beira rio)`
  };

  // Estado atual dos templates (começa nos padrões; é sobrescrito no
  // carregamento do config.json, se houver algo salvo).
  let templates = {
    boasvindas: DEFAULT_TEMPLATES.boasvindas,
    entrega: DEFAULT_TEMPLATES.entrega,
    forahorario: DEFAULT_TEMPLATES.forahorario,
    endereco: DEFAULT_TEMPLATES.endereco
  };

  // ---------- Dados das unidades (telefones) ----------

  const DEFAULT_FILIAIS = [
    { codigo: 'F01', nome: 'Ernani Sátiro', telefones: ['8332334315', '83987834315'] },
    { codigo: 'F02', nome: 'Colinas do Sul', telefones: ['8332201334', '83987831334'] },
    { codigo: 'F03', nome: 'Centro (Cabedelo)', telefones: ['8332282809', '83987832809'] },
    { codigo: 'F04', nome: 'Tibiri (Santa Rita)', telefones: ['8332173800', '83987913800'] },
    { codigo: 'F05', nome: 'Manaíra (Mag Shopping)', telefones: ['8332340008', '83988887475'] },
    { codigo: 'F06', nome: 'Cristo Redentor (Rua Pres. Ranieri Mazilli)', telefones: ['8332646273', '83987916273'] },
    { codigo: 'F07', nome: 'Ernesto Geisel', telefones: ['8332311773', '83988111773'] },
    { codigo: 'F08', nome: 'Francy Água Fria (SuperFácil)', telefones: ['8321841615', '83996780068'] },
    { codigo: 'F09', nome: 'Francy Bessa', telefones: ['8332459411', '83987259411'] },
    { codigo: 'F10', nome: 'Francy Cristo Redentor (Rua Heronides Meira de Vasconcelos)', telefones: ['8321773037', '83998060012'] },
    { codigo: 'F11', nome: 'Francy Valentina', telefones: ['8321770726', '83996190016'] },
    { codigo: 'F12', nome: 'Francy Torre', telefones: ['8321829441', '83998710665'] },
    { codigo: 'F14', nome: 'Francy Tambaú', telefones: ['8321781349', '83996780032'] },
    { codigo: 'F15', nome: 'Francy Intermares (Cabedelo)', telefones: ['8321823700', '83988742191'] },
    { codigo: 'F16', nome: 'Francy Miramar', telefones: ['8321792204', '83996780021'] }
  ];

  // Estado atual das unidades (começa nos padrões; é sobrescrito no
  // carregamento do config.json, se houver algo salvo).
  let FILIAIS = DEFAULT_FILIAIS.map((f) => ({ codigo: f.codigo, nome: f.nome, telefones: [...f.telefones] }));

  const DEFAULT_TELEFONE_TEMPLATES = {
    singular:
`O número da unidade Francy {{UNIDADE}} é {{TELEFONE1}}📱
Esse número também é WhatsApp e você pode entrar em contato por mensagem por lá.`,

    plural:
`Os números da unidade Francy {{UNIDADE}} são {{TELEFONE1}} e {{TELEFONE2}}📱 Ambos os números também são WhatsApp e você pode entrar em contato por mensagem por eles.`
  };

  let telefoneTemplates = {
    singular: DEFAULT_TELEFONE_TEMPLATES.singular,
    plural: DEFAULT_TELEFONE_TEMPLATES.plural
  };

  // Junta tudo que precisa ser persistido em config.json numa única
  // chamada — evita que salvar de uma tela apague o que foi salvo em outra.
  function currentConfigPayload() {
    return { templates, telefoneTemplates, filiais: FILIAIS };
  }

  // Formata o telefone pela quantidade de dígitos (regra real de fixo vs.
  // celular no Brasil): fixo tem 8 dígitos depois do DDD (sem 9 inicial);
  // celular tem 9 dígitos depois do DDD (com o 9 separado do restante).
  // Não dá pra usar "começa com 2" como regra — fixos no João Pessoa
  // começam tanto com 2 quanto com 3, dependendo da unidade.
  function formatTelefoneFilial(raw) {
    const digits = (raw || '').replace(/\D/g, '');
    const ddd = digits.slice(0, 2);
    const resto = digits.slice(2);

    if (resto.length <= 8) {
      return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4, 8)}`;
    }
    return `(${ddd}) ${resto.slice(0, 1)} ${resto.slice(1, 5)}-${resto.slice(5, 9)}`;
  }

  // Evita duplicar "Francy" no texto quando o nome da unidade já começa
  // com essa palavra (ex.: "Francy Bessa" → template já tem "Francy" fixo).
  function nomeParaScript(nome) {
    return nome.replace(/^Francy\s+/i, '').trim();
  }

  // Usa o script de 1 ou de 2 telefones dependendo de quantos números a
  // unidade tiver cadastrados.
  function buildTelefoneScript(filial) {
    const bairro = nomeParaScript(filial.nome);
    const numeros = (filial.telefones || []).filter(Boolean).map(formatTelefoneFilial);

    if (numeros.length >= 2) {
      return telefoneTemplates.plural
        .replace(/\{\{UNIDADE\}\}/g, bairro)
        .replace(/\{\{TELEFONE1\}\}/g, numeros[0])
        .replace(/\{\{TELEFONE2\}\}/g, numeros[1]);
    }

    return telefoneTemplates.singular
      .replace(/\{\{UNIDADE\}\}/g, bairro)
      .replace(/\{\{TELEFONE1\}\}/g, numeros[0] || '');
  }

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
    // Tela de Entrega: sem link preenchido, não copia nada e avisa em vermelho.
    if (activeTab === 'entrega' && !linkInput.value.trim()) {
      showToast('Preencha o campo com o link para poder copiar.', true);
      return;
    }

    const text = currentScript();

    if (!hasMeaningfulContent(text)) {
      showToast('Preencha os campos antes de copiar.', true);
      return;
    }

    const copied = await copyText(text);

    // Depois de copiar a mensagem de entrega, limpa o link automaticamente
    // — evita reenviar o mesmo link de rastreamento por engano da próxima vez.
    if (copied && activeTab === 'entrega') {
      linkInput.value = '';
      updatePreview();
    }

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

  // ---------- Endereço (cópia direta, sem modal) ----------

  const enderecoBtn = document.getElementById('btn-endereco');

  enderecoBtn.addEventListener('click', async () => {
    const texto = (templates.endereco || '').trim();
    if (!texto) {
      showToast('Endereço não configurado. Ajuste em Configurações.', true);
      return;
    }
    const copied = await copyText(texto);
    showToast(copied ? 'Endereço copiado!' : 'Não foi possível copiar.', !copied);
  });

  // ---------- Telefones das unidades ----------

  const telefonesBtn = document.getElementById('btn-telefones');
  const telefonesOverlay = document.getElementById('telefones-overlay');
  const filialSelect = document.getElementById('filial-select');
  const telefonePreviewEl = document.getElementById('telefone-preview');
  const telefonesCloseBtn = document.getElementById('telefones-close');
  const telefonesCopyBtn = document.getElementById('telefones-copy');
  const filiaisConfigBtn = document.getElementById('btn-filiais-config');

  function populateFilialSelect() {
    const selecionadoAntes = filialSelect.value;
    filialSelect.innerHTML = '';
    FILIAIS.forEach((f, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${f.codigo} - ${f.nome}`;
      filialSelect.appendChild(opt);
    });
    // Tenta manter a mesma unidade selecionada, se ela ainda existir.
    if (selecionadoAntes && Number(selecionadoAntes) < FILIAIS.length) {
      filialSelect.value = selecionadoAntes;
    }
  }
  populateFilialSelect();

  function atualizarPreviaTelefone() {
    const filial = FILIAIS[Number(filialSelect.value)];
    telefonePreviewEl.textContent = filial ? buildTelefoneScript(filial) : '';
  }

  function openTelefonesModal() {
    atualizarPreviaTelefone();
    telefonesOverlay.classList.add('show');
  }
  function closeTelefonesModal() {
    telefonesOverlay.classList.remove('show');
  }

  telefonesBtn.addEventListener('click', openTelefonesModal);
  telefonesCloseBtn.addEventListener('click', closeTelefonesModal);
  filialSelect.addEventListener('change', atualizarPreviaTelefone);
  telefonesOverlay.addEventListener('click', (e) => {
    if (e.target === telefonesOverlay) closeTelefonesModal();
  });

  telefonesCopyBtn.addEventListener('click', async () => {
    const filial = FILIAIS[Number(filialSelect.value)];
    if (!filial) return;
    const copied = await copyText(buildTelefoneScript(filial));
    showToast(copied ? 'Copiado!' : 'Não foi possível copiar.', !copied);
  });

  // Abrir a configuração das unidades pede a mesma senha das Configurações
  // gerais — reaproveita o modal de senha, só troca o que acontece depois.
  filiaisConfigBtn.addEventListener('click', () => {
    closeTelefonesModal();
    requestPassword(openFiliaisModal);
  });

  // ---------- Configuração das unidades e telefones (protegida por senha) ----------

  const filiaisOverlay = document.getElementById('filiais-overlay');
  const filiaisListEl = document.getElementById('filiais-list');
  const addFilialBtn = document.getElementById('add-filial');
  const cfgTelSingular = document.getElementById('cfg-telefone-singular');
  const cfgTelPlural = document.getElementById('cfg-telefone-plural');
  const filiaisError = document.getElementById('filiais-error');
  const filiaisRestoreBtn = document.getElementById('filiais-restore');
  const filiaisCancelBtn = document.getElementById('filiais-cancel');
  const filiaisSaveBtn = document.getElementById('filiais-save');
  const filialRowTemplate = document.getElementById('filial-row-template');

  function getFilialRows() {
    return Array.from(filiaisListEl.querySelectorAll('.filial-row'));
  }

  // Sugere o próximo código (F17, F18...) com base no maior já cadastrado
  // nas linhas atualmente na tela — só um ponto de partida, continua editável.
  function proximoCodigoSugerido() {
    const nums = getFilialRows().map((r) => {
      const m = r.querySelector('.filial-codigo').value.trim().match(/^F(\d+)$/i);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length ? Math.max(...nums) : 0;
    return 'F' + String(max + 1).padStart(2, '0');
  }

  function addFilialRow(filial) {
    const node = filialRowTemplate.content.cloneNode(true);
    const row = node.querySelector('.filial-row');
    row.querySelector('.filial-codigo').value = filial ? filial.codigo : proximoCodigoSugerido();
    row.querySelector('.filial-nome').value = filial ? filial.nome : '';
    row.querySelector('.filial-tel1').value = filial && filial.telefones[0] ? filial.telefones[0] : '';
    row.querySelector('.filial-tel2').value = filial && filial.telefones[1] ? filial.telefones[1] : '';
    row.querySelector('.filial-remove').addEventListener('click', () => row.remove());
    filiaisListEl.appendChild(row);
  }

  addFilialBtn.addEventListener('click', () => addFilialRow(null));

  function openFiliaisModal() {
    filiaisListEl.innerHTML = '';
    FILIAIS.forEach((f) => addFilialRow(f));
    cfgTelSingular.value = telefoneTemplates.singular;
    cfgTelPlural.value = telefoneTemplates.plural;
    filiaisError.textContent = '';
    filiaisOverlay.classList.add('show');
  }
  function closeFiliaisModal() {
    filiaisOverlay.classList.remove('show');
  }

  filiaisCancelBtn.addEventListener('click', closeFiliaisModal);
  filiaisOverlay.addEventListener('click', (e) => {
    if (e.target === filiaisOverlay) closeFiliaisModal();
  });

  filiaisRestoreBtn.addEventListener('click', () => {
    cfgTelSingular.value = DEFAULT_TELEFONE_TEMPLATES.singular;
    cfgTelPlural.value = DEFAULT_TELEFONE_TEMPLATES.plural;
    filiaisError.textContent = '';
  });

  filiaisSaveBtn.addEventListener('click', async () => {
    const novoSingular = cfgTelSingular.value;
    const novoPlural = cfgTelPlural.value;

    // O bairro e os números precisam continuar substituíveis — por isso
    // os placeholders não podem ser removidos do texto.
    if (!novoSingular.includes('{{UNIDADE}}') || !novoSingular.includes('{{TELEFONE1}}')) {
      filiaisError.textContent = 'O script de 1 telefone precisa manter {{UNIDADE}} e {{TELEFONE1}}.';
      return;
    }
    if (!novoPlural.includes('{{UNIDADE}}') || !novoPlural.includes('{{TELEFONE1}}') || !novoPlural.includes('{{TELEFONE2}}')) {
      filiaisError.textContent = 'O script de 2 telefones precisa manter {{UNIDADE}}, {{TELEFONE1}} e {{TELEFONE2}}.';
      return;
    }

    const novasFiliais = getFilialRows()
      .map((row) => {
        const codigo = row.querySelector('.filial-codigo').value.trim();
        const nome = row.querySelector('.filial-nome').value.trim();
        const tel1 = row.querySelector('.filial-tel1').value.trim();
        const tel2 = row.querySelector('.filial-tel2').value.trim();
        return { codigo, nome, telefones: [tel1, tel2].filter(Boolean) };
      })
      .filter((f) => f.codigo && f.nome && f.telefones.length > 0);

    if (novasFiliais.length === 0) {
      filiaisError.textContent = 'Cadastre pelo menos uma unidade com código, nome e telefone.';
      return;
    }

    FILIAIS = novasFiliais;
    telefoneTemplates = { singular: novoSingular, plural: novoPlural };

    try {
      if (window.francy && typeof window.francy.saveConfig === 'function') {
        await window.francy.saveConfig(currentConfigPayload());
      }
    } catch (err) {
      // Mesmo se salvar falhar, mantém a alteração aplicada nesta sessão.
    }

    populateFilialSelect();
    closeFiliaisModal();
  });

  // ---------- Versão do app ----------

  const brandVersionEl = document.getElementById('brand-version');

  (async function initVersion() {
    try {
      if (window.francy && typeof window.francy.getVersion === 'function') {
        const v = await window.francy.getVersion();
        if (v) brandVersionEl.textContent = 'v' + v;
      }
    } catch (err) {
      // Se não conseguir obter a versão (ex.: rodando fora do Electron),
      // simplesmente deixa o espaço em branco.
    }
  })();

  // ---------- Popup de atualização disponível ----------

  const updateToast = document.getElementById('update-toast');
  const updateToastClose = document.getElementById('update-toast-close');

  function showUpdateToast() {
    updateToast.classList.add('show');
  }
  function hideUpdateToast() {
    updateToast.classList.remove('show');
  }

  async function instalarAtualizacaoAgora() {
    hideUpdateToast();
    try {
      if (window.francy && typeof window.francy.installUpdate === 'function') {
        await window.francy.installUpdate();
      }
    } catch (err) {
      // Se falhar, o app continua rodando normalmente na versão atual;
      // a próxima abertura tenta atualizar de novo.
    }
  }

  // Clicar em qualquer parte do popup (menos no "×") reinicia e instala.
  updateToast.addEventListener('click', instalarAtualizacaoAgora);
  updateToast.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      instalarAtualizacaoAgora();
    }
  });
  updateToastClose.addEventListener('click', (e) => {
    e.stopPropagation();
    hideUpdateToast();
  });

  if (window.francy && typeof window.francy.onUpdateReady === 'function') {
    window.francy.onUpdateReady(showUpdateToast);
  }



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
  const cfgEndereco = document.getElementById('cfg-endereco');
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
    cfgEndereco.value = templates.endereco;
    settingsError.textContent = '';
    settingsOverlay.classList.add('show');
  }
  function closeSettingsModal() {
    settingsOverlay.classList.remove('show');
  }

  // Guarda o que deve acontecer depois que a senha for confirmada — assim
  // o mesmo modal de senha serve tanto para o Config geral quanto para a
  // configuração de unidades/telefones dentro da tela de Telefones.
  let pendingPasswordAction = null;
  function requestPassword(onSuccess) {
    pendingPasswordAction = onSuccess;
    openPasswordModal();
  }

  settingsBtn.addEventListener('click', () => requestPassword(openSettingsModal));
  passwordCancelBtn.addEventListener('click', closePasswordModal);

  async function tentarSenha() {
    const digitada = passwordInput.value;
    const hash = await sha256Hex(digitada);
    if (hash === SETTINGS_PASSWORD_HASH) {
      closePasswordModal();
      const acao = pendingPasswordAction;
      pendingPasswordAction = null;
      if (acao) acao();
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
    else if (filiaisOverlay.classList.contains('show')) closeFiliaisModal();
    else if (passwordOverlay.classList.contains('show')) closePasswordModal();
    else if (telefonesOverlay.classList.contains('show')) closeTelefonesModal();
  });

  settingsCancelBtn.addEventListener('click', closeSettingsModal);

  settingsRestoreBtn.addEventListener('click', () => {
    cfgBoasvindas.value = DEFAULT_TEMPLATES.boasvindas;
    cfgEntrega.value = DEFAULT_TEMPLATES.entrega;
    cfgForahorario.value = DEFAULT_TEMPLATES.forahorario;
    cfgEndereco.value = DEFAULT_TEMPLATES.endereco;
    settingsError.textContent = '';
  });

  settingsSaveBtn.addEventListener('click', async () => {
    const novoBoasvindas = cfgBoasvindas.value;
    const novoEntrega = cfgEntrega.value;
    const novoForahorario = cfgForahorario.value;
    const novoEndereco = cfgEndereco.value;

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
      forahorario: novoForahorario,
      endereco: novoEndereco
    };

    try {
      if (window.francy && typeof window.francy.saveConfig === 'function') {
        await window.francy.saveConfig(currentConfigPayload());
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
              ? t.forahorario : DEFAULT_TEMPLATES.forahorario,
            endereco: (typeof t.endereco === 'string' && t.endereco.trim())
              ? t.endereco : DEFAULT_TEMPLATES.endereco
          };
        }

        const tt = cfg && cfg.telefoneTemplates;
        if (tt && typeof tt === 'object') {
          telefoneTemplates = {
            singular: (typeof tt.singular === 'string' && tt.singular.includes('{{UNIDADE}}') && tt.singular.includes('{{TELEFONE1}}'))
              ? tt.singular : DEFAULT_TELEFONE_TEMPLATES.singular,
            plural: (typeof tt.plural === 'string' && tt.plural.includes('{{UNIDADE}}') && tt.plural.includes('{{TELEFONE1}}') && tt.plural.includes('{{TELEFONE2}}'))
              ? tt.plural : DEFAULT_TELEFONE_TEMPLATES.plural
          };
        }

        const fl = cfg && cfg.filiais;
        if (Array.isArray(fl)) {
          const validas = fl.filter((f) => f && typeof f.codigo === 'string' && typeof f.nome === 'string'
            && Array.isArray(f.telefones) && f.telefones.filter(Boolean).length > 0);
          if (validas.length > 0) FILIAIS = validas;
        }

        populateFilialSelect();
      }
    } catch (err) {
      // Mantém os padrões de fábrica se algo der errado ao carregar.
    }
    updatePreview();
  })();
})();
