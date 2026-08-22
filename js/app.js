/* ===========================================================
   TurnoLibre · arranque y navegación
   =========================================================== */
const App = (() => {
  'use strict';

  const { $, $$, tosti } = UI;

  const PANTALLAS = ['bienvenida', 'mes', 'horas', 'ajustes'];
  let actual = null;

  /* ---------- navegación ---------- */

  function ir(nombre) {
    PANTALLAS.forEach((p) => $(`#p-${p}`).classList.toggle('viva', p === nombre));
    $$('.nav button').forEach((b) => {
      const suya = b.dataset.ir === nombre;
      b.classList.toggle('viva', suya);
      if (suya) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $('#nav').classList.toggle('oculto', nombre === 'bienvenida');
    actual = nombre;

    if (nombre === 'mes') Mes.pintar();
    if (nombre === 'horas') Horas.pintar();
    if (nombre === 'ajustes') Ajustes.pintar();

    const c = $(`#p-${nombre} .cuerpo`);
    if (c) c.scrollTop = 0;
  }

  /* ---------- tema ---------- */

  function aplicarTema() {
    const t = Estado.leer().ajustes.tema || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', t);

    const oscuro = t === 'oscuro'
      || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    $$('meta[name="theme-color"]').forEach((m) => m.remove());
    const m = document.createElement('meta');
    m.name = 'theme-color';
    m.content = oscuro ? '#0F1216' : '#F0F1F3';
    document.head.appendChild(m);
  }

  /* ---------- arranque ---------- */

  function arrancarApp() {
    Mes.iniciar();
    Horas.iniciar();
    Ajustes.iniciar();

    $$('.nav button').forEach((b) => { b.onclick = () => ir(b.dataset.ir); });

    // Al volver a la app tras un rato, el "hoy" puede haber cambiado
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && actual === 'mes') Mes.pintar();
    });

    Almacen.alQuedarseSinEspacio(() => {
      tosti('El navegador se ha quedado sin espacio. Guarda una copia desde Ajustes', 'mala');
    });

    // Guardar antes de que la app se vaya a segundo plano
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Estado.guardarYa();
    });
  }

  function iniciar() {
    aplicarTema();

    if (Estado.listo()) {
      arrancarApp();
      ir('mes');
    } else {
      Bienvenida.iniciar();
      ir('bienvenida');
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  return { ir, aplicarTema, arrancarApp, pantalla: () => actual };
})();
