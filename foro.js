// foro.js
// Versión estable con sesión persistente

let usuarioActual = null;

/* =========================
   RECUPERAR SESIÓN
========================= */
const usuarioGuardado = localStorage.getItem('usuario');

if (usuarioGuardado) {
    usuarioActual = usuarioGuardado;

    window.addEventListener('DOMContentLoaded', () => {
        const auth = document.getElementById('auth-section');
        const pub = document.getElementById('pub-section');

        if (auth && pub) {
            auth.style.display = 'none';
            pub.style.display = 'block';
            cargarPublicaciones();
        }
    });
}

/* =========================
   REGISTRO
========================= */
async function registrar() {
    const usuarioInput = document.getElementById('reg-usuario');
    const contraseñaInput = document.getElementById('reg-contraseña');
    const mensaje = document.getElementById('mensaje-registro');

    const usuario = usuarioInput.value.trim();
    const contraseña = contraseñaInput.value.trim();

    mensaje.textContent = '';
    mensaje.className = 'mensaje';

    if (!usuario || !contraseña) {
        mensaje.textContent = 'Completa todos los campos';
        mensaje.classList.add('error');
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contraseña })
        });

        const data = await res.json();

        if (data.success) {
            mensaje.textContent = data.message || 'Usuario registrado correctamente';
            mensaje.classList.add('exito');

            usuarioInput.value = '';
            contraseñaInput.value = '';
        } else {
            mensaje.textContent = data.message || 'El usuario ya existe';
            mensaje.classList.add('error');
        }

    } catch (err) {
        mensaje.textContent = 'Error del servidor';
        mensaje.classList.add('error');
    }
}

/* =========================
   LOGIN
========================= */
async function login() {
    const usuarioInput = document.getElementById('login-usuario');
    const contraseñaInput = document.getElementById('login-contraseña');
    const mensaje = document.getElementById('mensaje-login');

    const usuario = usuarioInput.value.trim();
    const contraseña = contraseñaInput.value.trim();

    mensaje.textContent = '';
    mensaje.className = 'mensaje';

    if (!usuario || !contraseña) {
        mensaje.textContent = 'Completa todos los campos';
        mensaje.classList.add('error');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contraseña })
        });

        const data = await res.json();

        if (data.success) {
            usuarioActual = data.usuario;

            // Guardar sesión
            localStorage.setItem('usuario', usuarioActual);

            mensaje.textContent = 'Bienvenido ' + usuarioActual;
            mensaje.classList.add('exito');

            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('pub-section').style.display = 'block';

            cargarPublicaciones();
        } else {
            mensaje.textContent = data.message || 'Usuario o contraseña incorrectos';
            mensaje.classList.add('error');
        }

    } catch (err) {
        mensaje.textContent = 'Error del servidor';
        mensaje.classList.add('error');
    }
}

/* =========================
   CARGAR PUBLICACIONES
========================= */
async function cargarPublicaciones() {
    try {
        const res = await fetch('/api/publicaciones');
        const publicaciones = await res.json();

        const container = document.getElementById('publicaciones');
        container.innerHTML = '';

        if (!Array.isArray(publicaciones)) return;

        publicaciones.forEach(pub => {
            const div = document.createElement('div');
            div.className = 'timeline-item';

            div.innerHTML = `
                <div class="content">
                    <h4>${pub.titulo}</h4>
                    <p>${pub.contenido}</p>
                    <small>Autor: ${pub.usuario || 'Anónimo'}</small>
                </div>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        console.error('Error cargando publicaciones');
    }
}

/* =========================
   CREAR PUBLICACIÓN
========================= */
async function crearPublicacion() {
    const tituloInput = document.getElementById('pub-titulo');
    const contenidoInput = document.getElementById('pub-contenido');
    const mensaje = document.getElementById('mensaje-publicacion');

    const titulo = tituloInput.value.trim();
    const contenido = contenidoInput.value.trim();

    mensaje.textContent = '';
    mensaje.className = 'mensaje';

    if (!titulo || !contenido) {
        mensaje.textContent = 'Completa todos los campos';
        mensaje.classList.add('error');
        return;
    }

    if (!usuarioActual) {
        mensaje.textContent = 'Debes iniciar sesión';
        mensaje.classList.add('error');
        return;
    }

    try {
        const res = await fetch('/api/publicaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo,
                contenido,
                usuario: usuarioActual
            })
        });

        const data = await res.json();

        if (data.success) {
            mensaje.textContent = 'Publicación creada correctamente';
            mensaje.classList.add('exito');

            tituloInput.value = '';
            contenidoInput.value = '';

            cargarPublicaciones();
        } else {
            mensaje.textContent = data.message || 'Error al crear publicación';
            mensaje.classList.add('error');
        }

    } catch (err) {
        mensaje.textContent = 'Error del servidor';
        mensaje.classList.add('error');
    }
}

/* =========================
   LOGOUT
========================= */
function logout() {
    usuarioActual = null;

    // Borrar sesión guardada
    localStorage.removeItem('usuario');

    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('pub-section').style.display = 'none';

    document.getElementById('mensaje-login').textContent = '';
    document.getElementById('publicaciones').innerHTML = '';
}