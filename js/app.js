// ===========================================================================
//  NAVEGANDO SISTEMAS: ÚLTIMO ROUND — Lógica del juego
//  Firebase Realtime Database · sin frameworks · GitHub Pages
//  - 5 vidas para el curso (0 = fin)
//  - 3 comodines que activa el docente: MAF (pista), 50-50, MG (respuesta)
//  - Timer 90 s con pausa/reanudar (solo docente); al llegar a 0 cierra y revela
//  - Marcador individual: puntaje por estudiante, top 3 al final
// ===========================================================================
(function () {
  "use strict";

  let db = null, fbOk = false;
  try { firebase.initializeApp(window.FIREBASE_CONFIG); db = firebase.database(); fbOk = true; }
  catch (e) { console.error("Firebase no inicializó:", e); }

  const Q = window.PREGUNTAS;
  const TOTAL = Q.length;
  const TIEMPO = window.TIEMPO_PREGUNTA || 90;
  const UMBRAL = window.UMBRAL || 0.5;
  const VIDAS0 = window.VIDAS_INICIO || 5;

  const $ = (s) => document.querySelector(s);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const params = new URLSearchParams(location.search);
  const ROLE = params.get("rol") === "host" ? "host" : "play";
  const LETRAS = ["A", "B", "C", "D"];
  const salaRef = (c) => db.ref("salas/" + c);

  function configFaltante() { return !fbOk || String(window.FIREBASE_CONFIG.apiKey).startsWith("PEGA_AQUI"); }
  function bannerConfig() {
    const b = el("div", "banner-config");
    b.innerHTML = "Falta configurar Firebase. Abre <code>js/firebase-config.js</code> y pega los datos de tu proyecto. Guía en el <code>README</code>.";
    document.body.prepend(b);
  }
  function topbar() {
    const t = el("div", "topbar");
    const l = el("div", "left"); l.textContent = "NAVEGANDO SISTEMAS · ÚLTIMO ROUND";
    const r = el("div", "right"); r.textContent = "CURSO 2026 · POLÍTICA COMPARADA";
    t.appendChild(l); t.appendChild(r); return t;
  }
  function corazones(n, cont) {
    cont.innerHTML = "";
    for (let i = 0; i < VIDAS0; i++) cont.appendChild(el("span", "heart" + (i < n ? "" : " gone"), "\u2665"));
  }

  // =========================================================================
  //  VISTA DOCENTE (host)
  // =========================================================================
  function initHost() {
    document.body.prepend(topbar());
    const root = $("#app");
    let sala = window.SALA_DEFECTO, idx = 0, vidas = VIDAS0;
    let timer = null, restante = TIEMPO, pausado = false;

    function setup() {
      root.innerHTML = "";
      const s = el("section", "cover");
      s.appendChild(el("p", "eyebrow", "Panel del docente"));
      const h = el("h1", "display"); h.innerHTML = "Último <em class='round-word'>Round</em>"; s.appendChild(h);
      s.appendChild(el("p", "subtitle", "Cuarenta preguntas · cinco vidas · tres comodines"));
      const f = el("div", "field");
      f.appendChild(el("label", null, "Código de sala"));
      const inp = el("input", "input"); inp.value = sala; inp.maxLength = 12;
      f.appendChild(inp); s.appendChild(f);
      const b = el("button", "btn btn-primary", "Abrir sala y proyectar"); s.appendChild(b);
      s.appendChild(el("p", "hint", "Los estudiantes entran a la misma dirección, sin “?rol=host”."));
      root.appendChild(s);
      b.onclick = () => {
        sala = (inp.value || window.SALA_DEFECTO).toUpperCase().replace(/[^A-Z0-9]/g, "");
        salaRef(sala).set({ estado: "lobby", idx: 0, total: TOTAL, revelar: false, vidas: VIDAS0,
          comodines: { maf: false, ff: false, mg: false }, ff5050: null, oraculo: null, pausado: false,
          ts: firebase.database.ServerValue.TIMESTAMP });
        salaRef(sala).child("jugadores").remove();
        salaRef(sala).child("respuestas").remove();
        salaRef(sala).child("puntajes").remove();
        juego();
      };
    }

    function juego() {
      root.innerHTML = "";
      const stage = el("section", "stage");

      const meta = el("div", "stage-meta");
      const mL = el("div"); mL.innerHTML = "SALA <strong>" + sala + "</strong>";
      const mR = el("div", null, "ÚLTIMO ROUND");
      meta.appendChild(mL); meta.appendChild(mR); stage.appendChild(meta);

      const status = el("div", "status-row");
      const vidasWrap = el("div", "vidas");
      vidasWrap.appendChild(el("span", "vidas-label", "Vidas"));
      const hearts = el("div", "vidas-hearts"); vidasWrap.appendChild(hearts);
      const jug = el("div", "jugcount", "0 conectados");
      status.appendChild(vidasWrap); status.appendChild(jug); stage.appendChild(status);

      const escalera = el("div", "escalera"); stage.appendChild(escalera);
      const kicker = el("div", "q-kicker"); stage.appendChild(kicker);
      const qText = el("h2", "q-text"); stage.appendChild(qText);

      const clock = el("div", "clock");
      const clockNum = el("div", "clock-num", TIEMPO + "");
      const clockBar = el("div", "clock-bar"); const clockFill = el("div", "clock-fill"); clockBar.appendChild(clockFill);
      const btnPausa = el("button", "btn-pausa", "Pausar");
      clock.appendChild(clockNum); clock.appendChild(clockBar); clock.appendChild(btnPausa);
      stage.appendChild(clock);

      const opts = el("div", "opts"); stage.appendChild(opts);

      const oraculo = el("div", "oraculo"); oraculo.style.display = "none";
      const oWho = el("div", "who"); const oWhat = el("div", "what");
      oraculo.appendChild(oWho); oraculo.appendChild(oWhat); stage.appendChild(oraculo);

      const comod = el("div", "comodines");
      const cMaf = el("button", "comodin", "Preguntar a MAF");
      const cFf  = el("button", "comodin", "50 · 50");
      const cMg  = el("button", "comodin", "Preguntar a MG");
      comod.appendChild(cMaf); comod.appendChild(cFf); comod.appendChild(cMg); stage.appendChild(comod);

      const ctrl = el("div", "ctrl");
      const btnRevelar = el("button", "btn", "Revelar y contar");
      const btnNext = el("button", "btn btn-primary", "Siguiente"); btnNext.style.display = "none";
      ctrl.appendChild(btnRevelar); ctrl.appendChild(btnNext); stage.appendChild(ctrl);
      const veredicto = el("div", "veredicto"); stage.appendChild(veredicto);

      root.appendChild(stage);
      corazones(vidas, hearts);

      salaRef(sala).child("jugadores").on("value", (s) => {
        const n = s.numChildren(); jug.textContent = n + (n === 1 ? " conectado" : " conectados");
      });

      function pintarEscalera() {
        escalera.innerHTML = "";
        for (let i = 0; i < TOTAL; i++)
          escalera.appendChild(el("span", "paso" + (i === idx ? " activo" : (i < idx ? " hecho" : ""))));
      }

      let votosRef = null, optEls = [], cerrada = false;

      function detenerTimer() { clearInterval(timer); timer = null; }
      function correrTimer() {
        detenerTimer();
        timer = setInterval(() => {
          if (pausado) return;
          restante--; clockNum.textContent = Math.max(restante, 0);
          clockFill.style.width = Math.max(restante / TIEMPO * 100, 0) + "%";
          if (restante <= 10) clock.classList.add("low"); else clock.classList.remove("low");
          if (restante <= 0) { detenerTimer(); revelar(); }
        }, 1000);
      }

      btnPausa.onclick = () => {
        pausado = !pausado;
        btnPausa.textContent = pausado ? "Reanudar" : "Pausar";
        btnPausa.classList.toggle("activa", pausado);
        clock.classList.toggle("pausado", pausado);
        salaRef(sala).update({ pausado: pausado });
      };

      function cargar() {
        cerrada = false; pausado = false;
        btnPausa.textContent = "Pausar"; btnPausa.classList.remove("activa"); btnPausa.disabled = false;
        clock.classList.remove("pausado");
        const p = Q[idx];
        kicker.textContent = "Pregunta " + (idx + 1) + " de " + TOTAL + "  ·  Capítulo " + p.cap;
        qText.textContent = p.q;
        veredicto.textContent = ""; veredicto.className = "veredicto";
        oraculo.style.display = "none";
        btnRevelar.style.display = ""; btnNext.style.display = "none";
        pintarEscalera(); corazones(vidas, hearts);

        opts.innerHTML = "";
        optEls = p.options.map((txt, i) => {
          const o = el("div", "opt");
          const head = el("div", "opt-head");
          head.appendChild(el("span", "opt-letra", LETRAS[i]));
          head.appendChild(el("span", "opt-txt", txt));
          const pct = el("span", "opt-pct", ""); head.appendChild(pct);
          const bar = el("div", "opt-bar"); const fill = el("div", "opt-fill"); bar.appendChild(fill);
          o.appendChild(head); o.appendChild(bar);
          o._fill = fill; o._pct = pct; opts.appendChild(o); return o;
        });

        salaRef(sala).child("comodines").get().then((s) => {
          const c = s.val() || {};
          cMaf.disabled = !!c.maf; cFf.disabled = !!c.ff; cMg.disabled = !!c.mg;
        });

        salaRef(sala).update({ estado: "jugando", idx: idx, revelar: false, oraculo: null, ff5050: null, pausado: false });
        salaRef(sala).child("respuestas").remove();

        if (votosRef) votosRef.off();
        votosRef = salaRef(sala).child("respuestas");
        votosRef.on("value", (snap) => {
          const c = [0, 0, 0, 0]; let tot = 0; const quien = {};
          snap.forEach((x) => { const v = x.val(); if (v >= 0 && v <= 3) { c[v]++; tot++; quien[x.key] = v; } });
          optEls.forEach((o, i) => {
            const pc = tot ? Math.round(c[i] / tot * 100) : 0;
            o._fill.style.width = pc + "%"; o._pct.textContent = tot ? pc + "%" : "";
          });
          stage._c = c; stage._tot = tot; stage._quien = quien;
        });

        restante = TIEMPO; clockNum.textContent = restante; clockFill.style.width = "100%"; clock.classList.remove("low");
        correrTimer();
        btnRevelar.onclick = () => { detenerTimer(); revelar(); };
      }

      cMaf.onclick = () => {
        const p = Q[idx]; cMaf.disabled = true;
        salaRef(sala).child("comodines/maf").set(true);
        const payload = { who: "MAF · clon virtual", what: p.pista };
        salaRef(sala).update({ oraculo: payload });
        oWho.textContent = payload.who; oWhat.textContent = payload.what; oraculo.style.display = "";
      };
      cMg.onclick = () => {
        const p = Q[idx]; cMg.disabled = true;
        salaRef(sala).child("comodines/mg").set(true);
        const resp = "La respuesta correcta es " + LETRAS[p.correct] + " — " + p.options[p.correct] + ".";
        const payload = { who: "MG · asistente", what: resp };
        salaRef(sala).update({ oraculo: payload });
        oWho.textContent = payload.who; oWhat.textContent = payload.what; oraculo.style.display = "";
      };
      cFf.onclick = () => {
        const p = Q[idx]; cFf.disabled = true;
        const malas = [0, 1, 2, 3].filter((i) => i !== p.correct);
        for (let i = malas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [malas[i], malas[j]] = [malas[j], malas[i]]; }
        const elim = malas.slice(0, 2);
        salaRef(sala).child("comodines/ff").set(true);
        salaRef(sala).update({ ff5050: elim });
        elim.forEach((i) => optEls[i].classList.add("eliminada"));
      };

      function revelar() {
        if (cerrada) return; cerrada = true;
        detenerTimer(); btnPausa.disabled = true;
        const p = Q[idx];
        salaRef(sala).update({ revelar: true, estado: "revelado" });
        optEls.forEach((o, i) => o.classList.add(i === p.correct ? "correcta" : "incorrecta"));

        // Sumar puntaje individual a quienes acertaron
        const quien = stage._quien || {};
        const updates = {};
        Object.keys(quien).forEach((jid) => { if (quien[jid] === p.correct) updates[jid] = firebase.database.ServerValue.increment(1); });
        if (Object.keys(updates).length) salaRef(sala).child("puntajes").update(updates);

        const c = stage._c || [0,0,0,0]; const tot = stage._tot || 0;
        const ac = c[p.correct] || 0; const ratio = tot ? ac / tot : 0; const pasa = ratio > UMBRAL;
        if (tot && !pasa) { vidas = Math.max(0, vidas - 1); salaRef(sala).update({ vidas: vidas }); corazones(vidas, hearts); }
        salaRef(sala).update({ pasa: pasa, ratio: Math.round(ratio*100) });
        veredicto.textContent = tot
          ? (pasa ? "El curso avanza · " + Math.round(ratio*100) + "% acertó (" + ac + "/" + tot + ")"
                  : "El curso pierde una vida · " + Math.round(ratio*100) + "% acertó (" + ac + "/" + tot + ")")
          : "Sin respuestas registradas";
        veredicto.className = "veredicto " + (tot ? (pasa ? "ok" : "no") : "");

        btnRevelar.style.display = "none";
        if (vidas <= 0 && tot && !pasa) { btnNext.style.display = ""; btnNext.textContent = "Ver resultado"; btnNext.onclick = final; return; }
        if (idx < TOTAL - 1) { btnNext.style.display = ""; btnNext.textContent = "Siguiente"; btnNext.onclick = () => { idx++; cargar(); }; }
        else { btnNext.style.display = ""; btnNext.textContent = "Ver resultado final"; btnNext.onclick = final; }
      }

      function final() {
        detenerTimer();
        const gano = vidas > 0;
        salaRef(sala).update({ estado: "fin", final: gano ? "win" : "lose" });
        // Leer puntajes y nombres para el top 3
        Promise.all([ salaRef(sala).child("puntajes").get(), salaRef(sala).child("jugadores").get() ]).then(([ps, js]) => {
          const punt = ps.val() || {}; const jugs = js.val() || {};
          const tabla = Object.keys(jugs).map((id) => ({ nombre: (jugs[id] && jugs[id].nombre) || "—", pts: punt[id] || 0 }));
          tabla.sort((a, b) => b.pts - a.pts);
          const top = tabla.slice(0, 3);

          root.innerHTML = "";
          const c = el("section", "endcard");
          c.appendChild(el("p", "eyebrow", "Fin del round"));
          const h = el("h1", "display");
          h.textContent = gano ? "El curso resistió" : "Se acabaron las vidas"; c.appendChild(h);
          c.appendChild(el("p", "lede", gano
            ? "Completaron las cuarenta preguntas con vidas en pie."
            : "El curso llegó hasta la pregunta " + (idx + 1) + " de " + TOTAL + "."));

          // Resultado del curso
          const resumen = el("div", "resumen-curso");
          const vivas = el("div", "rc-item");
          vivas.innerHTML = "<span class='rc-num'>" + vidas + "</span><span class='rc-lab'>vidas restantes</span>";
          const llegada = el("div", "rc-item");
          llegada.innerHTML = "<span class='rc-num'>" + (gano ? TOTAL : idx + 1) + "/" + TOTAL + "</span><span class='rc-lab'>preguntas</span>";
          resumen.appendChild(vivas); resumen.appendChild(llegada);
          c.appendChild(resumen);

          // Top 3
          if (top.length) {
            c.appendChild(el("p", "eyebrow", "Mención del round")); 
            const ol = el("div", "podio");
            top.forEach((t, i) => {
              const row = el("div", "podio-row");
              row.appendChild(el("span", "podio-pos", (i + 1) + "."));
              row.appendChild(el("span", "podio-nom", t.nombre));
              row.appendChild(el("span", "podio-pts", t.pts + " aciertos"));
              ol.appendChild(row);
            });
            c.appendChild(ol);
          }

          const b = el("button", "btn btn-primary", "Reiniciar"); b.onclick = () => location.reload(); c.appendChild(b);
          c.appendChild(el("p", "colofon", "MAF · MMXXVI"));
          root.appendChild(c);
        });
      }

      pintarEscalera();
      cargar();
    }

    setup();
  }

  // =========================================================================
  //  VISTA ESTUDIANTE (play)
  // =========================================================================
  function initPlayer() {
    document.body.prepend(topbar());
    const root = $("#app");
    let sala = (params.get("sala") || window.SALA_DEFECTO).toUpperCase(), yo = null, nombre = "";
    let idxLocal = -1, yaResp = false, miAcierto = 0; // contador local de aciertos

    function join() {
      root.innerHTML = "";
      const s = el("section", "cover");
      s.appendChild(el("p", "eyebrow", "Repaso en vivo"));
      const h = el("h1", "display"); h.innerHTML = "Únete al <em class='round-word'>round</em>"; s.appendChild(h);
      s.appendChild(el("p", "lede", "Cada pregunta se decide entre todos: si más de la mitad acierta, el curso avanza."));
      const f1 = el("div", "field"); f1.appendChild(el("label", null, "Tu nombre"));
      const inN = el("input", "input"); inN.placeholder = "Nombre y apellido"; inN.maxLength = 30; f1.appendChild(inN); s.appendChild(f1);
      const f2 = el("div", "field"); f2.appendChild(el("label", null, "Código de sala"));
      const inS = el("input", "input"); inS.value = sala; inS.maxLength = 12; f2.appendChild(inS); s.appendChild(f2);
      const b = el("button", "btn btn-primary btn-wide", "Entrar"); s.appendChild(b);
      const msg = el("p", "hint", ""); s.appendChild(msg); root.appendChild(s);
      b.onclick = () => {
        nombre = (inN.value || "").trim();
        sala = (inS.value || window.SALA_DEFECTO).toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!nombre) { msg.textContent = "Escribe tu nombre para entrar."; return; }
        salaRef(sala).child("estado").get().then((st) => {
          if (!st.exists()) { msg.textContent = "Esa sala no está abierta todavía. Pide el código al docente."; return; }
          const ref = salaRef(sala).child("jugadores").push(); yo = ref.key;
          ref.set({ nombre: nombre, ts: firebase.database.ServerValue.TIMESTAMP });
          ref.onDisconnect().remove();
          salaRef(sala).child("puntajes/" + yo).set(0);
          espera();
        });
      };
    }

    function espera() {
      root.innerHTML = "";
      const wrap = el("section", "player");
      const meta = el("div", "stage-meta");
      const mL = el("div"); mL.innerHTML = "SALA <strong>" + sala + "</strong>";
      const mR = el("div", null, nombre.toUpperCase());
      meta.appendChild(mL); meta.appendChild(mR); wrap.appendChild(meta);
      const body = el("div", "player-body"); wrap.appendChild(body); root.appendChild(wrap);

      salaRef(sala).on("value", (snap) => {
        const st = snap.val(); if (!st) return;

        if (st.estado === "lobby") {
          body.innerHTML = "";
          body.appendChild(el("h2", "wait-title", "Estás dentro"));
          body.appendChild(el("p", "wait-sub", "Espera a que el docente inicie la primera pregunta."));
          const v = el("div", "p-vidas"); corazones(st.vidas != null ? st.vidas : VIDAS0, v); body.appendChild(v);
          idxLocal = -1; return;
        }
        if (st.estado === "fin") { finalEstudiante(st); return; }

        const p = Q[st.idx]; if (!p) return;
        if (st.idx !== idxLocal && st.estado === "jugando") { idxLocal = st.idx; yaResp = false; pintar(p, st); }
        if (st.pausado && body._estado && !yaResp) { /* indicar pausa suave */ }
        if (st.ff5050 && body._grid) st.ff5050.forEach((i) => body._grid.children[i] && body._grid.children[i].classList.add("eliminada"));
        if (st.oraculo) mostrarOraculo(st.oraculo);
        if (st.revelar) marcar(p, st);
        if (body._vidas) corazones(st.vidas != null ? st.vidas : VIDAS0, body._vidas);
      });

      function pintar(p, st) {
        body.innerHTML = "";
        body.appendChild(el("div", "p-kicker", "Pregunta " + (st.idx + 1) + " de " + TOTAL + " · Cap. " + p.cap));
        body.appendChild(el("h2", "p-text", p.q));
        const grid = el("div", "p-opts");
        p.options.forEach((txt, i) => {
          const b = el("button", "p-opt");
          b.appendChild(el("span", "p-letra", LETRAS[i]));
          b.appendChild(el("span", null, txt));
          b.onclick = () => responder(i, grid, p);
          grid.appendChild(b);
        });
        body.appendChild(grid);
        const orac = el("div", "p-oraculo"); orac.style.display = "none";
        const ow = el("div", "who"); const owt = el("div", "what"); orac.appendChild(ow); orac.appendChild(owt); body.appendChild(orac);
        const estado = el("p", "p-estado", "Elige una alternativa."); body.appendChild(estado);
        const vid = el("div", "p-vidas"); corazones(st.vidas != null ? st.vidas : VIDAS0, vid); body.appendChild(vid);
        body._grid = grid; body._estado = estado; body._orac = orac; body._ow = ow; body._owt = owt; body._vidas = vid; body._mi = null;
      }
      function responder(i, grid, p) {
        if (yaResp) return; if (grid.children[i].classList.contains("eliminada")) return;
        yaResp = true; body._mi = i;
        salaRef(sala).child("respuestas").child(yo).set(i);
        [...grid.children].forEach((b, j) => { b.disabled = true; if (j === i) b.classList.add("elegida"); });
        if (body._estado) body._estado.textContent = "Respuesta enviada. Espera el conteo del curso.";
      }
      function mostrarOraculo(o) { if (!body._orac) return; body._ow.textContent = o.who; body._owt.textContent = o.what; body._orac.style.display = ""; }
      function marcar(p, st) {
        const grid = body._grid; if (!grid) return;
        [...grid.children].forEach((b, j) => {
          b.disabled = true;
          if (j === p.correct) b.classList.add("p-correcta");
          else if (b.classList.contains("elegida")) b.classList.add("p-incorrecta");
        });
        // contar mi acierto local (una sola vez por pregunta)
        if (!body._contado) { body._contado = true; if (body._mi === p.correct) miAcierto++; }
        if (body._estado) {
          body._estado.textContent = st.pasa ? "El curso avanza (" + st.ratio + "% acertó)."
            : "El curso no superó el 50% (" + st.ratio + "% acertó). Pierde una vida.";
          body._estado.className = "p-estado " + (st.pasa ? "ok" : "no");
        }
      }
    }

    function finalEstudiante(st) {
      root.innerHTML = "";
      const wrap = el("section", "player");
      const meta = el("div", "stage-meta");
      const mL = el("div"); mL.innerHTML = "SALA <strong>" + sala + "</strong>";
      meta.appendChild(mL); meta.appendChild(el("div", null, nombre.toUpperCase())); wrap.appendChild(meta);
      const body = el("div", "player-body"); wrap.appendChild(body); root.appendChild(wrap);

      // preferir el puntaje oficial de Firebase; si no, el conteo local
      salaRef(sala).child("puntajes/" + yo).get().then((s) => {
        const pts = (s.exists() && s.val() != null) ? s.val() : miAcierto;
        const respondidas = (st.final === "win") ? TOTAL : (st.idx != null ? st.idx + 1 : TOTAL);
        body.innerHTML = "";
        body.appendChild(el("h2", "wait-title", st.final === "lose" ? "Fin del round" : "¡Lo lograron!"));
        const score = el("div", "mi-score");
        score.innerHTML = "<span class='ms-num'>" + pts + "</span><span class='ms-lab'>aciertos de " + respondidas + "</span>";
        body.appendChild(score);
        body.appendChild(el("p", "wait-sub", st.final === "lose"
          ? "El curso no completó el round esta vez, pero tu marca quedó registrada."
          : "El curso completó la escalera. Revisa tu marca arriba."));
      });
    }

    join();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (configFaltante()) bannerConfig();
    if (ROLE === "host") initHost(); else initPlayer();
  });
})();
