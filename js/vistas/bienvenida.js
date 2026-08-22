/* ===========================================================
   TurnoLibre · primeros pasos
   Dos preguntas y dentro. Ni cuenta, ni correo, ni contraseña.

   Aquí NO se pregunta por la rotación. Describir tu ciclo en
   abstracto es difícil aunque lo vivas cada día, y muchísima gente
   ni siquiera tiene uno: le ponen el cuadrante cada semana. Así que
   solo se pregunta qué turnos existen en tu trabajo; el calendario
   se pinta después, tocando días, y si de ahí sale una repetición
   la app se ofrece a seguirla.
   =========================================================== */
const Bienvenida = (() => {
  'use strict';

  const { $, esc, tosti } = UI;

  let paso = 0;
  let elegidos = ['M', 'T', 'N'];
  let contrato = { tipo: 'semanal', valor: 40 };

  const tono = (color) => `color-mix(in srgb, ${color} 22%, var(--surface))`;
  const trabajo = () => Dominio.TIPOS_BASE.filter((t) => !t.libre);

  function iniciar() {
    paso = 0;
    elegidos = ['M', 'T', 'N'];
    pintar();
  }

  function pintar() {
    $('#p-bienvenida').innerHTML = `
      <div class="bien-caja">
        <h1>${['¿Qué turnos haces?', 'Tu jornada'][paso]}</h1>
        <p class="lema">${[
          'Marca los que existan en tu trabajo. Luego podrás cambiarles el horario, el color y el nombre, o añadir los que quieras.',
          'Cuántas horas dice tu contrato. Sirve para saber si te pasas.',
        ][paso]}</p>

        <div class="bien-paso ${paso === 0 ? 'viva' : ''}">${pintarTurnos()}</div>
        <div class="bien-paso ${paso === 1 ? 'viva' : ''}">${pintarContrato()}</div>

        <div class="bien-pie">
          <div class="puntos">${[0, 1].map((i) => `<i class="${i === paso ? 'viva' : ''}"></i>`).join('')}</div>
          <div class="botones">
            ${paso > 0 ? '<button class="btn" data-atras>Atrás</button>' : ''}
            <button class="btn principal" data-siguiente>${paso === 1 ? 'Empezar' : 'Siguiente'}</button>
          </div>
        </div>
      </div>`;
    enganchar();
  }

  /* ---------- paso 1: qué turnos existen ---------- */

  function pintarTurnos() {
    return `<div class="turnos">
        ${trabajo().map((t) => {
          const on = elegidos.includes(t.id);
          return `<button data-t="${esc(t.id)}" class="${on ? 'viva' : ''}"
            style="color:${on ? esc(t.color) : 'var(--tx3)'};background:${on ? tono(t.color) : 'var(--sunk)'}">
            <span class="t">${esc(t.nombre)}</span>
            <span class="h">${esc(t.entrada)}–${esc(t.salida)}</span>
          </button>`;
        }).join('')}
      </div>
      <p class="pista chica">Los horarios son solo un punto de partida: los ajustas en Ajustes
      cuando quieras, y también puedes crear turnos tuyos (guardias, refuerzos, lo que sea).</p>`;
  }

  /* ---------- paso 2: el contrato ---------- */

  function pintarContrato() {
    return `
      <div class="campo">
        <label>Mis horas son…</label>
        <div class="segmentos">
          ${[['semanal', 'A la semana'], ['mensual', 'Al mes'], ['anual', 'Al año']].map(([v, t]) =>
            `<button data-tipo="${v}" class="${contrato.tipo === v ? 'viva' : ''}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="campo">
        <label>Cuántas horas</label>
        <input type="number" id="in-contrato" inputmode="decimal" step="0.5" min="1" value="${contrato.valor}">
      </div>
      <div class="aviso">
        <span>ℹ️</span>
        <span>Si no lo sabes de memoria, pon lo que creas y corrígelo luego: está en tu
        contrato o en tu convenio. También puedes <b>saltarlo</b> y usar solo el calendario.</span>
      </div>
      <button class="btn" data-sin-contrato style="margin-top:12px">Prefiero no ponerlo</button>`;
  }

  /* ---------- interacción ---------- */

  function enganchar() {
    const p = $('#p-bienvenida');

    p.querySelectorAll('[data-t]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.t;
        const i = elegidos.indexOf(id);
        if (i === -1) elegidos.push(id);
        else elegidos.splice(i, 1);
        UI.vibrar();
        pintar();
      };
    });

    p.querySelectorAll('[data-tipo]').forEach((b) => {
      b.onclick = () => {
        contrato.tipo = b.dataset.tipo;
        contrato.valor = { semanal: 40, mensual: 173, anual: 1780 }[contrato.tipo];
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
      if (paso === 0) {
        if (!elegidos.length) { tosti('Marca al menos un turno', 'mala'); return; }
        paso = 1;
        pintar();
        return;
      }
      if (!contrato.valor || contrato.valor <= 0) {
        tosti('Pon tus horas o elige «Prefiero no ponerlo»', 'mala');
        return;
      }
      terminar(contrato);
    };
  }

  /* ---------- guardar y entrar ---------- */

  function terminar(elContrato) {
    // Se entra sin rotación: el calendario está vacío y se pinta.
    const orden = Dominio.TIPOS_BASE.filter((t) => elegidos.includes(t.id) || t.libre);

    Estado.cambiar((d) => {
      d.tiposTurno = orden.map((t) => ({ ...t }));
      d.patron = null;
      d.ajustes.horasContrato = elContrato ? { ...elContrato } : null;
      d.creado = Dominio.hoyISO();
      d.ajustes.desde = Dominio.hoyISO();
      d.bienvenida = true;
    });
    Estado.guardarYa();

    App.arrancarApp();
    App.ir('mes');
    tosti('Toca los días que trabajas para ponerles su turno', 'buena');
  }

  return { iniciar };
})();
