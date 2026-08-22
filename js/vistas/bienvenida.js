/* ===========================================================
   TurnoLibre · primeros pasos
   Tres preguntas y dentro. Ni cuenta, ni correo, ni contraseña.

   La segunda pregunta es la que evita el error clásico de estas
   apps: en vez de pedir "¿cuándo empezó tu ciclo?" —que nadie
   recuerda— se enseña el ciclo y se pregunta qué toca HOY.
   =========================================================== */
const Bienvenida = (() => {
  'use strict';

  const { $, esc, tosti } = UI;

  let paso = 0;
  let patronElegido = null;
  let posicionHoy = 0;
  let contrato = { tipo: 'semanal', valor: 40 };

  const tono = (color) => `color-mix(in srgb, ${color} 22%, var(--surface))`;

  function iniciar() {
    paso = 0;
    patronElegido = Dominio.PATRONES[0];
    pintar();
  }

  function pintar() {
    const p = $('#p-bienvenida');
    p.innerHTML = `
      <div class="bien-caja">
        <h1>${['Tus turnos, tuyos', '¿Qué te toca hoy?', 'Tu jornada'][paso]}</h1>
        <p class="lema">${[
          'Elige cómo rota tu trabajo. Luego podrás cambiarlo todo.',
          'Toca el turno que tienes hoy dentro de tu ciclo. Con eso ya sabemos pintarte el año entero.',
          'Cuántas horas dice tu contrato. Sirve para saber si te pasas.',
        ][paso]}</p>

        <div class="bien-paso ${paso === 0 ? 'viva' : ''}" id="paso-0">${pintarPatrones()}</div>
        <div class="bien-paso ${paso === 1 ? 'viva' : ''}" id="paso-1">${pintarCiclo()}</div>
        <div class="bien-paso ${paso === 2 ? 'viva' : ''}" id="paso-2">${pintarContrato()}</div>

        <div class="bien-pie">
          <div class="puntos">${[0, 1, 2].map((i) => `<i class="${i === paso ? 'viva' : ''}"></i>`).join('')}</div>
          <div class="botones">
            ${paso > 0 ? '<button class="btn" data-atras>Atrás</button>' : ''}
            <button class="btn principal" data-siguiente>${paso === 2 ? 'Empezar' : 'Siguiente'}</button>
          </div>
        </div>
      </div>`;

    enganchar(p);
  }

  /* ---------- paso 1: el patrón ---------- */

  function pintarPatrones() {
    return `<div class="patrones">
      ${Dominio.PATRONES.map((p) => `
        <button class="patron ${patronElegido && p.id === patronElegido.id ? 'viva' : ''}" data-patron="${esc(p.id)}">
          <b>${esc(p.nombre)}</b>
          <small>${esc(p.pista)}</small>
          <span class="tira-p">${p.secuencia.map((id) => {
            const t = Dominio.TIPOS_BASE.find((x) => x.id === id);
            return `<i style="background:${t && !t.libre ? t.color : 'var(--line2)'}"></i>`;
          }).join('')}</span>
        </button>`).join('')}
    </div>
    <p class="pista chica">¿No está el tuyo? Elige el que más se parezca: en Ajustes puedes
    montar tu secuencia día a día.</p>`;
  }

  /* ---------- paso 2: dónde estás del ciclo ---------- */

  function pintarCiclo() {
    if (!patronElegido) return '';
    const tipos = Dominio.tiposDePatron(patronElegido.secuencia);
    return `<div class="turnos">
      ${patronElegido.secuencia.map((id, i) => {
        const t = Dominio.tipoPorId(tipos, id);
        const libre = !t || t.libre;
        return `<button data-pos="${i}" class="${i === posicionHoy ? 'viva' : ''}"
          style="color:${libre ? 'var(--tx2)' : esc(t.color)};background:${libre ? 'var(--sunk)' : tono(t.color)}">
          <span class="t">${esc(t ? t.nombre : '—')}</span>
          <span class="h">día ${i + 1}</span>
        </button>`;
      }).join('')}
    </div>
    <p class="pista">Hoy es <b>${esc(Dominio.fechaLarga(Dominio.hoyISO()))}</b>.</p>`;
  }

  /* ---------- paso 3: el contrato ---------- */

  function pintarContrato() {
    return `
      <div class="campo">
        <label>Mis horas son…</label>
        <div class="segmentos" id="seg-tipo">
          ${[['semanal', 'A la semana'], ['mensual', 'Al mes'], ['anual', 'Al año']].map(([v, t]) =>
            `<button data-tipo="${v}" class="${contrato.tipo === v ? 'viva' : ''}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="campo">
        <label>Cuántas horas</label>
        <input type="number" id="in-contrato" inputmode="decimal" step="0.5" min="1"
          value="${contrato.valor}">
      </div>
      <div class="aviso">
        <span>ℹ️</span>
        <span>Si no lo sabes de memoria, pon lo que creas y corrígelo luego: está en
        tu contrato o en tu convenio. También puedes <b>saltarlo</b> y usar solo el calendario.</span>
      </div>
      <button class="btn" data-sin-contrato style="margin-top:12px">Prefiero no ponerlo</button>`;
  }

  /* ---------- interacción ---------- */

  function enganchar(p) {
    p.querySelectorAll('[data-patron]').forEach((b) => {
      b.onclick = () => {
        patronElegido = Dominio.PATRONES.find((x) => x.id === b.dataset.patron);
        posicionHoy = 0;
        UI.vibrar();
        pintar();
      };
    });

    p.querySelectorAll('[data-pos]').forEach((b) => {
      b.onclick = () => { posicionHoy = +b.dataset.pos; UI.vibrar(); pintar(); };
    });

    p.querySelectorAll('[data-tipo]').forEach((b) => {
      b.onclick = () => {
        contrato.tipo = b.dataset.tipo;
        const porDefecto = { semanal: 40, mensual: 173, anual: 1780 };
        contrato.valor = porDefecto[contrato.tipo];
        pintar();
      };
    });

    const inC = $('#in-contrato', p);
    if (inC) inC.oninput = () => { contrato.valor = parseFloat(inC.value) || 0; };

    const sin = $('[data-sin-contrato]', p);
    if (sin) sin.onclick = () => terminar(null);

    const atras = $('[data-atras]', p);
    if (atras) atras.onclick = () => { paso--; pintar(); };

    $('[data-siguiente]', p).onclick = () => {
      if (paso < 2) { paso++; pintar(); return; }
      if (!contrato.valor || contrato.valor <= 0) {
        tosti('Pon tus horas o elige «Prefiero no ponerlo»', 'mala');
        return;
      }
      terminar(contrato);
    };
  }

  /* ---------- guardar y entrar ---------- */

  function terminar(elContrato) {
    // El ancla es el día en que la secuencia empieza: hoy menos la
    // posición que el usuario ha señalado.
    const ancla = Dominio.sumarDias(Dominio.hoyISO(), -posicionHoy);

    Estado.cambiar((d) => {
      d.patron = { secuencia: [...patronElegido.secuencia], ancla };
      d.tiposTurno = Dominio.tiposDePatron(patronElegido.secuencia);
      d.ajustes.horasContrato = elContrato ? { ...elContrato } : null;
      d.creado = Dominio.hoyISO();
      d.ajustes.desde = Dominio.hoyISO();
      d.bienvenida = true;
    });
    Estado.guardarYa();

    App.arrancarApp();
    App.ir('mes');
    tosti('Listo. Toca cualquier día para corregirlo', 'buena');
  }

  return { iniciar };
})();
