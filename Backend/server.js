const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// SERVIR CARPETA PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// CARGAR INDEX AL ENTRAR A LA RAÍZ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const usuariosPath = path.join(__dirname, 'usuarios.json');
const postPath = path.join(__dirname, 'post.json');

/* =========================
   INICIALIZAR ARCHIVOS
========================= */

if (!fs.existsSync(usuariosPath)) {
    fs.writeFileSync(usuariosPath, JSON.stringify([], null, 2));
}

if (!fs.existsSync(postPath)) {
    fs.writeFileSync(postPath, JSON.stringify({
        general: [],
        discusiones: [],
        preguntas: []
    }, null, 2));
}

/* =========================
   FUNCIONES AUXILIARES
========================= */

function leerUsuarios() {
    try {
        return JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
    } catch {
        return [];
    }
}

function guardarUsuarios(data) {
    fs.writeFileSync(usuariosPath, JSON.stringify(data, null, 2));
}

function leerPosts() {
    try {
        return JSON.parse(fs.readFileSync(postPath, 'utf8'));
    } catch {
        return { general: [], discusiones: [], preguntas: [] };
    }
}

function guardarPosts(data) {
    fs.writeFileSync(postPath, JSON.stringify(data, null, 2));
}

function generarID() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

/* =========================
   REGISTRO
========================= */

app.post('/register', (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.json({ error: "Faltan datos" });
    }

    const usuarios = leerUsuarios();

    if (usuarios.find(u => u.usuario === usuario)) {
        return res.json({ error: "El usuario ya existe" });
    }

    usuarios.push({ usuario, password });
    guardarUsuarios(usuarios);

    res.json({ mensaje: "Usuario registrado correctamente" });
});

/* =========================
   LOGIN
========================= */

app.post('/login', (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.json({ error: "Faltan datos" });
    }

    const usuarios = leerUsuarios();

    const user = usuarios.find(
        u => u.usuario === usuario && u.password === password
    );

    if (!user) {
        return res.json({ error: "Usuario o contraseña incorrectos" });
    }

    res.json({ usuario: user.usuario });
});

/* =========================
   OBTENER PUBLICACIONES
========================= */

app.get('/publicaciones', (req, res) => {
    const posts = leerPosts();
    res.json(posts);
});

app.get('/publicaciones/:categoria', (req, res) => {
    const { categoria } = req.params;
    const posts = leerPosts();

    if (!posts[categoria]) {
        return res.json({ error: "Categoría inválida" });
    }

    const ordenadas = [...posts[categoria]].sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    res.json(ordenadas);
});

/* =========================
   CREAR PUBLICACIÓN
========================= */

app.post('/publicaciones', (req, res) => {
    const { usuario, titulo, contenido, categoria } = req.body;

    if (!usuario || !titulo || !contenido || !categoria) {
        return res.json({ error: "Faltan datos" });
    }

    const posts = leerPosts();

    if (!posts[categoria]) {
        return res.json({ error: "Categoría inválida" });
    }

    const nuevaPublicacion = {
        id: generarID(),
        usuario,
        titulo,
        contenido,
        fecha: new Date().toISOString(),
        comentarios: []
    };

    posts[categoria].push(nuevaPublicacion);
    guardarPosts(posts);

    res.json({ mensaje: "Publicación creada correctamente" });
});

/* =========================
   BORRAR PUBLICACIÓN
========================= */

app.delete('/publicaciones/:categoria/:id', (req, res) => {
    const { categoria, id } = req.params;
    const { usuario } = req.body || {};

    if (!usuario) {
        return res.json({ error: "Usuario requerido para borrar" });
    }

    const posts = leerPosts();

    if (!posts[categoria]) {
        return res.json({ error: "Categoría inválida" });
    }

    const publicacion = posts[categoria].find(p => p.id === id);

    if (!publicacion) {
        return res.json({ error: "Publicación no encontrada" });
    }

    if (publicacion.usuario !== usuario) {
        return res.json({ error: "No puedes borrar esta publicación" });
    }

    posts[categoria] = posts[categoria].filter(p => p.id !== id);

    guardarPosts(posts);
    res.json({ mensaje: "Publicación eliminada correctamente" });
});

/* =========================
   COMENTARIOS
========================= */

function agregarComentario(lista, parentId, nuevoComentario) {
    for (let comentario of lista) {
        if (comentario.id === parentId) {
            comentario.respuestas.push(nuevoComentario);
            return true;
        }
        if (agregarComentario(comentario.respuestas, parentId, nuevoComentario)) {
            return true;
        }
    }
    return false;
}

app.post('/comentario', (req, res) => {
    const { categoria, postId, usuario, contenido, parentId } = req.body;

    if (!categoria || !postId || !usuario || !contenido) {
        return res.json({ error: "Faltan datos" });
    }

    const posts = leerPosts();

    if (!posts[categoria]) {
        return res.json({ error: "Categoría inválida" });
    }

    const post = posts[categoria].find(p => p.id === postId);
    if (!post) return res.json({ error: "Post no encontrado" });

    const nuevoComentario = {
        id: generarID(),
        usuario,
        contenido,
        fecha: new Date().toISOString(),
        respuestas: []
    };

    if (!parentId) {
        post.comentarios.push(nuevoComentario);
    } else {
        const agregado = agregarComentario(post.comentarios, parentId, nuevoComentario);
        if (!agregado) {
            return res.json({ error: "Comentario padre no encontrado" });
        }
    }

    guardarPosts(posts);
    res.json({ mensaje: "Comentario agregado correctamente" });
});

function borrarComentario(lista, comentarioId, usuario, dueñoPost) {
    for (let i = 0; i < lista.length; i++) {
        if (lista[i].id === comentarioId) {
            if (lista[i].usuario === usuario || usuario === dueñoPost) {
                lista.splice(i, 1);
                return true;
            }
            return false;
        }

        if (borrarComentario(lista[i].respuestas, comentarioId, usuario, dueñoPost)) {
            return true;
        }
    }
    return false;
}

app.delete('/comentario', (req, res) => {
    const { categoria, postId, comentarioId, usuario } = req.body || {};

    if (!categoria || !postId || !comentarioId || !usuario) {
        return res.json({ error: "Faltan datos para borrar comentario" });
    }

    const posts = leerPosts();

    if (!posts[categoria]) {
        return res.json({ error: "Categoría inválida" });
    }

    const post = posts[categoria].find(p => p.id === postId);
    if (!post) return res.json({ error: "Post no encontrado" });

    const eliminado = borrarComentario(
        post.comentarios,
        comentarioId,
        usuario,
        post.usuario
    );

    if (!eliminado) {
        return res.json({ error: "No puedes borrar este comentario" });
    }

    guardarPosts(posts);
    res.json({ mensaje: "Comentario eliminado correctamente" });
});

/* ========================= */

app.listen(PORT, () => {
    console.log("Foro funcionando en puerto " + PORT);
});