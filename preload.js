const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('francy', {
  // Pede ao processo principal para escrever no clipboard (mais confiável
  // do que acessar o módulo clipboard diretamente do preload).
  copyToClipboard: (text) => ipcRenderer.invoke('francy:copy', text),

  // Persistência dos atendentes cadastrados (atendentes.json).
  loadAtendentes: () => ipcRenderer.invoke('francy:loadAtendentes'),
  saveAtendentes: (data) => ipcRenderer.invoke('francy:saveAtendentes', data),

  // Persistência das configurações (config.json).
  loadConfig: () => ipcRenderer.invoke('francy:loadConfig'),
  saveConfig: (data) => ipcRenderer.invoke('francy:saveConfig', data),

  // Janela sempre visível (pin).
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('francy:setAlwaysOnTop', flag)
});
