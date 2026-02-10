// 1. CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');

let vertices = []; // { x, y, id, color, label }
let edges = [];    // { from, to, directed (bool) }
let selectedVertex = null;
let isDragging = false;

// 2. FUNCIONES DE DIBUJO
function drawEdges() {
    edges.forEach(edge => {
        const v1 = vertices.find(v => v.id === edge.from);
        const v2 = vertices.find(v => v.id === edge.to);
        if (!v1 || !v2) return;

        ctx.lineWidth = 3;

        // LÓGICA DE COLOR TOGGLE
        const color1 = showColors ? v1.color : "#000000";
        const color2 = showColors ? v2.color : "#000000";

        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const dist = Math.hypot(dx, dy);

        if (edge.directed) {
            ctx.beginPath();
            ctx.strokeStyle = color1;
            ctx.setLineDash([]);
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
            // (Opcional) dibujar punta de flecha
        } else {
            // Dibujar segmentos alternos con color1/color2 para efecto escalonado
            const segmentLen = 16; // longitud visible de cada segmento
            const gap = 8; // espacio entre segmentos
            const step = segmentLen + gap;
            const count = Math.ceil(dist / step);

            for (let i = 0; i < count; i++) {
                const startDist = i * step;
                const endDist = Math.min(startDist + segmentLen, dist);
                if (endDist <= startDist) continue;

                const t1 = startDist / dist;
                const t2 = endDist / dist;
                const sx = v1.x + dx * t1;
                const sy = v1.y + dy * t1;
                const ex = v1.x + dx * t2;
                const ey = v1.y + dy * t2;

                ctx.beginPath();
                ctx.strokeStyle = (i % 2 === 0) ? color1 : color2;
                ctx.setLineDash([]);
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }
        // Si esta arista está seleccionada para eliminación, dibujar un overlay resaltado
        if (selectedEdges.includes(edge)) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,0,0,0.6)';
            ctx.lineWidth = 6;
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
            ctx.lineWidth = 3; // restaurar grosor
        }
    });
}

function updateCanvas() {
    // Limpiar el lienzo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar primero las aristas para que queden debajo
    drawEdges();
    
    // Dibujar los vértices
    vertices.forEach(v => {

        // Resaltado del paso actual del DFS
        if (currentVisitedId === v.id) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, 28, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 215, 0, 0.95)"; // dorado
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.lineWidth = 2;
        }

        // Resaltado del vértice de inicio (si existe)
        if (startVertex === v.id) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, 32, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(30, 144, 255, 0.9)"; // azul
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.lineWidth = 2;
        }

        if (selectedForConnection.includes(v.id)) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, 25, 0, Math.PI * 2); // Un círculo un poco más grande
            ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; // Verde brillante semitransparente
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.lineWidth = 2;
        }

        ctx.beginPath();
        ctx.arc(v.x, v.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = showColors ? v.color : "#ccc"; // Usar color o blanco y negro según showColors
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Etiqueta del vértice
        ctx.fillStyle = showColors ? "white" : "black";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(v.label, v.x, v.y);
    });
}

// 3. LÓGICA DE INTERACCIÓN (Botones y Mouse)
function addVertex() {
    const id = getNextId();
    if (!id) return alert("No quedan letras disponibles para nuevos vértices (A-Z)");
    const nuevo = {
        x: Math.random() * (canvas.width - 60) + 30,
        y: Math.random() * (canvas.height - 60) + 30,
        id: id,
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        label: id
    };
    vertices.push(nuevo);
    updateCanvas();
}

// Eventos de arrastre
let selectedForConnection = []; // Vértices marcados para conectar/seleccionar
let isSelectionMode = false;    // ¿Está activado el botón de selección?
let selectedEdges = []; // Aristas seleccionadas por selección (almacena referencias a objetos de `edges`)
let startVertex = null; // vértice elegido como inicio para algoritmos
let connectConsecutive = false; // false = completo (default), true = consecutivo/chain

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedForConnection = []; // Limpiamos selección al cambiar de modo
    document.getElementById('btnSelect').innerText = isSelectionMode ? "Cancelar Selección" : "Seleccionar";
    updateCanvas();
}

