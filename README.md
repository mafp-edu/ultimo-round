# Navegando Sistemas · Último Round

Juego de repaso tipo concurso para *Procesos, Instituciones y Política Comparada*.
El curso se conecta desde sus celulares y vota cada pregunta. Si **más del 50 %**
acierta, el curso avanza; si no, **pierde una vida**. Con **3 vidas** y **40
preguntas**, la meta es completar la escalera sin quedarse sin vidas.

Diseño basado en la identidad visual del sitio del curso (editorial-académico:
marfil, serif, versalitas monoespaciadas, hairlines).

## Mecánicas

* **3 vidas** para el curso. Cada pregunta no superada resta una. Con 0 vidas, fin del juego.
* **3 comodines**, que **activa el docente** desde el proyector (un uso cada uno en toda la partida):

  * **Preguntar a MAF** — tu clon virtual da una *pista* conceptual (no la respuesta).
  * **50 · 50** — elimina dos alternativas incorrectas.
  * **Preguntar a MG** — la asistente entrega la *respuesta directa*.
* **Contador** regresivo por pregunta (30 s configurable).
* **Premio** al completar las 40: set de preguntas de práctica antes del examen.

## Estructura

```
ultimo-round/
├── index.html
├── css/styles.css
└── js/
```

## Cómo se juega

1. **Docente** (proyector): abre `…/ultimo-round/?rol=host`, fija el código de sala
y pulsa **"Abrir sala y proyectar"**.
2. **Estudiantes**: abren la misma dirección **sin** `?rol=host`, escriben su nombre
y el código, y entran. (Tip: proyecta un QR con esa URL.)
3. Cada pregunta corre con su contador; los votos aparecen en vivo. Al **revelar**,
se marca la correcta y se aplica el umbral del 50 % (con efecto sobre las vidas).
Los **comodines** se activan con los botones del panel del docente.

## Editar

* **Preguntas y pistas**: `js/questions.js` (`{ cap, correct, q, options, pista }`,
`correct` es 0=A…3=D).
* **Tiempo (90 s), umbral (50 %) y vidas (5)**: `js/firebase-config.js`.

