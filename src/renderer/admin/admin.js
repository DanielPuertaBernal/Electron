const tablaBody = document.querySelector('#tablaUsuarios tbody');
const btnNuevo = document.getElementById('btnNuevoUsuario');
const btnRefresh = document.getElementById('btnRefresh');
const btnLogout = document.getElementById('btnLogout');

document.addEventListener('DOMContentLoaded', () => {
  inicializar();
});

async function inicializar() {
  const token = window.electronAPI.storage.obtener('token');
  if (!token) {
    await Swal.fire({icon:'warning', text:'Necesitas iniciar sesión', timer:1500, showConfirmButton:false});
    await window.electronAPI.navegacion.irA('login');
    return;
  }

  cargarUsuarios(token);

  btnNuevo.addEventListener('click', () => abrirFormularioNuevo(token));
  btnRefresh.addEventListener('click', () => cargarUsuarios(token));
  btnLogout.addEventListener('click', logout);
}

async function cargarUsuarios(token) {
  tablaBody.innerHTML = '<tr><td colspan="7" style="opacity:0.6;padding:24px;text-align:center">Cargando...</td></tr>';
  const res = await window.electronAPI.usuarios.obtener(token);
  if (!res || !res.success) {
    tablaBody.innerHTML = '<tr><td colspan="7">Error cargando usuarios</td></tr>';
    Swal.fire({icon:'error', text: res?.message || 'Error al obtener usuarios'});
    return;
  }

  tablaBody.innerHTML = '';
  res.usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(u.nombreusuario || '')}</td>
      <td>${escapeHtml(u.nombrecompleto || '')}</td>
      <td>${escapeHtml(u.email || '')}</td>
      <td>${escapeHtml(u.nombrerol || '')}</td>
      <td>${escapeHtml(u.telefono || '')}</td>
      <td>${u.activo ? '<span class="chip success">Sí</span>' : '<span class="chip inactive">No</span>'}</td>
      <td class="acciones">
        <button class="accion-btn" data-id="${u.idusuario}" data-action="edit">Editar</button>
        <button class="accion-btn delete" data-id="${u.idusuario}" data-action="delete">Eliminar</button>
      </td>
    `;
    tablaBody.appendChild(tr);
  });

  // delegated actions
  tablaBody.querySelectorAll('button.accion-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id, 10);
      const action = e.currentTarget.dataset.action;
      if (action === 'edit') abrirEditar(id);
      if (action === 'delete') confirmarEliminar(id);
    });
  });
}

function escapeHtml(s){
  if (!s) return '';
  return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

async function abrirFormularioNuevo(token){
  // Obtener roles desde el backend para evitar enviar un rol inválido
  let rolesRes = { success: false, roles: [] };
  try {
    rolesRes = await window.electronAPI.roles.obtener(token);
  } catch (err) {
    console.error('Error obteniendo roles:', err);
  }

  const roles = (rolesRes && rolesRes.success && Array.isArray(rolesRes.roles)) ? rolesRes.roles : [{ idrol: 1, nombrerol: 'usuario' }];

  // construir HTML del modal con las opciones obtenidas
  const rolOptionsHtml = roles.map(r => `<option value="${escapeHtml(r.nombrerol)}">${escapeHtml(r.nombrerol)}</option>`).join('');

  const modalHtml = `
    <div class="sw-grid">
      <div class="sw-field">
        <label>Usuario</label>
        <input id="swUsuario" class="swal2-input large" placeholder="usuario">
      </div>
      <div class="sw-field">
        <label>Rol</label>
        <select id="swRol" class="swal2-input large">${rolOptionsHtml}</select>
      </div>

      <div class="sw-field">
        <label>Nombre</label>
        <input id="swNombre" class="swal2-input" placeholder="Nombre completo">
      </div>
      <div class="sw-field">
        <label>Teléfono</label>
        <input id="swTelefono" class="swal2-input" placeholder="(+57) 300 000 0000">
      </div>

      <div class="sw-field" style="grid-column:1 / span 2">
        <label>Email</label>
        <input id="swEmail" class="swal2-input" placeholder="correo@dominio.com">
      </div>

      <div class="sw-field" style="grid-column:1 / span 2">
        <label>Contraseña</label>
        <input id="swPassword" type="password" class="swal2-input" placeholder="Contraseña">
      </div>
    </div>
  `;

  const { value: formValues } = await Swal.fire({
    title: 'Crear usuario',
    html: modalHtml,
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      const datos = {
        nombreUsuario: document.getElementById('swUsuario').value.trim(),
        nombreCompleto: document.getElementById('swNombre').value.trim(),
        email: document.getElementById('swEmail').value.trim(),
        telefono: document.getElementById('swTelefono').value.trim(),
        rol: document.getElementById('swRol').value,
        contrasena: document.getElementById('swPassword').value
      };

      // Validaciones en cliente con mensajes claros en el modal
      if (!datos.nombreUsuario) {
        Swal.showValidationMessage('El usuario es obligatorio');
        return false;
      }
      if (!datos.contrasena || datos.contrasena.length < 6) {
        Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
      if (!datos.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
        Swal.showValidationMessage('Ingresa un email válido (ejemplo: correo@dominio.com)');
        return false;
      }

      return datos;
    }
  });

    if (formValues) {
    // minimal validation
    if (!formValues.nombreUsuario || !formValues.contrasena) {
      Swal.fire({icon:'warning', text:'Usuario y contraseña son obligatorios'});
      return;
    }
    const res = await window.electronAPI.usuarios.registrar(formValues, token);
    if (res && res.success) {
      Swal.fire({icon:'success', text:'Usuario creado'});
      cargarUsuarios(token);
    } else {
      Swal.fire({icon:'error', text:res?.message || 'Error al crear usuario'});
    }
  }
}

async function abrirEditar(id){
  const token = window.electronAPI.storage.obtener('token');
  const resAll = await window.electronAPI.usuarios.obtener(token);
  if (!resAll.success) return Swal.fire({icon:'error', text:'No se pudo obtener usuario'});
  const u = resAll.usuarios.find(x => x.idusuario === id);
  if (!u) return Swal.fire({icon:'error', text:'Usuario no encontrado'});

  const { value: datos } = await Swal.fire({
    title: 'Editar usuario',
    html:
      `<div class="sw-row"><label>Nombre</label><input id="eNombre" class="swal2-input" value="${escapeHtml(u.nombrecompleto||'')}"></div>` +
      `<div class="sw-row"><label>Email</label><input id="eEmail" class="swal2-input" value="${escapeHtml(u.email||'')}"></div>` +
      `<div class="sw-row"><label>Teléfono</label><input id="eTelefono" class="swal2-input" value="${escapeHtml(u.telefono||'')}"></div>` +
      `<div class="sw-row"><label>Estado</label><select id="eActivo" class="swal2-input"><option value="true">Activo</option><option value="false">Inactivo</option></select></div>`,
    focusConfirm:false,
    preConfirm: () => ({
      nombreCompleto: document.getElementById('eNombre').value.trim(),
      email: document.getElementById('eEmail').value.trim(),
      telefono: document.getElementById('eTelefono').value.trim(),
      activo: document.getElementById('eActivo').value === 'true'
    })
  });

  if (datos) {
    const upd = await window.electronAPI.usuarios.actualizar(id, datos, token);
    if (upd && upd.success) {
      Swal.fire({icon:'success', text:'Usuario actualizado'});
      cargarUsuarios(token);
    } else {
      Swal.fire({icon:'error', text: upd?.message || 'Error al actualizar'});
    }
  }
}

async function confirmarEliminar(id){
  const token = window.electronAPI.storage.obtener('token');
  const { isConfirmed } = await Swal.fire({
    title: 'Eliminar usuario',
    text: '¿Seguro que quieres eliminar este usuario?',
    icon: 'warning',
    showCancelButton: true
  });
  if (!isConfirmed) return;
  const res = await window.electronAPI.usuarios.eliminar(id, token);
  if (res && res.success) {
    Swal.fire({icon:'success', text:'Eliminado'});
    cargarUsuarios(token);
  } else Swal.fire({icon:'error', text: res?.message || 'Error al eliminar'});
}

async function logout(){
  window.electronAPI.storage.eliminar('token');
  window.electronAPI.storage.eliminar('usuario');
  await window.electronAPI.auth.logout();
  await window.electronAPI.navegacion.irA('login');
}
