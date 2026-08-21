const { app, BrowserWindow, clipboard, Menu, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let parcialWindow = null;

function atendentesFilePath() {
  // Guardado na pasta de dados do usuário (sempre gravável, independente
  // de como o app foi instalado) — não fica preso à pasta de instalação.
  return path.join(app.getPath('userData'), 'atendentes.json');
}

function configFilePath() {
  return path.join(app.getPath('userData'), 'config.json');
}

// "Bilhetinho" deixado em disco logo antes de reiniciar para instalar uma
// atualização — o processo novo lê isso ao abrir para saber que acabou de
// atualizar (e para qual versão), já que a memória do processo anterior
// se perde quando o app fecha e reabre.
function updateMarkerPath() {
  return path.join(app.getPath('userData'), 'update-info.json');
}

function mostrarDialogoDeAtualizacaoSeNecessario() {
  try {
    const marker = updateMarkerPath();
    if (!fs.existsSync(marker)) return;

    const data = JSON.parse(fs.readFileSync(marker, 'utf-8'));
    fs.unlinkSync(marker); // remove antes de mostrar, para não repetir se algo travar

    const versao = (data && data.justUpdatedTo) || app.getVersion();
    dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Francy Scripts',
      message: 'Atualização concluída com sucesso.',
      detail: 'Nova versão: ' + versao,
      buttons: ['OK']
    });
  } catch (err) {
    // Se der algo errado lendo o bilhetinho, apenas ignora — não é crítico.
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 820,
    minWidth: 660,
    minHeight: 640,
    backgroundColor: '#f3f8f6',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.once('ready-to-show', () => {
    mostrarDialogoDeAtualizacaoSeNecessario();
  });
}

// A cópia é feita aqui, no processo principal, onde o módulo clipboard
// sempre está disponível — evita falhas silenciosas em ambientes sandboxed.
ipcMain.handle('francy:copy', (_event, text) => {
  clipboard.writeText(String(text ?? ''));
  return true;
});

// ---- Persistência dos atendentes (atendentes.json) ----

ipcMain.handle('francy:loadAtendentes', () => {
  try {
    const raw = fs.readFileSync(atendentesFilePath(), 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    // Arquivo ainda não existe (primeira vez usando o app) ou está
    // corrompido — nesse caso simplesmente começa do zero.
    return [];
  }
});

ipcMain.handle('francy:saveAtendentes', (_event, data) => {
  try {
    const safe = Array.isArray(data) ? data : [];
    fs.mkdirSync(path.dirname(atendentesFilePath()), { recursive: true });
    fs.writeFileSync(atendentesFilePath(), JSON.stringify(safe, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
});

// ---- Persistência das configurações (textos padrão dos scripts) ----

ipcMain.handle('francy:loadConfig', () => {
  try {
    const raw = fs.readFileSync(configFilePath(), 'utf-8');
    const data = JSON.parse(raw);
    return (data && typeof data === 'object') ? data : {};
  } catch (err) {
    return {};
  }
});

ipcMain.handle('francy:saveConfig', (_event, data) => {
  try {
    const safe = (data && typeof data === 'object') ? data : {};
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(configFilePath(), JSON.stringify(safe, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
});

// ---- Validar Receitas (abre o site oficial no navegador padrão) ----

ipcMain.handle('francy:abrirValidarReceitas', async () => {
  await shell.openExternal('https://validar.iti.gov.br/');
  return true;
});

ipcMain.handle('francy:abrirProDoctor', async () => {
  await shell.openExternal('https://bulas.medicamentos.app/medicamentos');
  return true;
});

// ---- Parcial de vendas (tela própria, protegida por senha na interface) ----
//
// De propósito, esta janela NÃO tem "parent" — assim ela fica totalmente
// independente da janela principal: minimizar o Francy Scripts não afeta
// o Parcial, e vice-versa.

ipcMain.handle('francy:abrirParcial', () => {
  if (parcialWindow && !parcialWindow.isDestroyed()) {
    parcialWindow.focus();
    return true;
  }

  parcialWindow = new BrowserWindow({
    width: 540,
    height: 880,
    minWidth: 380,
    minHeight: 520,
    backgroundColor: '#f2f6f3',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Parcial de Vendas',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  Menu.setApplicationMenu(null);
  parcialWindow.loadFile('parcial.html');
  parcialWindow.on('closed', () => { parcialWindow = null; });

  return true;
});

// ---- Versão do app (mostrada no topo da janela) ----

ipcMain.handle('francy:getVersion', () => app.getVersion());

// ---- Janela sempre visível (pin) ----

ipcMain.handle('francy:setAlwaysOnTop', (_event, flag) => {
  if (!mainWindow) return false;
  mainWindow.setAlwaysOnTop(!!flag, 'floating');
  return mainWindow.isAlwaysOnTop();
});

// ---- Atualização automática (GitHub Releases) ----

let versaoBaixada = null;

autoUpdater.on('update-downloaded', (info) => {
  versaoBaixada = (info && info.version) || null;
  // Avisa a interface (popup próprio) que já pode oferecer o reinício,
  // em vez de usar a notificação nativa do sistema operacional.
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('francy:update-ready');
  }
});

ipcMain.handle('francy:installUpdate', () => {
  try {
    const marker = { justUpdatedTo: versaoBaixada || app.getVersion() };
    fs.mkdirSync(path.dirname(updateMarkerPath()), { recursive: true });
    fs.writeFileSync(updateMarkerPath(), JSON.stringify(marker), 'utf-8');
  } catch (err) {
    // Mesmo se não conseguir gravar o bilhetinho, segue com a atualização
    // normalmente — só não vai mostrar a caixa de diálogo depois.
  }

  // isSilent=true: instala sem mostrar a tela do instalador.
  // isForceRunAfter=true: reabre o app sozinho depois de instalar.
  autoUpdater.quitAndInstall(true, true);
  return true;
});

// A cada quanto tempo verificar de novo enquanto o app já está aberto
// (além da checagem que já acontece ao abrir).
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Verifica atualizações no GitHub (allanrsantiago/francyscripts). Se
  // houver uma versão nova, baixa em segundo plano; quando terminar, o
  // evento 'update-downloaded' acima avisa a interface para mostrar o
  // popup. Só roda na versão instalada (empacotada); em desenvolvimento
  // (`npm start`) não existe app-update.yml e o autoUpdater erraria à toa.
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(() => {
      // Sem internet ou sem acesso ao GitHub no momento — não é crítico,
      // o app continua funcionando normalmente com a versão atual.
    });

    // Repete a checagem periodicamente para avisar de uma release nova
    // mesmo que o app fique aberto o dia inteiro sem ser reiniciado.
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, UPDATE_CHECK_INTERVAL_MS);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
