const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {

  // AUTH API
  auth: {
    login: (nombreUsuario, contrasena) => 
      ipcRenderer.invoke('auth:login', nombreUsuario, contrasena),
    
    verificar: (token) => 
      ipcRenderer.invoke('auth:verificar', token),
    
    logout: () => 
      ipcRenderer.invoke('auth:logout')
  },

  // Usuarios API
  // CRUD para usuarios (registrar, obtener, actualizar, eliminar)

  usuarios: {
    registrar: (datosUsuario, token) => 
      ipcRenderer.invoke('usuarios:registrar', datosUsuario, token),
    
    obtener: (token) => 
      ipcRenderer.invoke('usuarios:obtener', token),
    
    actualizar: (idUsuario, datosUsuario, token) => 
      ipcRenderer.invoke('usuarios:actualizar', idUsuario, datosUsuario, token),
    
    eliminar: (idUsuario, token) => 
      ipcRenderer.invoke('usuarios:eliminar', idUsuario, token)
  },

  // Roles API
  // Obtener la lista de roles (roles:obtener)

  roles: {
    obtener: (token) => ipcRenderer.invoke('roles:obtener', token)
  },

  // Navegación
  // Cargar páginas en la ventana principal

  navegacion: {
    irA: (pagina) => 
      ipcRenderer.invoke('navegacion:cargarPagina', pagina)
  },

  // Storage (localStorage wrapper)
  // Métodos: guardar, obtener, eliminar, limpiar

  storage: {
    guardar: (clave, valor) => {
      localStorage.setItem(clave, JSON.stringify(valor));
    },
    
    obtener: (clave) => {
      const valor = localStorage.getItem(clave);
      return valor ? JSON.parse(valor) : null;
    },
    
    eliminar: (clave) => {
      localStorage.removeItem(clave);
    },
    
    limpiar: () => {
      localStorage.clear();
    }
  }
});