import electron from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { app, BrowserWindow } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = process.env.PRESTIX_DESKTOP_URL || 'http://localhost:4318/voice';
let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 500,
        center: true,
        title: 'Prestix — Voice Assistant',
        icon: path.join(__dirname, '..', 'public', 'prestix-icon.png'),
        backgroundColor: '#09090b',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadURL(APP_URL);
    mainWindow.setMenuBarVisibility(false);

    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
