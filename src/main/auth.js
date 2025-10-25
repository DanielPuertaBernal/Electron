const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./database');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// Login
async function login(nombreUsuario, contrasena) {
  try {
    const result = await pool.query(
      `SELECT u.*, r.nombreRol 
       FROM usuarios u 
       INNER JOIN roles r ON u.idRol = r.idRol 
       WHERE u.nombreUsuario = $1 AND u.activo = true`,
      [nombreUsuario]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'Usuario no encontrado o inactivo' };
    }

    const usuario = result.rows[0];
    const esValida = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!esValida) {
      return { success: false, message: 'Contraseña incorrecta' };
    }

    const token = jwt.sign(
      { 
        idUsuario: usuario.idusuario, 
        nombreUsuario: usuario.nombreusuario, 
        rol: usuario.nombrerol 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    return {
      success: true,
      token,
      usuario: {
        idUsuario: usuario.idusuario,
        nombreUsuario: usuario.nombreusuario,
        email: usuario.email,
        nombreCompleto: usuario.nombrecompleto,
        rol: usuario.nombrerol,
        telefono: usuario.telefono
      }
    };
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, message: 'Error del servidor' };
  }
}

// Verificar token
function verificarToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valido: true, datos: decoded };
  } catch (error) {
    return { valido: false, error: error.message };
  }
}

// Registrar usuario (solo admin)
async function registrarUsuario(datosUsuario, tokenAdmin) {
  try {
    const tokenData = verificarToken(tokenAdmin);
    
    if (!tokenData.valido || tokenData.datos.rol !== 'admin') {
      return { success: false, message: 'No autorizado' };
    }

    const contrasenaHash = await bcrypt.hash(datosUsuario.contrasena, SALT_ROUNDS);

    // Obtener idRol
    const rolResult = await pool.query(
      'SELECT idRol FROM roles WHERE nombreRol = $1',
      [datosUsuario.rol]
    );

    if (rolResult.rows.length === 0) {
      return { success: false, message: 'Rol no válido' };
    }

    const result = await pool.query(
      `INSERT INTO usuarios (nombreUsuario, email, contrasena, nombreCompleto, idRol, telefono) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING idUsuario, nombreUsuario, email, nombreCompleto`,
      [
        datosUsuario.nombreUsuario, 
        datosUsuario.email, 
        contrasenaHash, 
        datosUsuario.nombreCompleto, 
        rolResult.rows[0].idrol,
        datosUsuario.telefono
      ]
    );

    return { success: true, usuario: result.rows[0] };
  } catch (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Usuario o email ya existe' };
    }
    console.error('Error en registro:', error);
    return { success: false, message: 'Error al registrar usuario' };
  }
}

// Obtener todos los usuarios (solo admin)
async function obtenerUsuarios(tokenAdmin) {
  try {
    const tokenData = verificarToken(tokenAdmin);
    
    if (!tokenData.valido || tokenData.datos.rol !== 'admin') {
      return { success: false, message: 'No autorizado' };
    }

    const result = await pool.query(
      `SELECT u.idUsuario, u.nombreUsuario, u.email, u.nombreCompleto, 
              r.nombreRol, u.telefono, u.activo, u.fechaCreacion
       FROM usuarios u
       INNER JOIN roles r ON u.idRol = r.idRol
       ORDER BY u.fechaCreacion DESC`
    );

    return { success: true, usuarios: result.rows };
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return { success: false, message: 'Error del servidor' };
  }
}

// Actualizar usuario
async function actualizarUsuario(idUsuario, datosUsuario, token) {
  try {
    const tokenData = verificarToken(token);
    
    if (!tokenData.valido) {
      return { success: false, message: 'Token inválido' };
    }

    if (tokenData.datos.idUsuario !== idUsuario && tokenData.datos.rol !== 'admin') {
      return { success: false, message: 'No autorizado' };
    }

    const campos = [];
    const valores = [];
    let contador = 1;

    if (datosUsuario.nombreCompleto) {
      campos.push(`nombreCompleto = $${contador}`);
      valores.push(datosUsuario.nombreCompleto);
      contador++;
    }

    if (datosUsuario.email) {
      campos.push(`email = $${contador}`);
      valores.push(datosUsuario.email);
      contador++;
    }

    if (datosUsuario.telefono !== undefined) {
      campos.push(`telefono = $${contador}`);
      valores.push(datosUsuario.telefono);
      contador++;
    }

    if (datosUsuario.contrasena) {
      const contrasenaHash = await bcrypt.hash(datosUsuario.contrasena, SALT_ROUNDS);
      campos.push(`contrasena = $${contador}`);
      valores.push(contrasenaHash);
      contador++;
    }

    if (campos.length === 0) {
      return { success: false, message: 'No hay datos para actualizar' };
    }

    valores.push(idUsuario);
    const query = `
      UPDATE usuarios 
      SET ${campos.join(', ')}, fechaActualizacion = CURRENT_TIMESTAMP
      WHERE idUsuario = $${contador}
      RETURNING idUsuario, nombreUsuario, email, nombreCompleto, telefono
    `;

    const result = await pool.query(query, valores);

    return { success: true, usuario: result.rows[0] };
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return { success: false, message: 'Error al actualizar' };
  }
}

// Eliminar usuario (solo admin)
async function eliminarUsuario(idUsuario, tokenAdmin) {
  try {
    const tokenData = verificarToken(tokenAdmin);
    
    if (!tokenData.valido || tokenData.datos.rol !== 'admin') {
      return { success: false, message: 'No autorizado' };
    }

    await pool.query('DELETE FROM usuarios WHERE idUsuario = $1', [idUsuario]);
    return { success: true, message: 'Usuario eliminado' };
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return { success: false, message: 'Error al eliminar' };
  }
}

module.exports = {
  login,
  verificarToken,
  registrarUsuario,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario
};