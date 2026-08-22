/* ===========================================================
   TurnoLibre · dominio
   Funciones puras: dado un patrón y unas excepciones, decir qué
   turno toca cada día, cuántas horas se han hecho de verdad y
   cuánto se desvía eso de lo contratado.

   Aquí no se toca el DOM ni el almacenamiento: todo entra por
   parámetro y todo sale devuelto. Por eso se puede probar con
   Node sin navegador.
   =========================================================== */
const Dominio = (() => {
  'use strict';

  /* ---------- fechas ----------
     Siempre texto local AAAA-MM-DD. Nunca toISOString(): en husos
     negativos (toda América) devuelve el día anterior y desplaza
     el cuadrante entero. */

  const dos = (n) => String(n).padStart(2, '0');

  const aISO = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
  const hoyISO = () => aISO(new Date());
  const deISO = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
  };

  /* Para contar días se normaliza a UTC: así el cambio de hora de
     verano no añade ni quita un día en mitad de una rotación. */
  const enUTC = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  const diasEntre = (desde, hasta) => Math.round((enUTC(hasta) - enUTC(desde)) / 86400000);

  const sumarDias = (iso, n) => {
    const d = deISO(iso);
    d.setDate(d.getDate() + n);
    return aISO(d);
  };

  /** 1 lunes … 7 domingo (la semana española, no la americana). */
  const diaSemana = (iso) => {
    const d = deISO(iso).getDay();
    return d === 0 ? 7 : d;
  };

  const esBisiesto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  const diasDelAnio = (a) => (esBisiesto(a) ? 366 : 365);
  const diasDelMes = (anio, mes) => new Date(anio, mes, 0).getDate(); // mes 1-12

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  const nombreMes = (mes) => MESES[mes - 1];
  const fechaLarga = (iso) => {
    const d = deISO(iso);
    return `${DIAS[diaSemana(iso) - 1]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
  };
  const fechaCorta = (iso) => {
    const d = deISO(iso);
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
  };

  /* ---------- horas ---------- */

  const r2 = (n) => Math.round(n * 100) / 100;

  const aMinutos = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + m;
  };

  /** Duración de un turno. Si la salida no es posterior a la entrada,
      el turno cruza la medianoche (noches, y guardias de 24 h). */
  const horasEntre = (entrada, salida) => {
    let m = aMinutos(salida) - aMinutos(entrada);
    if (m <= 0) m += 24 * 60;
    return r2(m / 60);
  };

  /* ---------- tipos de turno ---------- */

  const tipoPorId = (tipos, id) => (tipos || []).find((t) => t.id === id) || null;

  /** Las horas de un tipo: las declaradas si las hay, si no las que
      salen de su horario. Un turno libre no suma nunca. */
  const horasDeTipo = (tipo) => {
    if (!tipo || tipo.libre) return 0;
    if (typeof tipo.horas === 'number') return r2(tipo.horas);
    if (tipo.entrada && tipo.salida) return horasEntre(tipo.entrada, tipo.salida);
    return 0;
  };

  /* ---------- el patrón ----------
     No se guarda un año de días: se guarda la secuencia y el día en
     que empieza. El turno de cualquier fecha se calcula. */

  const turnoDePatron = (fecha, patron) => {
    if (!patron || !Array.isArray(patron.secuencia) || !patron.secuencia.length) return null;
    const n = patron.secuencia.length;
    // el resto puede salir negativo para fechas anteriores al ancla
    const i = ((diasEntre(patron.ancla, fecha) % n) + n) % n;
    return patron.secuencia[i];
  };

  /* ---------- un día resuelto ----------
     El patrón dice lo previsto; la excepción dice lo que pasó. */

  const diaDe = (fecha, datos) => {
    const tipos = datos.tiposTurno || [];
    const exc = (datos.excepciones || {})[fecha] || null;

    const idPatron = turnoDePatron(fecha, datos.patron);
    const tipoId = exc && exc.tipoId ? exc.tipoId : idPatron;
    const tipo = tipoPorId(tipos, tipoId);

    const previstas = horasDeTipo(tipo);
    const reales = exc && typeof exc.horasReales === 'number' ? r2(exc.horasReales) : previstas;

    const dsem = diaSemana(fecha);
    const libre = !tipo || !!tipo.libre;

    return {
      fecha,
      tipoId,
      tipo,
      /* El patrón se puede pintar hacia atrás hasta el infinito, pero
         las horas de antes de empezar a usar la app NO son un registro:
         son una suposición. Se muestran en el calendario y no se suman
         en ningún recuento. */
      cuenta: !datos.desde || fecha >= datos.desde,
      horasPrevistas: previstas,
      horasReales: reales,
      extra: r2(reales - previstas),
      nota: (exc && exc.nota) || '',
      cambiado: !!(exc && exc.tipoId && exc.tipoId !== idPatron),
      ajustado: !!(exc && typeof exc.horasReales === 'number' && exc.horasReales !== previstas),
      trabaja: !libre || reales > 0,
      nocturno: !!(tipo && tipo.nocturno),
      festivo: (datos.festivos || []).includes(fecha),
      domingo: dsem === 7,
      diaSemana: dsem,
    };
  };

  const diasDeMes = (anio, mes, datos) => {
    const total = diasDelMes(anio, mes);
    const out = [];
    for (let d = 1; d <= total; d++) out.push(diaDe(`${anio}-${dos(mes)}-${dos(d)}`, datos));
    return out;
  };

  const diasEntreFechas = (desde, hasta, datos) => {
    const out = [];
    for (let f = desde; diasEntre(f, hasta) >= 0; f = sumarDias(f, 1)) out.push(diaDe(f, datos));
    return out;
  };

  /** La rejilla del calendario: semanas completas de lunes a domingo,
      con los días de relleno del mes anterior y siguiente marcados. */
  const rejillaDeMes = (anio, mes, datos) => {
    const primero = `${anio}-${dos(mes)}-01`;
    const desde = sumarDias(primero, -(diaSemana(primero) - 1));
    const ultimo = `${anio}-${dos(mes)}-${dos(diasDelMes(anio, mes))}`;
    const hasta = sumarDias(ultimo, 7 - diaSemana(ultimo));
    return diasEntreFechas(desde, hasta, datos).map((d) => ({
      ...d,
      relleno: d.fecha < primero || d.fecha > ultimo,
    }));
  };

  /* ---------- recuentos ---------- */

  /** Solo suma los días que cuentan: los anteriores al inicio del
      cómputo se ignoran, porque no son un registro sino una proyección. */
  const resumen = (dias) => {
    let reales = 0, previstas = 0, noches = 0, festivos = 0, domingos = 0, trabajados = 0, contados = 0;
    for (const d of dias) {
      if (d.cuenta === false) continue;
      contados++;
      reales += d.horasReales;
      previstas += d.horasPrevistas;
      if (d.trabaja) {
        trabajados++;
        if (d.nocturno) noches++;
        if (d.festivo) festivos++;
        if (d.domingo) domingos++;
      }
    }
    return {
      horasReales: r2(reales),
      horasPrevistas: r2(previstas),
      diferencia: r2(reales - previstas),
      noches,
      festivos,
      domingos,
      diasTrabajados: trabajados,
      diasContados: contados,
    };
  };

  /** Horas que corresponden por contrato a un tramo de n días.
      Se prorratea, que es como se comparan periodos desiguales. */
  const horasContratoDe = (ajustes, nDias, anio) => {
    const c = ajustes && ajustes.horasContrato;
    if (!c || !c.valor || !nDias) return null;
    if (c.tipo === 'semanal') return r2((c.valor / 7) * nDias);
    if (c.tipo === 'anual') return r2((c.valor / diasDelAnio(anio)) * nDias);
    if (c.tipo === 'mensual') return r2((c.valor * 12 / diasDelAnio(anio)) * nDias);
    return null;
  };

  const saldoDeMes = (anio, mes, datos) => {
    const dias = diasDeMes(anio, mes, datos);
    const r = resumen(dias);
    // el contrato se prorratea por los días que cuentan, no por los del mes
    const contrato = horasContratoDe(datos.ajustes, r.diasContados, anio);
    return {
      anio, mes, dias: dias.length,
      ...r,
      horasContrato: contrato,
      saldo: contrato === null ? null : r2(r.horasReales - contrato),
    };
  };

  const saldoDeAnio = (anio, datos) => {
    const meses = [];
    for (let m = 1; m <= 12; m++) meses.push(saldoDeMes(anio, m, datos));
    const suma = (campo) => r2(meses.reduce((a, m) => a + (m[campo] || 0), 0));
    const contados = meses.reduce((a, m) => a + m.diasContados, 0);
    const contrato = horasContratoDe(datos.ajustes, contados, anio);
    return {
      anio,
      meses,
      horasReales: suma('horasReales'),
      horasPrevistas: suma('horasPrevistas'),
      noches: meses.reduce((a, m) => a + m.noches, 0),
      festivos: meses.reduce((a, m) => a + m.festivos, 0),
      domingos: meses.reduce((a, m) => a + m.domingos, 0),
      diasTrabajados: meses.reduce((a, m) => a + m.diasTrabajados, 0),
      diasContados: contados,
      horasContrato: contrato,
      saldo: contrato === null ? null : r2(suma('horasReales') - contrato),
    };
  };

  /* ---------- calendario para el móvil (.ics) ----------
     El navegador no puede avisar a una hora concreta sin servidor,
     así que se genera un fichero y avisa el calendario del teléfono,
     que para eso está hecho.

     El identificador de cada evento es la fecha: así, al reimportar,
     el calendario reconoce el evento y lo actualiza en vez de crear
     otro. Limitación conocida: un día que pasa a ser libre deja de
     exportarse, pero el evento viejo sigue en el calendario. */

  const escaparICS = (t) => String(t || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

  /* El formato exige líneas de 75 OCTETOS, no de 75 letras: una eñe o
     una tilde ocupan dos bytes. Por eso se mide en bytes y se recorre
     por puntos de código, para no partir un carácter por la mitad.
     Las líneas de continuación empiezan por un espacio. */
  const octetos = (t) => new TextEncoder().encode(t).length;

  const plegar = (linea) => {
    if (octetos(linea) <= 75) return linea;
    const trozos = [];
    let actual = '';
    for (const ch of linea) {
      if (octetos(actual + ch) > 75) {
        trozos.push(actual);
        actual = ' ' + ch;
      } else {
        actual += ch;
      }
    }
    if (actual) trozos.push(actual);
    return trozos.join('\r\n');
  };

  const selloLocal = (iso, hhmm) => {
    const [a, m, d] = iso.split('-');
    const [h, mi] = String(hhmm).split(':');
    return `${a}${m}${d}T${dos(+h)}${dos(+mi)}00`;
  };

  const generarICS = (dias, opciones = {}) => {
    const avisoMin = opciones.avisoMinutos == null ? 60 : opciones.avisoMinutos;
    const secuencia = opciones.secuencia || 0;
    const sello = opciones.sello || `${hoyISO().replace(/-/g, '')}T000000Z`;

    const lineas = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//applibre//TurnoLibre//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escaparICS(opciones.nombre || 'Mis turnos')}`,
    ];

    for (const d of dias) {
      if (!d.trabaja || !d.tipo || !d.tipo.entrada) continue;

      const cruzaMedianoche = aMinutos(d.tipo.salida) <= aMinutos(d.tipo.entrada);
      const fechaFin = cruzaMedianoche ? sumarDias(d.fecha, 1) : d.fecha;

      lineas.push('BEGIN:VEVENT');
      lineas.push(`UID:${d.fecha}@turnolibre.applibre`);
      lineas.push(`SEQUENCE:${secuencia}`);
      lineas.push(`DTSTAMP:${sello}`);
      lineas.push(`DTSTART:${selloLocal(d.fecha, d.tipo.entrada)}`);
      lineas.push(`DTEND:${selloLocal(fechaFin, d.tipo.salida)}`);
      lineas.push(plegar(`SUMMARY:${escaparICS(d.tipo.nombre)}`));
      if (d.nota) lineas.push(plegar(`DESCRIPTION:${escaparICS(d.nota)}`));
      lineas.push('TRANSP:OPAQUE');

      if (avisoMin > 0) {
        lineas.push('BEGIN:VALARM');
        lineas.push('ACTION:DISPLAY');
        lineas.push(plegar(`DESCRIPTION:${escaparICS(d.tipo.nombre)}`));
        lineas.push(`TRIGGER;RELATED=START:-PT${avisoMin}M`);
        lineas.push('END:VALARM');
      }
      lineas.push('END:VEVENT');
    }

    lineas.push('END:VCALENDAR');
    return lineas.join('\r\n') + '\r\n';
  };

  /* ---------- patrones de fábrica ----------
     Puntos de partida, no jaulas: cualquiera se puede editar. */

  const PATRONES = [
    { id: 'rodado', nombre: 'Turno rodado', pista: '2 mañanas, 2 tardes, 2 noches, 2 libres',
      secuencia: ['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L'] },
    { id: '7x7', nombre: '7 x 7', pista: '7 días seguidos, 7 de descanso',
      secuencia: ['M', 'M', 'M', 'M', 'M', 'M', 'M', 'L', 'L', 'L', 'L', 'L', 'L', 'L'] },
    { id: '6x4', nombre: '6 x 4', pista: '6 trabajados rotando, 4 libres',
      secuencia: ['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L', 'L', 'L'] },
    { id: '2x2-12h', nombre: '2 x 2 de 12 horas', pista: '2 días, 2 noches, 4 libres',
      secuencia: ['D', 'D', 'N12', 'N12', 'L', 'L', 'L', 'L'] },
    { id: '5x2', nombre: 'Semana fija', pista: 'De lunes a viernes, mañana',
      secuencia: ['M', 'M', 'M', 'M', 'M', 'L', 'L'] },
    { id: 'mt', nombre: 'Mañana y tarde', pista: 'Una semana de cada',
      secuencia: ['M', 'M', 'M', 'M', 'M', 'L', 'L', 'T', 'T', 'T', 'T', 'T', 'L', 'L'] },
  ];

  const TIPOS_BASE = [
    { id: 'M', nombre: 'Mañana', abrev: 'MAÑ', color: '#C2761A', entrada: '07:00', salida: '15:00' },
    { id: 'T', nombre: 'Tarde', abrev: 'TAR', color: '#17708C', entrada: '15:00', salida: '23:00' },
    { id: 'N', nombre: 'Noche', abrev: 'NOC', color: '#4A4A8F', entrada: '23:00', salida: '07:00', nocturno: true },
    { id: 'D', nombre: 'Día 12 h', abrev: 'DÍA', color: '#1E7A5A', entrada: '08:00', salida: '20:00' },
    { id: 'N12', nombre: 'Noche 12 h', abrev: 'N12', color: '#5B3A82', entrada: '20:00', salida: '08:00', nocturno: true },
    { id: 'L', nombre: 'Libre', abrev: '', color: '#9AA0AA', libre: true },
  ];

  /* ---------- descubrir una rotación mirándola ----------
     Mucha gente no tiene rotación: le ponen el cuadrante cada semana.
     Para esos, pintar los días es la única forma que funciona. Pero
     quien SÍ rota no tiene por qué saber describir su ciclo, así que
     en vez de preguntárselo, se mira lo que ha pintado y se busca la
     repetición. Solo se propone si se repite entera al menos dos
     veces: con menos, sería adivinar. */

  const detectarCiclo = (ids) => {
    // fuera los huecos de los extremos: el ciclo empieza donde empieza lo pintado
    let ini = 0;
    let fin = ids.length;
    while (ini < fin && ids[ini] == null) ini++;
    while (fin > ini && ids[fin - 1] == null) fin--;

    const s = ids.slice(ini, fin);
    const n = s.length;
    if (n < 2) return null;
    if (s.some((x) => x == null)) return null;      // con huecos dentro no se afirma nada
    if (s.every((x) => x === s[0])) return null;    // todo igual no es una rotación

    for (let p = 2; p <= Math.floor(n / 2); p++) {
      let cuadra = true;
      for (let i = p; i < n; i++) {
        if (s[i] !== s[i - p]) { cuadra = false; break; }
      }
      if (cuadra) return { periodo: p, desplazamiento: ini, secuencia: s.slice(0, p) };
    }
    return null;
  };

  /** Para cada día del ciclo, en qué punto de su racha está.
      En "2 mañanas, 2 tardes, 2 noches, 2 libres" hay dos días que
      ponen "Mañana": este cálculo permite llamarlos «1 de 2» y
      «2 de 2», que es lo único que los distingue para quien elige. */
  const rachasDeCiclo = (secuencia) => {
    const n = (secuencia || []).length;
    if (!n) return [];
    const todosIguales = secuencia.every((x) => x === secuencia[0]);

    return secuencia.map((id, i) => {
      if (todosIguales) return { pos: i, tipoId: id, enRacha: i + 1, deRacha: n };
      let atras = 0;
      while (secuencia[(((i - atras - 1) % n) + n) % n] === id) atras++;
      let alante = 0;
      while (secuencia[(((i + alante + 1) % n) + n) % n] === id) alante++;
      return { pos: i, tipoId: id, enRacha: atras + 1, deRacha: atras + alante + 1 };
    });
  };

  /** Solo los tipos que un patrón usa, más el libre. */
  const tiposDePatron = (secuencia) => {
    const usados = new Set([...secuencia, 'L']);
    return TIPOS_BASE.filter((t) => usados.has(t.id)).map((t) => ({ ...t }));
  };

  return {
    // fechas
    aISO, hoyISO, deISO, diasEntre, sumarDias, diaSemana,
    esBisiesto, diasDelAnio, diasDelMes, nombreMes, fechaLarga, fechaCorta, MESES, DIAS,
    // horas
    r2, horasEntre, horasDeTipo, tipoPorId,
    // patrón y días
    turnoDePatron, diaDe, diasDeMes, diasEntreFechas, rejillaDeMes, rachasDeCiclo, detectarCiclo,
    // recuentos
    resumen, horasContratoDe, saldoDeMes, saldoDeAnio,
    // exportar
    generarICS,
    // catálogos
    PATRONES, TIPOS_BASE, tiposDePatron,
  };
})();

/* Para poder probarlo con Node sin navegador. */
if (typeof module !== 'undefined' && module.exports) module.exports = Dominio;
