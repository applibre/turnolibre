/* ===========================================================
   TurnoLibre · estado
   Un solo sitio donde cambian los datos. Quien quiera enterarse,
   se apunta con escuchar(); quien quiera cambiar algo, usa
   cambiar(). No hay más vías, y por eso no hay sorpresas.
   =========================================================== */
const Estado = (() => {
  'use strict';

  let datos = Almacen.leer();
  const oyentes = [];
  let pendiente = null;

  const leer = () => datos;

  const escuchar = (fn) => { oyentes.push(fn); return fn; };
  const avisar = () => oyentes.forEach((fn) => { try { fn(datos); } catch (_) {} });

  /* Se guarda con un respiro: si el usuario toca cinco veces seguidas
     el mismo día, se escribe una vez, no cinco. */
  const guardarPronto = () => {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => Almacen.guardar(datos), 220);
  };

  /** Cambia el estado. La función recibe los datos y los muta. */
  function cambiar(fn) {
    fn(datos);
    guardarPronto();
    avisar();
  }

  /** Guarda ya, sin esperar (al salir de la app, al exportar). */
  function guardarYa() {
    clearTimeout(pendiente);
    return Almacen.guardar(datos);
  }

  /** Sustituye todo el estado (al importar una copia de seguridad). */
  function reemplazar(nuevos) {
    datos = { ...Almacen.inicial(), ...nuevos };
    guardarYa();
    avisar();
  }

  function reiniciar() {
    Almacen.borrarTodo();
    datos = Almacen.inicial();
    avisar();
  }

  /* ---------- atajos de uso frecuente ---------- */

  /** Lo que el dominio necesita para resolver un día. */
  const paraDominio = () => ({
    ajustes: datos.ajustes,
    tiposTurno: datos.tiposTurno,
    patron: datos.patron,
    excepciones: datos.excepciones,
    festivos: datos.festivos,
    // desde cuándo las horas son un registro y no una proyección
    desde: datos.ajustes.desde || datos.creado || null,
  });

  /* La rotación es opcional: hay muchísima gente a la que le ponen el
     cuadrante cada semana y no tiene ninguna. Basta con haber pasado
     por la bienvenida y tener turnos con los que pintar. */
  const listo = () => !!(datos.bienvenida && datos.tiposTurno.length);

  /** Guarda o retira la excepción de un día. Si el día vuelve a ser
      igual que el patrón, la excepción se borra: no se acumula basura. */
  function ponerExcepcion(fecha, cambios) {
    cambiar((d) => {
      const actual = d.excepciones[fecha] || {};
      const nueva = { ...actual, ...cambios };

      Object.keys(nueva).forEach((k) => {
        if (nueva[k] === null || nueva[k] === undefined || nueva[k] === '') delete nueva[k];
      });

      if (!Object.keys(nueva).length) delete d.excepciones[fecha];
      else d.excepciones[fecha] = nueva;
    });
  }

  const quitarExcepcion = (fecha) => cambiar((d) => { delete d.excepciones[fecha]; });

  return {
    leer, cambiar, escuchar, guardarYa, reemplazar, reiniciar,
    paraDominio, listo, ponerExcepcion, quitarExcepcion,
  };
})();
