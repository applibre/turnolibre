/* ===========================================================
   TurnoLibre · almacén
   Guardar y recuperar del navegador, sin perder nada por el camino.

   Tres cuidados que la experiencia ya enseñó:
   · si los datos vienen corruptos, se apartan, no se destruyen;
   · si el navegador se queda sin sitio, se avisa en vez de fallar
     en silencio;
   · antes del primer guardado de cada día se deja una copia.
   =========================================================== */
const Almacen = (() => {
  'use strict';

  const CLAVE = 'turnolibre';
  const CLAVE_COPIA = 'turnolibre-copia';
  const VERSION = 1;

  const inicial = () => ({
    schemaVersion: VERSION,
    ajustes: {
      nombre: '',
      horasContrato: null,      // { tipo: 'semanal'|'mensual'|'anual', valor }
      avisoMinutos: 60,
      tema: 'auto',
    },
    tiposTurno: [],
    patron: null,               // { secuencia: [...], ancla: 'AAAA-MM-DD' }
    excepciones: {},
    festivos: [],
    secuenciaICS: 0,            // sube cada vez que se exporta, para que
                                // el calendario del móvil actualice
    creado: null,
    bienvenida: false,
  });

  /* ---------- migraciones ----------
     Funciones puras y en orden. Cuando el modelo cambie, se añade una
     nueva; las anteriores no se tocan nunca. */
  const migraciones = [
    // (datos) => datos  ·  de la versión 1 a la 2 iría aquí
  ];

  const migrar = (datos) => {
    let d = datos;
    let v = d.schemaVersion || 1;
    while (v - 1 < migraciones.length) {
      d = migraciones[v - 1](d);
      v++;
      d.schemaVersion = v;
    }
    return d;
  };

  /* ---------- leer ---------- */

  let avisoEspacio = null;

  function leer() {
    let crudo;
    try {
      crudo = localStorage.getItem(CLAVE);
    } catch (_) {
      // navegación privada muy restrictiva: se trabaja solo en memoria
      return inicial();
    }
    if (!crudo) return inicial();

    try {
      const datos = JSON.parse(crudo);
      if (!datos || typeof datos !== 'object') throw new Error('no es un objeto');
      return migrar({ ...inicial(), ...datos });
    } catch (_) {
      // No se borra: se aparta con otro nombre por si se puede rescatar
      try { localStorage.setItem(CLAVE + '-corrupto-' + Date.now(), crudo); } catch (__) {}
      return inicial();
    }
  }

  /* ---------- copia del día ----------
     La primera escritura de cada jornada deja una foto del estado
     anterior. Si algo se estropea hoy, lo de ayer sigue ahí. */

  function copiaDelDia(anterior) {
    try {
      const hoy = new Date().toISOString().slice(0, 10); // solo como marca, no como fecha de negocio
      const previa = JSON.parse(localStorage.getItem(CLAVE_COPIA) || 'null');
      if (previa && previa.dia === hoy) return;
      if (!anterior) return;
      localStorage.setItem(CLAVE_COPIA, JSON.stringify({ dia: hoy, datos: anterior }));
    } catch (_) {}
  }

  const leerCopia = () => {
    try { return JSON.parse(localStorage.getItem(CLAVE_COPIA) || 'null'); } catch (_) { return null; }
  };

  /* ---------- guardar ---------- */

  function guardar(datos) {
    let anterior = null;
    try { anterior = localStorage.getItem(CLAVE); } catch (_) {}
    copiaDelDia(anterior ? JSON.parse(anterior) : null);

    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return { ok: true };
    } catch (e) {
      const lleno = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
      if (lleno && avisoEspacio) avisoEspacio();
      return { ok: false, lleno: !!lleno };
    }
  }

  const alQuedarseSinEspacio = (fn) => { avisoEspacio = fn; };

  /* ---------- borrar todo (a petición del usuario) ---------- */

  function borrarTodo() {
    try {
      localStorage.removeItem(CLAVE);
      localStorage.removeItem(CLAVE_COPIA);
    } catch (_) {}
  }

  return { leer, guardar, borrarTodo, leerCopia, alQuedarseSinEspacio, inicial, VERSION };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Almacen;
