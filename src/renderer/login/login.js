const loginForm = document.getElementById('loginForm');
const nombreUsuarioInput = document.getElementById('nombreUsuario');
const contrasenaInput = document.getElementById('contrasena');
const togglePasswordBtn = document.getElementById('togglePassword');
const recordarmeCheckbox = document.getElementById('recordarme');
const btnLogin = document.getElementById('btnLogin');
const mensaje = document.getElementById('mensaje');

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay sesión activa
    verificarSesionActiva();

    // Cargar usuario guardado si existe
    cargarUsuarioGuardado();

    // Event Listeners
    loginForm.addEventListener('submit', manejarLogin);
    togglePasswordBtn.addEventListener('click', togglePassword);

    // Focus en el primer input
    nombreUsuarioInput.focus();
});

// ============================================
// VERIFICAR SESIÓN ACTIVA
// ============================================

async function verificarSesionActiva() {
    const token = window.electronAPI.storage.obtener('token');
    const usuario = window.electronAPI.storage.obtener('usuario');

    if (token && usuario) {
        const resultado = await window.electronAPI.auth.verificar(token);
        
        if (resultado.valido) {
            // Token válido, redirigir según rol
            redirigirSegunRol(usuario.rol);
        } else {
            // Token inválido, limpiar storage
            window.electronAPI.storage.limpiar();
        }
    }
}

// ============================================
// CARGAR USUARIO GUARDADO
// ============================================

function cargarUsuarioGuardado() {
    const usuarioGuardado = window.electronAPI.storage.obtener('usuarioGuardado');
    
    if (usuarioGuardado) {
        nombreUsuarioInput.value = usuarioGuardado;
        recordarmeCheckbox.checked = true;
        contrasenaInput.focus();
    }
}

// ============================================
// MANEJAR LOGIN
// ============================================

async function manejarLogin(e) {
    e.preventDefault();

    const nombreUsuario = nombreUsuarioInput.value.trim();
    const contrasena = contrasenaInput.value;

    // Validaciones básicas
    if (!nombreUsuario || !contrasena) {
        mostrarMensaje('Por favor completa todos los campos', 'error');
        return;
    }

    if (nombreUsuario.length < 3) {
        mostrarMensaje('El usuario debe tener al menos 3 caracteres', 'error');
        return;
    }

    if (contrasena.length < 6) {
        mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // Mostrar loading
    mostrarLoading(true);

    try {
        // Hacer login
        const resultado = await window.electronAPI.auth.login(nombreUsuario, contrasena);

        if (resultado.success) {
            // Login exitoso
            mostrarMensaje('¡Inicio de sesión exitoso!', 'exito');

            // Guardar datos
            window.electronAPI.storage.guardar('token', resultado.token);
            window.electronAPI.storage.guardar('usuario', resultado.usuario);

            // Guardar usuario si "recordarme" está marcado
            if (recordarmeCheckbox.checked) {
                window.electronAPI.storage.guardar('usuarioGuardado', nombreUsuario);
            } else {
                window.electronAPI.storage.eliminar('usuarioGuardado');
            }

            // Esperar un momento para que el usuario vea el mensaje
            setTimeout(() => {
                redirigirSegunRol(resultado.usuario.rol);
            }, 1000);

        } else {
            // Login fallido
            mostrarMensaje(resultado.message || 'Usuario o contraseña incorrectos', 'error');
            mostrarLoading(false);
            
            // Limpiar contraseña
            contrasenaInput.value = '';
            contrasenaInput.focus();
        }

    } catch (error) {
        console.error('Error en login:', error);
        mostrarMensaje('Error de conexión. Verifica que la base de datos esté activa.', 'error');
        mostrarLoading(false);
    }
}

// ============================================
// REDIRIGIR SEGÚN ROL
// ============================================

function redirigirSegunRol(rol) {
    if (rol === 'admin') {
        window.electronAPI.navegacion.irA('admin');
    } else {
        window.electronAPI.navegacion.irA('usuario');
    }
}

// ============================================
// TOGGLE PASSWORD
// ============================================

function togglePassword() {
    const tipo = contrasenaInput.type === 'password' ? 'text' : 'password';
    contrasenaInput.type = tipo;

    // Cambiar icono
    const icono = togglePasswordBtn.querySelector('svg');
    if (tipo === 'text') {
        icono.innerHTML = `
            
        `;
    } else {
        icono.innerHTML = `
            
        `;
    }
}

// ============================================
// MOSTRAR MENSAJE
// ============================================

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
    mensaje.style.display = 'flex';

    // Ocultar después de 5 segundos si es error
    if (tipo === 'error') {
        setTimeout(() => {
            mensaje.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// MOSTRAR/OCULTAR LOADING
// ============================================

function mostrarLoading(mostrar) {
    const btnText = btnLogin.querySelector('.btn-text');
    const btnLoader = btnLogin.querySelector('.btn-loader');

    if (mostrar) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        btnLogin.disabled = true;
        
        // Deshabilitar inputs
        nombreUsuarioInput.disabled = true;
        contrasenaInput.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btnLogin.disabled = false;
        
        // Habilitar inputs
        nombreUsuarioInput.disabled = false;
        contrasenaInput.disabled = false;
    }
}

// ============================================
// ATAJOS DE TECLADO
// ============================================

document.addEventListener('keydown', (e) => {
    // ESC para limpiar el formulario
    if (e.key === 'Escape') {
        loginForm.reset();
        mensaje.style.display = 'none';
        nombreUsuarioInput.focus();
    }

    // Ctrl/Cmd + K para focus en usuario
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        nombreUsuarioInput.focus();
        nombreUsuarioInput.select();
    }
});

// ============================================
// VALIDACIÓN EN TIEMPO REAL
// ============================================

nombreUsuarioInput.addEventListener('input', () => {
    const valor = nombreUsuarioInput.value.trim();
    
    if (valor.length > 0 && valor.length < 3) {
        nombreUsuarioInput.style.borderColor = 'var(--color-warning)';
    } else {
        nombreUsuarioInput.style.borderColor = 'var(--border-color)';
    }
});

contrasenaInput.addEventListener('input', () => {
    const valor = contrasenaInput.value;
    
    if (valor.length > 0 && valor.length < 6) {
        contrasenaInput.style.borderColor = 'var(--color-warning)';
    } else {
        contrasenaInput.style.borderColor = 'var(--border-color)';
    }
});

// ============================================
// AUTO-COMPLETAR (OPCIONAL)
// ============================================

// Si el usuario presiona Tab en el campo de usuario y está vacío
nombreUsuarioInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !nombreUsuarioInput.value) {
        e.preventDefault();
        nombreUsuarioInput.value = 'admin';
        contrasenaInput.focus();
    }
});

console.log('✅ Login page cargada correctamente');