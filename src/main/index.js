const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const auth = require('./auth');

let mainWindow;

function crearVentana() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f172a'
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/login/login.html'));

  // Abrir DevTools en desarrollo
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ============================================
// IPC HANDLERS - AUTH
// ============================================

ipcMain.handle('auth:login', async (event, nombreUsuario, contrasena) => {
  return await auth.login(nombreUsuario, contrasena);
});

ipcMain.handle('auth:verificar', async (event, token) => {
  return auth.verificarToken(token);
});

ipcMain.handle('auth:logout', async (event) => {
  return { success: true };
});

// ============================================
// IPC HANDLERS - USUARIOS
// ============================================

ipcMain.handle('usuarios:registrar', async (event, datosUsuario, token) => {
  return await auth.registrarUsuario(datosUsuario, token);
});

ipcMain.handle('usuarios:obtener', async (event, token) => {
  return await auth.obtenerUsuarios(token);
});

ipcMain.handle('usuarios:actualizar', async (event, idUsuario, datosUsuario, token) => {
  return await auth.actualizarUsuario(idUsuario, datosUsuario, token);
});

ipcMain.handle('usuarios:eliminar', async (event, idUsuario, token) => {
  return await auth.eliminarUsuario(idUsuario, token);
});

// ============================================
// IPC HANDLERS - NAVEGACIÓN
// ============================================

ipcMain.handle('navegacion:cargarPagina', async (event, pagina) => {
  const paginas = {
    admin: '../renderer/admin/admin.html',
    usuario: '../renderer/usuario/usuario.html',
    login: '../renderer/login/login.html'
  };
  
  if (paginas[pagina]) {
    mainWindow.loadFile(path.join(__dirname, paginas[pagina]));
    return { success: true };
  }
  return { success: false, message: 'Página no encontrada' };
});

// ============================================
// EVENTOS DE APLICACIÓN
// ============================================

app.whenReady().then(() => {
  crearVentana();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentana();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promesa rechazada:', error);
});