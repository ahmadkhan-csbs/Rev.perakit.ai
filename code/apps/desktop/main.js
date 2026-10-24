const { app, BrowserWindow, globalShortcut, screen, desktopCapturer, ipcMain, session } = require('electron');
const path = require('path');

let win = null;
let isClickThrough = false;
let isTeleprompter = false;
let normalBounds = null;

function setTeleprompterMode(enable) {
  if (!win) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  if (enable) {
    if (!isTeleprompter) {
      normalBounds = win.getBounds();
    }
    isTeleprompter = true;
    const prompterWidth = 620;
    const prompterHeight = 165;
    const prompterX = Math.round((width - prompterWidth) / 2);
    const prompterY = 0; // Pinned directly under physical webcam
    win.setBounds({
      x: prompterX,
      y: prompterY,
      width: prompterWidth,
      height: prompterHeight
    });
  } else {
    isTeleprompter = false;
    if (normalBounds) {
      win.setBounds(normalBounds);
    } else {
      win.setBounds({
        x: width - 480,
        y: 60,
        width: 460,
        height: 740
      });
    }
  }
  win.webContents.send('teleprompter-status', { isTeleprompter });
}

// Feature #3: Activity Monitor / Task Manager masquerading
// App title and process disguise so Task Manager displays standard audio helper
app.name = "Windows Audio Enhancement Service";

async function capturePrimaryScreen() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const scale = primaryDisplay.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.floor(width * scale),
      height: Math.floor(height * scale)
    }
  });
  if (!sources || sources.length === 0) {
    throw new Error("No screen source found for capture");
  }
  const source = sources[0];
  const pngBuffer = source.thumbnail.toPNG();
  return pngBuffer.toString('base64');
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  win = new BrowserWindow({
    width: 460,
    height: 740,
    x: width - 480,
    y: 60,
    frame: false,             // Frameless floating HUD
    transparent: true,         // Transparent backdrop
    alwaysOnTop: true,         // Stays above Zoom / Meet / Code editors
    skipTaskbar: true,         // Feature #2: Invisible in Taskbar / Dock!
    resizable: true,
    hasShadow: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Feature #1: Invisible on Screen Share (Windows OS GPU capture exclusion)
  // Calls SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE) under the hood on Win10/11
  win.setContentProtection(true);

  // Set always on top over fullscreen apps
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Load the live session directly from our running Next.js web server
  const targetUrl = 'http://localhost:3000/session?overlay=true';
  const loadWithRetry = () => {
    win.loadURL(targetUrl).catch((err) => {
      console.log('Waiting for Rev.perakit.ai server at localhost:3000...', err.message);
      setTimeout(loadWithRetry, 2000);
    });
  };
  loadWithRetry();

  win.webContents.on('did-fail-load', () => {
    console.log('Page failed to load, retrying in 2 seconds...');
    setTimeout(() => {
      if (win && !win.isDestroyed()) win.loadURL(targetUrl);
    }, 2000);
  });

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createOverlayWindow();

  // Feature #7: Windows Virtual Audio WASAPI Loopback (Zero Tab-Share Required)
  // Automatically fulfills any getDisplayMedia audio request with Windows system loopback
  // without showing ANY dialog, prompt, or screen-picker!
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      const primary = sources[0];
      // 'loopback' enables Windows WASAPI loopback (capturing Zoom, MS Teams, Meet, Slack, system sound)
      callback({ video: primary, audio: 'loopback' });
    }).catch((err) => {
      console.error("setDisplayMediaRequestHandler error:", err);
      callback({});
    });
  });

  // IPC Handler for Screen Capture
  ipcMain.handle('capture-screen', async () => {
    try {
      const base64 = await capturePrimaryScreen();
      return { success: true, imageBase64: base64 };
    } catch (err) {
      console.error("Screen capture failed:", err);
      return { success: false, error: err.message };
    }
  });

  // IPC Handler for Teleprompter Mode
  ipcMain.handle('toggle-teleprompter', (_event, enable) => {
    setTeleprompterMode(typeof enable === 'boolean' ? enable : !isTeleprompter);
    return isTeleprompter;
  });

  // Feature #6: Webcam Teleprompter Mode (Alt + T)
  // Pin floating HUD directly beneath the physical webcam for 100% natural eye contact!
  globalShortcut.register('Alt+T', () => {
    if (!win) return;
    setTeleprompterMode(!isTeleprompter);
  });

  // Feature #4 & #5: Cursor Undetectability & Click-Through Toggle (Alt + X)
  globalShortcut.register('Alt+X', () => {
    if (!win) return;
    isClickThrough = !isClickThrough;
    win.setIgnoreMouseEvents(isClickThrough, { forward: true });
    win.webContents.send('stealth-status', { clickThrough: isClickThrough });
  });

  // Alt + H: Instant Panic Hide / Show
  globalShortcut.register('Alt+H', () => {
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });

  // Feature: Auto LeetCode & Coding Screen Snip (Ctrl+Alt+S)
  const registerSnip = (key) => {
    try {
      globalShortcut.register(key, async () => {
        if (!win) return;
        try {
          const base64 = await capturePrimaryScreen();
          win.webContents.send('auto-screen-snip', { imageBase64: base64 });
        } catch (err) {
          console.error("Auto screen snip failed:", err);
        }
      });
    } catch (e) {
      console.warn(`Could not register ${key}:`, e.message);
    }
  };
  registerSnip('CommandOrControl+Alt+S');
  registerSnip('Ctrl+Alt+S');

  // Feature #8: Quick Hotkey Actions (Panic & Prompts)
  // Alt+S: "Simpler Banao" (Short 2-liner version)
  const safeRegister = (key, handler) => {
    try { globalShortcut.register(key, handler); }
    catch (e) { console.warn(`Could not register ${key}:`, e.message); }
  };

  safeRegister('Alt+S', () => {
    if (!win) return;
    win.webContents.send('quick-action', { action: 'simpler' });
  });

  // Alt+D: "Deep Dive" (Advanced system design / internal details)
  safeRegister('Alt+D', () => {
    if (!win) return;
    win.webContents.send('quick-action', { action: 'deep_dive' });
  });

  // Alt+C: "Only Code" (Direct clean code, no filler)
  safeRegister('Alt+C', () => {
    if (!win) return;
    win.webContents.send('quick-action', { action: 'only_code' });
  });

  // Alt+Z: "Panic Clear" (Instant blank / clear screen)
  safeRegister('Alt+Z', () => {
    if (!win) return;
    win.webContents.send('quick-action', { action: 'panic_clear' });
  });

  // Alt + Up / Down: Adjust Window Opacity
  globalShortcut.register('Alt+Up', () => {
    if (!win) return;
    const cur = win.getOpacity();
    if (cur < 1) win.setOpacity(Math.min(1, cur + 0.1));
  });

  globalShortcut.register('Alt+Down', () => {
    if (!win) return;
    const cur = win.getOpacity();
    if (cur > 0.2) win.setOpacity(Math.max(0.2, cur - 0.1));
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
