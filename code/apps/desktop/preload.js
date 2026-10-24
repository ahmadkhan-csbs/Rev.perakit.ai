const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('revDesktop', {
  isDesktop: true,
  hasWasapiLoopback: true,
  onStealthStatus: (callback) => ipcRenderer.on('stealth-status', (_event, value) => callback(value)),
  onAutoScreenSnip: (callback) => ipcRenderer.on('auto-screen-snip', (_event, value) => callback(value)),
  onTeleprompterStatus: (callback) => ipcRenderer.on('teleprompter-status', (_event, value) => callback(value)),
  onQuickAction: (callback) => ipcRenderer.on('quick-action', (_event, value) => callback(value)),
  toggleTeleprompter: (enable) => ipcRenderer.invoke('toggle-teleprompter', enable),
  captureScreen: () => ipcRenderer.invoke('capture-screen')
});
