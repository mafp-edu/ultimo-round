# Navegando Sistemas · Último Round

Juego de repaso tipo concurso para *Procesos, Instituciones y Política Comparada*.
El curso se conecta desde sus celulares y vota cada pregunta. Si **más del 50 %**
acierta, el curso avanza; si no, **pierde una vida**. Con **3 vidas** y **40
preguntas**, la meta es completar la escalera sin quedarse sin vidas.

Diseño basado en la identidad visual del sitio del curso (editorial-académico:
marfil, serif, versalitas monoespaciadas, hairlines).

## Mecánicas
- **3 vidas** para el curso. Cada pregunta no superada resta una. Con 0 vidas, fin del juego.
- **3 comodines**, que **activa el docente** desde el proyector (un uso cada uno en toda la partida):
  - **Preguntar a MAF** — tu clon virtual da una *pista* conceptual (no la respuesta).
  - **50 · 50** — elimina dos alternativas incorrectas.
  - **Preguntar a MG** — la asistente entrega la *respuesta directa*.
- **Contador** regresivo por pregunta (30 s configurable).
- **Premio** al completar las 40: set de preguntas de práctica antes del examen.

## Estructura
```
ultimo-round/
├── index.html
├── css/styles.css
└── js/
    ├── firebase-config.js  ← ⚠️ EDITAR con tu config de Firebase
    ├── questions.js        ← 40 preguntas + pistas de MAF (editable)
    └── app.js              ← lógica (vidas, comodines, sincronización)
```

## Paso 1 — Backend en Firebase (gratis, ~10 min)
1. Entra a **https://console.firebase.google.com** y **crea un proyecto**.
2. **Compilación → Realtime Database → Crear base de datos** (modo de prueba).
3. ⚙️ **Configuración del proyecto → Tus apps → ícono Web `</>`**, registra la app
   y copia el objeto `firebaseConfig`.
4. Pega esos valores en **`js/firebase-config.js`** (reemplaza los `PEGA_AQUI_...`).
   `databaseURL` debe terminar en `.firebasedatabase.app`.

## Paso 2 — Subir a GitHub y publicar (GitHub Pages)
**Por la web:** crea un repo público, sube `index.html` + carpetas `css/` y `js/`,
y en **Settings → Pages** elige rama `main` y carpeta `/(root)`. Tu juego queda en
`https://TU-USUARIO.github.io/ultimo-round/`.

**Por terminal:**
```bash
cd ultimo-round
git init && git add . && git commit -m "Navegando Sistemas: Último Round"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/ultimo-round.git
git push -u origin main
```

## Paso 3 — Reglas de la base de datos
En **Realtime Database → Reglas**, pega:
```json
{ "rules": { "salas": { "$sala": { ".read": true, ".write": true } } } }
```
Suficiente para una actividad de clase con código de sala.

## Cómo se juega
1. **Docente** (proyector): abre `…/ultimo-round/?rol=host`, fija el código de sala
   y pulsa **"Abrir sala y proyectar"**.
2. **Estudiantes**: abren la misma dirección **sin** `?rol=host`, escriben su nombre
   y el código, y entran. (Tip: proyecta un QR con esa URL.)
3. Cada pregunta corre con su contador; los votos aparecen en vivo. Al **revelar**,
   se marca la correcta y se aplica el umbral del 50 % (con efecto sobre las vidas).
   Los **comodines** se activan con los botones del panel del docente.

## Editar
- **Preguntas y pistas**: `js/questions.js` (`{ cap, correct, q, options, pista }`,
  `correct` es 0=A…3=D).
- **Tiempo (90 s), umbral (50 %) y vidas (5)**: `js/firebase-config.js`.

## Nota sobre el premio
Se recomienda que el premio sean **preguntas de práctica/repaso**, no el certamen
real, para no comprometer la evaluación. El texto se cambia en `js/app.js`
(busca `Premio desbloqueado`).