// Modificamos el evento mousedown que ya teníamos
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedVertex = vertices.find(v => Math.hypot(v.x - mouseX, v.y - mouseY) < 20);

    if (clickedVertex) {
        if (isSelectionMode) {
            // Si ya estaba seleccionado, lo quitamos (toggle). Si no, lo añadimos.
            const index = selectedForConnection.indexOf(clickedVertex.id);
            if (index > -1) {
                selectedForConnection.splice(index, 1);
            } else {
                selectedForConnection.push(clickedVertex.id);
            }
        } else {
            // Modo arrastre normal
            selectedVertex = clickedVertex;
            isDragging = true;
        }
        updateCanvas();
        return;
    }

    // Si no clickeó un vértice y estamos en modo selección, permitir seleccionar aristas
    if (isSelectionMode) {
        // Buscar arista cercana al clic
        const threshold = 6; // px
        let found = null;
        for (const edge of edges) {
            const v1 = vertices.find(v => v.id === edge.from);
            const v2 = vertices.find(v => v.id === edge.to);
            if (!v1 || !v2) continue;
            const d = pointToSegmentDistance(mouseX, mouseY, v1.x, v1.y, v2.x, v2.y);
            if (d <= threshold) { found = edge; break; }
        }

        if (found) {
            const idx = selectedEdges.indexOf(found);
            if (idx > -1) selectedEdges.splice(idx, 1);
            else selectedEdges.push(found);
            updateCanvas();
            return;
        }
    }
});

// Función para el botón del "Check" (Confirmar conexión)
function confirmConnection() {
    if (selectedForConnection.length < 2) {
        alert("Selecciona al menos 2 vértices para conectar");
        return;
    }
    if (connectConsecutive) {
        // Conectar en cadena: ab, bc, cd...
        for (let i = 0; i < selectedForConnection.length - 1; i++) {
            const v1 = selectedForConnection[i];
            const v2 = selectedForConnection[i+1];
            const exists = edges.find(e => (e.from === v1 && e.to === v2) || (e.from === v2 && e.to === v1));
            if (!exists) edges.push({ from: v1, to: v2, directed: false });
        }
    } else {
        // Conecta todos los seleccionados entre sí (Grafo completo entre ellos)
        for (let i = 0; i < selectedForConnection.length; i++) {
            for (let j = i + 1; j < selectedForConnection.length; j++) {
                const v1 = selectedForConnection[i];
                const v2 = selectedForConnection[j];
                const exists = edges.find(e => (e.from === v1 && e.to === v2) || (e.from === v2 && e.to === v1));
                if (!exists) edges.push({ from: v1, to: v2, directed: false });
            }
        }
    }

    // Limpiar y salir del modo selección
    selectedForConnection = [];
    isSelectionMode = false;
    document.getElementById('btnSelect').innerText = "Seleccionar";
    updateCanvas();
}

function toggleConnectionMode() {
    // Alterna el modo de conexión y actualiza tanto botones como checkboxes si existen
    connectConsecutive = !connectConsecutive;
    const el = document.getElementById('btnConnMode');
    if (el) {
        if (el.tagName === 'INPUT' && el.type === 'checkbox') {
            el.checked = connectConsecutive;
        } else {
            el.innerText = connectConsecutive ? 'Modo: Consecutivo' : 'Modo: Completo';
        }
    }
}

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && selectedVertex) {
        const rect = canvas.getBoundingClientRect();
        selectedVertex.x = e.clientX - rect.left;
        selectedVertex.y = e.clientY - rect.top;
        updateCanvas();
    }
});

// Calcula la distancia mínima del punto (px,py) al segmento (x1,y1)-(x2,y2)
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.hypot(dx, dy);
}

window.addEventListener('mouseup', () => {
    isDragging = false;
    selectedVertex = null;
});

