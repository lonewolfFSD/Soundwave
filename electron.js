const { app, BrowserWindow, session, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { shell } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "rounded.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });


win.webContents.on("will-navigate", (e, url) => {
  if (!url.includes("soundwave.lonewolffsd.in")) {
    e.preventDefault();
    shell.openExternal(url);
  }
});

  win.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  // 1. Load your live custom domain directly!
  win.loadURL("https://soundwave.lonewolffsd.in", {
    // This forces Electron to bypass its aggressive cache so users always see your latest Vercel push
    extraHeaders: 'pragma: no-cache\nCache-control: no-cache'
  });

  // 2. Keep auto-updater just in case you ever want to update the actual native shell
  win.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

app.whenReady().then(() => {
  // Clear cache on startup to guarantee they pull the newest live site
  session.defaultSession.clearCache().then(() => {
    createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- AUTO-UPDATER EVENTS ---
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'System Update',
    message: 'A native system update for SoundWave is ready. Restart to install?',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});