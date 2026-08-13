const { app, BrowserWindow, clipboard, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function atendentesFilePath() {
  // Guardado na pasta de dados do usuário (sempre gravável, independente
  // de como o app foi instalado) — não fica preso à pasta de instalação.
  return path.join(app.getPath('userData'), 'atendentes.json');
}

function configFilePath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 820,
    minWidth: 620,
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

// ---- Janela sempre visível (pin) ----

ipcMain.handle('francy:setAlwaysOnTop', (_event, flag) => {
  if (!mainWindow) return false;
  mainWindow.setAlwaysOnTop(!!flag, 'floating');
  return mainWindow.isAlwaysOnTop();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Verifica atualizações no GitHub (allanrsantiago/francyscripts) e, se
  // houver uma versão nova, baixa em segundo plano e avisa quando estiver
  // pronta — a instalação acontece na próxima vez que o app for fechado.
  // Só roda na versão instalada (empacotada); em desenvolvimento (`npm start`)
  // não existe app-update.yml e o autoUpdater erraria à toa.
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      // Sem internet ou sem acesso ao GitHub no momento — não é crítico,
      // o app continua funcionando normalmente com a versão atual.
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