// 4. LÓGICA DEL ALGORITMO (DFS)
function runAlgorithm() {
    if (vertices.length === 0) return alert("Crea vértices primero");

    // Construir lista de adyacencia
    const adj = buildAdjacency(edges, vertices);

    // Elegir vértice inicial: prioridad a `startVertex`, luego selección, luego primer vértice creado
    const start = startVertex || (selectedForConnection.length > 0 ? selectedForConnection[0] : vertices[0].id);

    // Ejecutar DFS (cubre componente conectado y luego nodos no visitados)
    const result = dfsFull(adj, start);
    const order = result.order;
    const trace = result.trace;

    if (!order || order.length === 0) return alert('No hay recorrido (verifica conexiones)');

    console.log('Orden de recorrido DFS:', order);
    lastOrder = order.slice();
    animateTraversal(trace);
}

// Construye la lista de adyacencia a partir de edges. Respeta directed flag.
function buildAdjacency(edgesList, verts) {
    const map = {};
    verts.forEach(v => map[v.id] = []);
    edgesList.forEach(e => {
        if (!map[e.from] || !map[e.to]) return;
        map[e.from].push(e.to);
        if (!e.directed) map[e.to].push(e.from);
    });
    // Opcional: ordenar vecinos por id para determinismo
    Object.keys(map).forEach(k => map[k].sort());
    return map;
}

// DFS desde 'start' y luego cubrir componentes no visitadas
function dfsFull(adj, startId) {
    const visited = new Set();
    const order = [];
    const trace = [];

    function dfs(u, parent) {
        trace.push({ type: 'visit', node: u });
        visited.add(u);
        order.push(u);
        const neigh = adj[u] || [];
        for (const v of neigh) {
            if (!visited.has(v)) {
                dfs(v, u);
                // Al volver del hijo v, indicamos backtrack hacia u
                trace.push({ type: 'backtrack', from: v, to: u });
            }
        }
    }

    if (startId && adj[startId]) dfs(startId, null);

    // cubrir nodos desconectados — cuando saltamos a otro componente, emitimos 'jump'
    Object.keys(adj).forEach(id => {
        if (!visited.has(id)) {
            trace.push({ type: 'jump', to: id });
            dfs(id, null);
        }
    });

    return { order, trace };
}

// Animación simple: resalta vértices en orden con pausa entre ellos
let traversalTimer = null;
let currentVisitedId = null;
let lastOrder = null; // guarda último orden DFS para repetir animación
let lastTrace = null; // guarda la traza detallada (visit/backtrack/jump)
function animateTraversal(order) {
    // limpiar cualquier animación previa
    if (traversalTimer) { clearInterval(traversalTimer); traversalTimer = null; }

    // backward-compat: si se recibe un array simple de ids, convertir a traza de visitas
    if (Array.isArray(order) && order.length && typeof order[0] === 'string') {
        const simple = order.slice();
        const trace = simple.map(n => ({ type: 'visit', node: n }));
        return animateTraversal(trace);
    }

    const trace = Array.isArray(order) ? order.slice() : [];
    let i = 0;
    currentVisitedId = null;
    lastTrace = trace.slice();

    // Mostrar secuencia final (solo visitas) en el panel
    const finalOrder = trace.filter(s => s.type === 'visit').map(s => s.node);
    if (finalOrder.length) showSequence(finalOrder);

    // limpiar log de pasos
    const logEl = document.getElementById('dfsLog');
    if (logEl) logEl.innerText = '';

    traversalTimer = setInterval(() => {
        if (i >= trace.length) {
            clearInterval(traversalTimer);
            traversalTimer = null;
            currentVisitedId = null;
            updateCanvas();
            return;
        }

        const step = trace[i];
        if (step.type === 'visit') {
            currentVisitedId = step.node;
            appendLog(`Visita: ${step.node}`);
        } else if (step.type === 'backtrack') {
            currentVisitedId = step.to || step.from;
            appendLog(`Backtrack: de ${step.from} a ${step.to}`);
        } else if (step.type === 'jump') {
            currentVisitedId = step.to;
            appendLog(`Sin vecinos restantes en este componente; saltando a ${step.to}`);
        } else {
            appendLog(JSON.stringify(step));
        }

        updateCanvas();
        i++;
    }, 600);
}

function appendLog(text) {
    const el = document.getElementById('dfsLog');
    if (!el) return;
    el.innerText += text + '\n';
    el.scrollTop = el.scrollHeight;
}


