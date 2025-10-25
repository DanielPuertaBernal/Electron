const btnEditar = document.getElementById('btnEditar');
const btnLogout = document.getElementById('btnLogout');

document.addEventListener('DOMContentLoaded', () => {
  const usuario = window.electronAPI.storage.obtener('usuario');
  if (!usuario) {
    Swal.fire({icon:'warning', text:'No hay sesión activa', timer:1200, showConfirmButton:false});
    window.electronAPI.navegacion.irA('login');
    return;
  }

  document.getElementById('pUsuario').textContent = usuario.nombreUsuario || '';
  document.getElementById('pNombre').textContent = usuario.nombreCompleto || '';
  document.getElementById('pEmail').textContent = usuario.email || '';
  document.getElementById('pTelefono').textContent = usuario.telefono || '';

  btnEditar.addEventListener('click', editarPerfil);
  btnLogout.addEventListener('click', logout);
});

async function editarPerfil(){
  const usuario = window.electronAPI.storage.obtener('usuario');
  const { value: datos } = await Swal.fire({
    title: 'Editar perfil',
    html:
      `<div class="sw-row"><label>Nombre completo</label><input id="uNombre" class="swal2-input" value="${sanitize(usuario.nombreCompleto||'')}"></div>` +
      `<div class="sw-row"><label>Email</label><input id="uEmail" class="swal2-input" value="${sanitize(usuario.email||'')}"></div>` +
      `<div class="sw-row"><label>Teléfono</label><input id="uTelefono" class="swal2-input" value="${sanitize(usuario.telefono||'')}"></div>`,
    focusConfirm:false,
    preConfirm: () => ({
      nombreCompleto: document.getElementById('uNombre').value.trim(),
      email: document.getElementById('uEmail').value.trim(),
      telefono: document.getElementById('uTelefono').value.trim()
    })
  });
  if (!datos) return;
  const token = window.electronAPI.storage.obtener('token');
  const res = await window.electronAPI.usuarios.actualizar(usuario.idUsuario || usuario.idusuario, datos, token);
  if (res && res.success) {
    // actualizar storage con nuevo usuario
    const updated = Object.assign({}, usuario, datos);
    window.electronAPI.storage.guardar('usuario', updated);
    document.getElementById('pNombre').textContent = updated.nombreCompleto || '';
    document.getElementById('pEmail').textContent = updated.email || '';
    document.getElementById('pTelefono').textContent = updated.telefono || '';
    Swal.fire({icon:'success', text:'Perfil actualizado'});
  } else Swal.fire({icon:'error', text: res?.message || 'Error al actualizar perfil'});
}

function sanitize(s){ return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function logout(){
  window.electronAPI.storage.eliminar('token');
  window.electronAPI.storage.eliminar('usuario');
  await window.electronAPI.auth.logout();
  window.electronAPI.navegacion.irA('login');
}
