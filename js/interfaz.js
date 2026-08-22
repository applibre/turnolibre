/* ===========================================================
   TurnoLibre · piezas de interfaz compartidas
   Avisos, hoja inferior, confirmación y atajos de DOM.
   =========================================================== */
const UI = (() => {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- aviso flotante ---------- */

  let temporizador = null;

  function tosti(mensaje, tono = '', accion = null) {
    const t = $('#tosti');
    t.innerHTML = esc(mensaje);
    if (accion) {
      const b = document.createElement('button');
      b.textContent = accion.texto;
      b.onclick = () => { accion.hacer(); ocultarTosti(); };
      t.appendChild(b);
    }
    t.className = 'tosti viva ' + tono;
    clearTimeout(temporizador);
    temporizador = setTimeout(ocultarTosti, accion ? 5200 : 2400);
  }
  const ocultarTosti = () => { $('#tosti').className = 'tosti'; };

  /* ---------- hoja inferior ---------- */

  let alCerrarHoja = null;

  function hoja({ titulo, sub = '', html, listo }) {
    $('#hoja-titulo').textContent = titulo;
    const s = $('#hoja-sub');
    s.textContent = sub;
    s.classList.toggle('oculto', !sub);
    $('#hoja-cuerpo').innerHTML = html;
    $('#hoja').classList.add('viva');
    $('#velo').classList.add('viva');
    if (listo) listo($('#hoja-cuerpo'));
  }

  function cerrarHoja() {
    $('#hoja').classList.remove('viva');
    $('#velo').classList.remove('viva');
    if (alCerrarHoja) { const f = alCerrarHoja; alCerrarHoja = null; f(); }
  }

  const alCerrar = (fn) => { alCerrarHoja = fn; };

  /* ---------- confirmar sin usar el diálogo del navegador ---------- */

  function confirmar({ titulo, sub, aceptar = 'Sí, continuar', peligro = false }) {
    return new Promise((resolve) => {
      let decidido = false;
      hoja({
        titulo, sub,
        html: `<div class="botones">
                 <button class="btn" data-no>Cancelar</button>
                 <button class="btn ${peligro ? 'peligro' : 'principal'}" data-si>${esc(aceptar)}</button>
               </div>`,
        listo(c) {
          $('[data-si]', c).onclick = () => { decidido = true; cerrarHoja(); resolve(true); };
          $('[data-no]', c).onclick = () => { decidido = true; cerrarHoja(); resolve(false); };
        },
      });
      alCerrar(() => { if (!decidido) resolve(false); });
    });
  }

  /* ---------- vibración suave donde exista ---------- */

  const vibrar = (ms = 10) => {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
  };

  /* ---------- formato de horas ----------
     "8 h" mejor que "8.00 h"; "7 h 30" mejor que "7.5 h". */

  function horas(n, conSigno = false) {
    if (n === null || n === undefined) return '—';
    const signo = conSigno && n > 0 ? '+' : (n < 0 ? '−' : '');
    const abs = Math.abs(n);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    if (m === 0) return `${signo}${h} h`;
    if (m === 60) return `${signo}${h + 1} h`;
    return `${signo}${h} h ${String(m).padStart(2, '0')}`;
  }

  /* ---------- cierres globales ---------- */

  $('#velo').addEventListener('click', cerrarHoja);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarHoja(); });

  return { $, $$, esc, tosti, ocultarTosti, hoja, cerrarHoja, alCerrar, confirmar, vibrar, horas };
})();