let showColors = true; // Controla si usamos colores o blanco y negro

// Función para el botón "Toggle Color"
function toggleColorStyle() {
    showColors = !showColors;
    updateCanvas();
}
// Eliminar elementos seleccionados (aristas y/o vértices) — comportamiento "inteligente"
function deleteSelected() {
    if (selectedEdges.length === 0 && selectedForConnection.length === 0) {
        alert('Selecciona aristas o vértices primero (usa Seleccionar)');
        return;
    }

    // Eliminar aristas explícitamente seleccionadas
    if (selectedEdges.length > 0) {
        edges = edges.filter(edge => !selectedEdges.includes(edge));
        selectedEdges = [];
    }

    // Eliminar vértices seleccionados y cualquier arista que aún conecte a esos vértices
    if (selectedForConnection.length > 0) {
        const toRemove = new Set(selectedForConnection);
        vertices = vertices.filter(v => !toRemove.has(v.id));
        edges = edges.filter(edge => !(toRemove.has(edge.from) || toRemove.has(edge.to)));
        // Si borramos el vértice de inicio, quitarlo
        if (startVertex && toRemove.has(startVertex)) startVertex = null;
        selectedForConnection = [];
    }

    updateCanvas();
}

// Establece el vértice de inicio para algoritmos desde la selección
function setStartFromSelection() {
    if (selectedForConnection.length === 0) {
        alert('Selecciona un vértice para establecer como inicio');
        return;
    }
    startVertex = selectedForConnection[0];
    // mantener la selección pero salir de modo selección
    isSelectionMode = false;
    document.getElementById('btnSelect').innerText = 'Seleccionar';
    updateCanvas();
}

// Devuelve la siguiente letra libre (A..Z) o null si no hay
function getNextId() {
    const used = new Set(vertices.map(v => v.id));
    for (let code = 65; code <= 90; code++) {
        const c = String.fromCharCode(code);
        if (!used.has(c)) return c;
    }
    return null;
}

function showSequence(order) {
    const el = document.getElementById('dfsSequence');
    if (!el) return;
    el.innerText = order && order.length ? order.join(' -> ') : '(Aquí aparecerá la secuencia)';
}

function repeatAnimation() {
    if ((!lastTrace || lastTrace.length === 0) && (!lastOrder || lastOrder.length === 0)) return alert('No hay animación para repetir');
    if (lastTrace && lastTrace.length) animateTraversal(lastTrace.slice());
    else animateTraversal(lastOrder.slice());
}

function clearAll() {
    // detener animación si existe
    if (traversalTimer) { clearInterval(traversalTimer); traversalTimer = null; }
    // resetear estructuras
    vertices = [];
    edges = [];
    selectedForConnection = [];
    selectedEdges = [];
    startVertex = null;
    lastOrder = null;
    lastTrace = null;
    currentVisitedId = null;
    // limpiar panel
    const el = document.getElementById('dfsSequence');
    if (el) el.innerText = '(Aquí aparecerá la secuencia)';
    const logEl = document.getElementById('dfsLog');
    if (logEl) logEl.innerText = '(Aquí aparecerá el detalle del recorrido)';
    updateCanvas();
}

// Abrir modal de configuración
function openConfigModal() {
    const m = document.getElementById('configModal');
    if (!m) return;
    // sincronizar estados actuales con checkboxes
    const cbConn = document.getElementById('btnConnMode');
    if (cbConn && cbConn.tagName === 'INPUT') cbConn.checked = connectConsecutive;
    const cbColor = document.getElementById('toggleColorCheckbox');
    if (cbColor && cbColor.tagName === 'INPUT') cbColor.checked = !!showColors;
    m.style.display = 'block';
}

// Cerrar modal de configuración
function closeConfigModal() {
    const m = document.getElementById('configModal');
    if (!m) return;
    m.style.display = 'none';
}

// Cerrar modal al pulsar fuera del contenido
window.addEventListener('click', (e) => {
    const m = document.getElementById('configModal');
    if (!m) return;
    if (e.target === m) closeConfigModal();
});