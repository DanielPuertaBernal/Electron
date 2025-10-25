# Electron
Repositorio que contiene la lógica de una práctica con el framework de Electron.

## Estructura de la base de datos

A continuación se describe la estructura básica de la base de datos usada en la práctica. Incluye las tablas principales, índices, una función y trigger para actualizar la fecha de modificación, y datos iniciales de ejemplo.

### Tablas

- roles: almacena los roles del sistema (por ejemplo `admin`, `user`).
  - idRol: clave primaria (SERIAL)
  - nombreRol: nombre del rol (VARCHAR(20), único, no nulo)
  - descripcion: texto descriptivo
  - fechaCreacion: timestamp con valor por defecto

- usuarios: almacena los usuarios del sistema.
  - idUsuario: clave primaria (SERIAL)
  - nombreUsuario: nombre de usuario (VARCHAR(50), único, no nulo)
  - email: correo electrónico (VARCHAR(100), único, no nulo)
  - contrasena: hash de la contraseña (VARCHAR(255), no nulo)
  - nombreCompleto: nombre completo del usuario
  - idRol: FK a `roles(idRol)`
  - telefono: opcional
  - activo: booleano indicando si el usuario está activo (por defecto true)
  - fechaCreacion: timestamp con valor por defecto
  - fechaActualizacion: timestamp actualizado automáticamente mediante trigger

### Índices y constraints

- Índices para búsquedas frecuentes: `nombreUsuario`, `email` e `idRol`.
- Validaciones: longitud mínima para `nombreUsuario` (>= 3) y validación de formato de `email` mediante expresión regular.

### Función y trigger

Se utiliza una función PL/pgSQL que actualiza `fechaActualizacion` antes de cada UPDATE en la tabla `usuarios`.

### Datos iniciales

Se insertan roles básicos (`admin`, `user`) y dos usuarios de ejemplo (uno administrador y un usuario de prueba). Las contraseñas en el ejemplo están almacenadas ya como hashes (BCrypt en los ejemplos proporcionados).

### SQL de referencia

El SQL siguiente refleja la estructura descrita (puedes copiarlo y ejecutarlo en PostgreSQL para crear la estructura de ejemplo):

```sql
-- ================================================
-- TABLA: roles
-- ================================================
CREATE TABLE roles (
	idRol SERIAL PRIMARY KEY,
	nombreRol VARCHAR(20) UNIQUE NOT NULL,
	descripcion VARCHAR(100),
	fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- TABLA: usuarios
-- ================================================
CREATE TABLE usuarios (
	idUsuario SERIAL PRIMARY KEY,
	nombreUsuario VARCHAR(50) UNIQUE NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	contrasena VARCHAR(255) NOT NULL,
	nombreCompleto VARCHAR(100) NOT NULL,
	idRol INTEGER NOT NULL REFERENCES roles(idRol),
	telefono VARCHAR(20),
	activo BOOLEAN DEFAULT true,
	fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
	CONSTRAINT chk_nombreUsuario_largo CHECK (char_length(nombreUsuario) >= 3),
	CONSTRAINT chk_email_formato CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ================================================
-- ÍNDICES
-- ================================================
CREATE INDEX idx_usuarios_nombreUsuario ON usuarios(nombreUsuario);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_idRol ON usuarios(idRol);

-- ================================================
-- FUNCIÓN: Actualizar fechaActualizacion automáticamente
-- ================================================
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
	NEW.fechaActualizacion = CURRENT_TIMESTAMP;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGER: Actualizar fechaActualizacion
-- ================================================
CREATE TRIGGER trg_actualizar_fecha_usuarios
	BEFORE UPDATE ON usuarios
	FOR EACH ROW
	EXECUTE FUNCTION actualizar_fecha_modificacion();

-- ================================================
-- DATOS INICIALES
-- ================================================

-- Insertar Roles
INSERT INTO roles (nombreRol, descripcion) VALUES 
('admin', 'Administrador del sistema'),
('user', 'Usuario regular');

-- Insertar Usuario Admin (contraseña: Admin123!)
INSERT INTO usuarios (nombreUsuario, email, contrasena, nombreCompleto, idRol) 
VALUES (
	'admin',
	'admin@sistema.com',
	'$2b$10$rQJ5cPvKzBGKJ5xV5h5J5eYvZnKJ5xV5h5J5eYvZnKJ5xV5h5J5eu',
	'Administrador',
	1
);

-- Insertar Usuario de Prueba (contraseña: User123!)
INSERT INTO usuarios (nombreUsuario, email, contrasena, nombreCompleto, idRol) 
VALUES (
	'usuario1',
	'usuario@test.com',
	'$2b$10$mNKzJ5xV5h5J5eYvZnKJ5xV5h5J5eYvZnKJ5xV5h5J5eYvZnKJ5xu',
	'Usuario de Prueba',
	2
);

-- ================================================
-- VERIFICACIÓN
-- ================================================
SELECT 'Base de datos creada exitosamente' as mensaje;

-- Ver todos los usuarios
SELECT 
	u.idUsuario,
	u.nombreUsuario,
	u.email,
	u.nombreCompleto,
	r.nombreRol,
	u.activo,
	u.fechaCreacion
FROM usuarios u
INNER JOIN roles r ON u.idRol = r.idRol;
```

### Notas y recomendaciones

- Cambia los hashes de contraseña por valores reales con bcrypt al crear usuarios reales.
- Adapta tamaños de campos o índices según las necesidades de la aplicación.
- Si usas migraciones (Flyway, Liquibase o similares), coloca estas definiciones en scripts de migración en vez de ejecutar manualmente el SQL.

Si quieres, puedo:
- Extraer este SQL a un archivo `sql/schema.sql` en el repositorio.
- Crear una pequeña guía para ejecutar estas migraciones localmente con Docker/Postgres.

## Archivo `.env` requerido

La aplicación espera encontrar un archivo `.env` en la raíz del proyecto con las credenciales y configuraciones mínimas para conectarse a la base de datos y manejar tokens JWT/seguridad. Crea un archivo `.env` (no lo subas a control de versiones) con las siguientes variables:

```env
# Configuración Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistemaAuth
DB_USER=postgres
DB_PASSWORD=tu_password

# Configuración JWT
JWT_SECRET=mi_clave_secreta_super_segura_2024
JWT_EXPIRATION=24h

# Configuración Seguridad
BCRYPT_ROUNDS=10
```

Si prefieres, también puedes copiar el archivo ` .env.example` provisto en la raíz del proyecto y renombrarlo a `.env`, luego editar los valores confidenciales.


