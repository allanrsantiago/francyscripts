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
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('francy:setAlwaysOnTop', flag),

  // Versão do app (mostrada no topo).
  getVersion: () => ipcRenderer.invoke('francy:getVersion'),

  // Validar Receitas (abre o site do ITI no navegador padrão) e a tela
  // do Parcial de Vendas (janela própria).
  abrirValidarReceitas: () => ipcRenderer.invoke('francy:abrirValidarReceitas'),
  abrirProDoctor: () => ipcRenderer.invoke('francy:abrirProDoctor'),
  abrirParcial: () => ipcRenderer.invoke('francy:abrirParcial'),

  // Atualização automática: avisa quando uma atualização já foi baixada
  // e está pronta para instalar, e permite acionar o reinício.
  onUpdateReady: (callback) => ipcRenderer.on('francy:update-ready', () => callback()),
  installUpdate: () => ipcRenderer.invoke('francy:installUpdate')
});
