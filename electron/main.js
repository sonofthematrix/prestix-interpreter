import electron from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { app, BrowserWindow } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = process.env.PRESTIX_DESKTOP_URL || 'http://localhost:4318/voice';
const ALLOWED_ORIGIN = new URL(APP_URL).origin;
let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 500,
        center: true,
        show: false,
        title: 'Prestix — Voice Assistant',
        icon: path.join(__dirname, '..', 'public', 'prestix-icon.png'),
        backgroundColor: '#09090b',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    mainWindow.loadURL(APP_URL);
    mainWindow.setMenuBarVisibility(false);

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
        if (new URL(targetUrl).origin !== ALLOWED_ORIGIN) {
            event.preventDefault();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return new URL(url).origin === ALLOWED_ORIGIN ? { action: 'allow' } : { action: 'deny' };
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
