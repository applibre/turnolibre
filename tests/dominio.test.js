/* Pruebas del dominio de TurnoLibre.
   Se ejecutan con:  node --test tests/
   No hacen falta librerías: Node trae corredor y aserciones. */

const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/dominio.js');

/* ---------- datos de ejemplo: una enfermera a turno rodado ---------- */

const tipos = D.tiposDePatron(['M', 'T', 'N']);
const base = {
  ajustes: { horasContrato: { tipo: 'semanal', valor: 37.5 } },
  tiposTurno: tipos,
  patron: { secuencia: ['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L'], ancla: '2026-09-01' },
  excepciones: {},
  festivos: ['2026-10-12', '2026-12-25'],
};

/* ================= fechas ================= */

test('contar días no se descuadra con el cambio de hora', () => {
  // en España el reloj cambia la madrugada del 25 de octubre de 2026
  assert.strictEqual(D.diasEntre('2026-10-24', '2026-10-26'), 2);
  // y en marzo, en el otro sentido
  assert.strictEqual(D.diasEntre('2026-03-28', '2026-03-30'), 2);
});

test('contar días cruza el fin de año y admite fechas anteriores', () => {
  assert.strictEqual(D.diasEntre('2026-12-30', '2027-01-02'), 3);
  assert.strictEqual(D.diasEntre('2026-09-10', '2026-09-01'), -9);
});

test('sumar días respeta meses cortos y años bisiestos', () => {
  assert.strictEqual(D.sumarDias('2026-01-31', 1), '2026-02-01');
  assert.strictEqual(D.sumarDias('2028-02-28', 1), '2028-02-29'); // 2028 es bisiesto
  assert.strictEqual(D.sumarDias('2026-02-28', 1), '2026-03-01');
  assert.strictEqual(D.sumarDias('2026-01-01', -1), '2025-12-31');
});

test('la semana empieza en lunes', () => {
  assert.strictEqual(D.diaSemana('2026-09-14'), 1); // lunes
  assert.strictEqual(D.diaSemana('2026-09-20'), 7); // domingo
});

test('los años bisiestos se cuentan bien', () => {
  assert.strictEqual(D.diasDelAnio(2026), 365);
  assert.strictEqual(D.diasDelAnio(2028), 366);
  assert.strictEqual(D.esBisiesto(2100), false); // secular no divisible por 400
  assert.strictEqual(D.esBisiesto(2000), true);
});

/* ================= horas ================= */

test('un turno normal dura lo que separa entrada y salida', () => {
  assert.strictEqual(D.horasEntre('07:00', '15:00'), 8);
  assert.strictEqual(D.horasEntre('08:30', '14:00'), 5.5);
});

test('el turno de noche cruza la medianoche y sigue durando 8 horas', () => {
  assert.strictEqual(D.horasEntre('23:00', '07:00'), 8);
  assert.strictEqual(D.horasEntre('22:00', '06:00'), 8);
});

test('una guardia de 24 horas no sale de cero', () => {
  assert.strictEqual(D.horasEntre('08:00', '08:00'), 24);
});

test('un turno libre no suma horas aunque tenga horario', () => {
  assert.strictEqual(D.horasDeTipo({ id: 'L', libre: true, entrada: '07:00', salida: '15:00' }), 0);
  assert.strictEqual(D.horasDeTipo(null), 0);
});

/* ================= el patrón ================= */

test('el patrón se repite desde su día de anclaje', () => {
  assert.strictEqual(D.turnoDePatron('2026-09-01', base.patron), 'M');
  assert.strictEqual(D.turnoDePatron('2026-09-02', base.patron), 'M');
  assert.strictEqual(D.turnoDePatron('2026-09-03', base.patron), 'T');
  assert.strictEqual(D.turnoDePatron('2026-09-05', base.patron), 'N');
  assert.strictEqual(D.turnoDePatron('2026-09-07', base.patron), 'L');
  // y a la vuelta del ciclo, ocho días después, vuelve a empezar
  assert.strictEqual(D.turnoDePatron('2026-09-09', base.patron), 'M');
});

test('el patrón también funciona hacia atrás del día de anclaje', () => {
  // el día anterior al ancla es el último de la secuencia
  assert.strictEqual(D.turnoDePatron('2026-08-31', base.patron), 'L');
  // ocho días antes del ancla se cierra un ciclo completo: vuelve el primero
  assert.strictEqual(D.turnoDePatron('2026-08-24', base.patron), 'M');
  assert.strictEqual(D.turnoDePatron('2026-08-23', base.patron), 'L');
});

test('el patrón no se descuadra al pasar un año entero', () => {
  const n = base.patron.secuencia.length;
  const dias = D.diasEntre('2026-09-01', '2027-09-01'); // 365
  const esperado = base.patron.secuencia[dias % n];
  assert.strictEqual(D.turnoDePatron('2027-09-01', base.patron), esperado);
});

test('sin patrón no revienta', () => {
  assert.strictEqual(D.turnoDePatron('2026-09-01', null), null);
  assert.strictEqual(D.turnoDePatron('2026-09-01', { secuencia: [], ancla: '2026-09-01' }), null);
});

/* ================= un día resuelto ================= */

test('un día del patrón trae su turno, sus horas y su contexto', () => {
  const d = D.diaDe('2026-09-05', base); // noche
  assert.strictEqual(d.tipoId, 'N');
  assert.strictEqual(d.horasPrevistas, 8);
  assert.strictEqual(d.horasReales, 8);
  assert.strictEqual(d.extra, 0);
  assert.strictEqual(d.nocturno, true);
  assert.strictEqual(d.trabaja, true);
});

test('un día libre no trabaja ni suma', () => {
  const d = D.diaDe('2026-09-07', base);
  assert.strictEqual(d.tipoId, 'L');
  assert.strictEqual(d.horasReales, 0);
  assert.strictEqual(d.trabaja, false);
});

test('una excepción de horas cuenta lo real y marca la diferencia', () => {
  const datos = { ...base, excepciones: { '2026-09-01': { horasReales: 10, nota: 'no llegó el relevo' } } };
  const d = D.diaDe('2026-09-01', datos);
  assert.strictEqual(d.horasPrevistas, 8);
  assert.strictEqual(d.horasReales, 10);
  assert.strictEqual(d.extra, 2);
  assert.strictEqual(d.ajustado, true);
  assert.strictEqual(d.nota, 'no llegó el relevo');
});

test('una excepción de turno sustituye al patrón sin romper los días siguientes', () => {
  const datos = { ...base, excepciones: { '2026-09-01': { tipoId: 'T' } } };
  assert.strictEqual(D.diaDe('2026-09-01', datos).tipoId, 'T');
  assert.strictEqual(D.diaDe('2026-09-01', datos).cambiado, true);
  // el día siguiente sigue siendo el que dice el patrón
  assert.strictEqual(D.diaDe('2026-09-02', datos).tipoId, 'M');
});

test('trabajar un día libre se registra como trabajado', () => {
  const datos = { ...base, excepciones: { '2026-09-07': { tipoId: 'M' } } };
  const d = D.diaDe('2026-09-07', datos);
  assert.strictEqual(d.trabaja, true);
  assert.strictEqual(d.horasReales, 8);
});

test('los festivos y los domingos se marcan', () => {
  const d = D.diaDe('2026-10-12', base); // fiesta nacional, lunes
  assert.strictEqual(d.festivo, true);
  assert.strictEqual(D.diaDe('2026-09-20', base).domingo, true);
});

/* ================= el mes ================= */

test('el mes trae todos sus días y ninguno más', () => {
  assert.strictEqual(D.diasDeMes(2026, 9, base).length, 30);
  assert.strictEqual(D.diasDeMes(2026, 2, base).length, 28);
  assert.strictEqual(D.diasDeMes(2028, 2, base).length, 29);
});

test('la rejilla son semanas completas que empiezan en lunes', () => {
  const r = D.rejillaDeMes(2026, 9, base);
  assert.strictEqual(r.length % 7, 0);
  assert.strictEqual(D.diaSemana(r[0].fecha), 1);
  assert.strictEqual(D.diaSemana(r[r.length - 1].fecha), 7);
  // el 1 de septiembre de 2026 es martes: sobra un día de relleno delante
  assert.strictEqual(r[0].relleno, true);
  assert.strictEqual(r[1].fecha, '2026-09-01');
  assert.strictEqual(r[1].relleno, false);
  assert.strictEqual(r.filter((d) => !d.relleno).length, 30);
});

/* ================= recuentos ================= */

test('el resumen suma horas, noches, festivos y domingos', () => {
  const dias = D.diasDeMes(2026, 9, base);
  const r = D.resumen(dias);
  // el ciclo de 8 días tiene 6 de trabajo; en 30 días caben 3 ciclos
  // enteros (18) y 6 días más que caen todos en trabajo: 24
  assert.strictEqual(r.diasTrabajados, 24);
  assert.strictEqual(r.horasReales, 192);
  assert.strictEqual(r.horasPrevistas, 192);
  assert.strictEqual(r.diferencia, 0);
  assert.ok(r.noches > 0);
});

test('el resumen recoge las horas de más de una excepción', () => {
  const datos = { ...base, excepciones: { '2026-09-01': { horasReales: 10 } } };
  const r = D.resumen(D.diasDeMes(2026, 9, datos));
  assert.strictEqual(r.horasReales, 194);
  assert.strictEqual(r.diferencia, 2);
});

test('las horas de contrato se prorratean por días', () => {
  // 37,5 h semanales en un mes de 30 días
  assert.strictEqual(D.horasContratoDe(base.ajustes, 30, 2026), 160.71);
  // y en el año entero dan las semanales por 52,14
  const anual = D.horasContratoDe(base.ajustes, 365, 2026);
  assert.ok(Math.abs(anual - 37.5 * 365 / 7) < 0.01);
});

test('las tres formas de declarar el contrato dan el mismo año', () => {
  const sem = D.horasContratoDe({ horasContrato: { tipo: 'semanal', valor: 37.5 } }, 365, 2026);
  const anu = D.horasContratoDe({ horasContrato: { tipo: 'anual', valor: sem } }, 365, 2026);
  const men = D.horasContratoDe({ horasContrato: { tipo: 'mensual', valor: sem / 12 } }, 365, 2026);
  assert.ok(Math.abs(anu - sem) < 0.05);
  assert.ok(Math.abs(men - sem) < 0.05);
});

test('sin contrato declarado no se inventa un saldo', () => {
  const datos = { ...base, ajustes: {} };
  const s = D.saldoDeMes(2026, 9, datos);
  assert.strictEqual(s.horasContrato, null);
  assert.strictEqual(s.saldo, null);
});

test('el saldo del mes es lo real menos lo contratado', () => {
  const s = D.saldoDeMes(2026, 9, base);
  assert.strictEqual(s.horasReales, 192);
  assert.strictEqual(s.horasContrato, 160.71);
  assert.strictEqual(s.saldo, D.r2(192 - 160.71));
});

test('el saldo del año cuadra con la suma de sus meses', () => {
  const a = D.saldoDeAnio(2026, base);
  assert.strictEqual(a.meses.length, 12);
  const suma = D.r2(a.meses.reduce((x, m) => x + m.horasReales, 0));
  assert.strictEqual(a.horasReales, suma);
  const dias = a.meses.reduce((x, m) => x + m.dias, 0);
  assert.strictEqual(dias, 365);
});

/* ================= sin rotación fija =================
   Mucha gente no rota: le ponen el cuadrante cada semana, cubre huecos,
   hace unas mañanas y unas tardes sin orden. La app tiene que servirles
   igual, así que todo debe funcionar con patron = null. */

const suelto = {
  ajustes: { horasContrato: { tipo: 'semanal', valor: 40 } },
  tiposTurno: D.tiposDePatron(['M', 'T', 'N']),
  patron: null,
  excepciones: {
    '2026-09-02': { tipoId: 'M' },
    '2026-09-03': { tipoId: 'T' },
    '2026-09-07': { tipoId: 'N' },
    '2026-09-08': { tipoId: 'M', horasReales: 10, nota: 'refuerzo' },
    '2026-09-15': { tipoId: 'T' },
  },
  festivos: [],
};

test('sin rotación, un día sin poner no es un día trabajado', () => {
  const d = D.diaDe('2026-09-01', suelto);
  assert.strictEqual(d.tipoId, null);
  assert.strictEqual(d.tipo, null);
  assert.strictEqual(d.trabaja, false);
  assert.strictEqual(d.horasReales, 0);
});

test('sin rotación, los días puestos a mano mandan', () => {
  assert.strictEqual(D.diaDe('2026-09-02', suelto).tipoId, 'M');
  assert.strictEqual(D.diaDe('2026-09-02', suelto).horasReales, 8);
  assert.strictEqual(D.diaDe('2026-09-07', suelto).nocturno, true);
  assert.strictEqual(D.diaDe('2026-09-08', suelto).horasReales, 10);
  assert.strictEqual(D.diaDe('2026-09-08', suelto).extra, 2);
});

test('sin rotación, el mes suma solo lo puesto', () => {
  const r = D.resumen(D.diasDeMes(2026, 9, suelto));
  assert.strictEqual(r.diasTrabajados, 5);
  assert.strictEqual(r.horasReales, 42);   // 8+8+8+10+8
  assert.strictEqual(r.noches, 1);
});

test('sin rotación, el contrato y el saldo siguen saliendo', () => {
  const s = D.saldoDeMes(2026, 9, suelto);
  assert.strictEqual(s.horasContrato, D.r2(40 / 7 * 30));
  assert.strictEqual(s.saldo, D.r2(42 - 40 / 7 * 30));
});

test('sin rotación, el calendario exportado sale igual', () => {
  const ics = D.generarICS(D.diasDeMes(2026, 9, suelto), { sello: '20260821T000000Z' });
  assert.strictEqual(ics.split('BEGIN:VEVENT').length - 1, 5);
  assert.ok(ics.includes('UID:2026-09-08@turnolibre.applibre'));
});

test('la rejilla no revienta sin rotación', () => {
  const r = D.rejillaDeMes(2026, 9, suelto);
  assert.strictEqual(r.length % 7, 0);
  assert.strictEqual(r.filter((d) => d.tipoId).length, 5);
});

/* ---------- descubrir la rotación mirándola ---------- */

test('reconoce una rotación que se repite entera dos veces', () => {
  const c = D.detectarCiclo(['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L', 'M', 'M', 'T', 'T', 'N', 'N', 'L', 'L']);
  assert.strictEqual(c.periodo, 8);
  assert.deepStrictEqual(c.secuencia, ['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L']);
});

test('devuelve el ciclo más corto que encaje', () => {
  assert.strictEqual(D.detectarCiclo(['M', 'L', 'M', 'L', 'M', 'L', 'M', 'L']).periodo, 2);
});

test('no adivina con menos de dos repeticiones enteras', () => {
  assert.strictEqual(D.detectarCiclo(['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L', 'M', 'M', 'T', 'T']), null);
});

test('no adivina si de verdad es aleatorio', () => {
  assert.strictEqual(D.detectarCiclo(['M', 'T', 'N', 'L', 'T', 'M', 'L', 'N']), null);
  assert.strictEqual(D.detectarCiclo(['M', 'M', 'T', 'M', 'N', 'T', 'M', 'L']), null);
});

test('no adivina si hay días sin poner en medio', () => {
  assert.strictEqual(D.detectarCiclo(['M', 'L', null, 'M', 'L']), null);
});

test('ignora los días sin poner de los extremos y dice dónde empieza', () => {
  const c = D.detectarCiclo([null, null, 'M', 'L', 'M', 'L', null]);
  assert.strictEqual(c.periodo, 2);
  assert.strictEqual(c.desplazamiento, 2);
});

test('todo el mismo turno no se considera una rotación', () => {
  assert.strictEqual(D.detectarCiclo(['M', 'M', 'M', 'M', 'M', 'M']), null);
});

test('lo detectado reproduce exactamente lo que se pintó', () => {
  const pintado = ['M', 'M', 'M', 'M', 'M', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'L', 'L'];
  const c = D.detectarCiclo(pintado);
  const patron = { secuencia: c.secuencia, ancla: '2026-09-01' };
  pintado.forEach((esperado, i) => {
    assert.strictEqual(D.turnoDePatron(D.sumarDias('2026-09-01', i), patron), esperado);
  });
});

/* ================= lo proyectado no cuenta =================
   El patrón se puede pintar hacia atrás sin fin, pero las horas de
   antes de empezar a usar la app son una suposición, no un registro.
   Si se sumaran, la app estaría inventando historial. */

test('los días anteriores al inicio se pintan pero no cuentan', () => {
  const datos = { ...base, desde: '2026-09-15' };
  assert.strictEqual(D.diaDe('2026-09-14', datos).cuenta, false);
  assert.strictEqual(D.diaDe('2026-09-15', datos).cuenta, true);
  // el turno sigue calculándose: en el calendario se ve
  assert.strictEqual(D.diaDe('2026-09-14', datos).tipoId, 'N');
});

test('sin fecha de inicio cuentan todos los días', () => {
  assert.strictEqual(D.diaDe('2020-01-01', base).cuenta, true);
});

test('el resumen ignora los días proyectados', () => {
  const todo = D.resumen(D.diasDeMes(2026, 9, base));
  const medio = D.resumen(D.diasDeMes(2026, 9, { ...base, desde: '2026-09-15' }));
  assert.strictEqual(todo.diasContados, 30);
  assert.strictEqual(medio.diasContados, 16);
  assert.ok(medio.horasReales < todo.horasReales);
  assert.ok(medio.noches < todo.noches);
});

test('el contrato se prorratea solo por los días que cuentan', () => {
  const s = D.saldoDeMes(2026, 9, { ...base, desde: '2026-09-15' });
  assert.strictEqual(s.diasContados, 16);
  assert.strictEqual(s.horasContrato, D.r2(37.5 / 7 * 16));
});

test('un mes entero anterior al inicio no inventa ni saldo ni contrato', () => {
  const s = D.saldoDeMes(2026, 3, { ...base, desde: '2026-09-01' });
  assert.strictEqual(s.diasContados, 0);
  assert.strictEqual(s.horasReales, 0);
  assert.strictEqual(s.horasContrato, null);
  assert.strictEqual(s.saldo, null);
});

test('el año solo cuenta desde el inicio, no desde enero', () => {
  const a = D.saldoDeAnio(2026, { ...base, desde: '2026-09-01' });
  // de septiembre a diciembre: 30+31+30+31
  assert.strictEqual(a.diasContados, 122);
  assert.strictEqual(a.horasContrato, D.r2(37.5 / 7 * 122));
});

/* ================= calendario para el móvil ================= */

const diasICS = D.diasDeMes(2026, 9, base);

test('el calendario exportado tiene envoltura válida', () => {
  const ics = D.generarICS(diasICS, { sello: '20260821T000000Z' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0'));
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
  assert.ok(ics.includes('\r\n'), 'el formato exige fin de línea CRLF');
});

test('solo se exportan los días trabajados', () => {
  const ics = D.generarICS(diasICS, { sello: '20260821T000000Z' });
  const eventos = ics.split('BEGIN:VEVENT').length - 1;
  assert.strictEqual(eventos, 24);
});

test('el identificador de cada evento es su fecha, para que actualice en vez de duplicar', () => {
  const ics = D.generarICS(diasICS, { sello: '20260821T000000Z' });
  assert.ok(ics.includes('UID:2026-09-01@turnolibre.applibre'));
  const uids = ics.match(/UID:.+/g);
  assert.strictEqual(new Set(uids).size, uids.length, 'no puede haber identificadores repetidos');
});

test('cambiar un turno mantiene el identificador y sube la secuencia', () => {
  const datos = { ...base, excepciones: { '2026-09-01': { tipoId: 'T' } } };
  const ics = D.generarICS(D.diasDeMes(2026, 9, datos), { secuencia: 3, sello: '20260821T000000Z' });
  assert.ok(ics.includes('UID:2026-09-01@turnolibre.applibre'));
  assert.ok(ics.includes('SEQUENCE:3'));
  assert.ok(ics.includes('SUMMARY:Tarde'));
});

test('el turno de noche termina al día siguiente', () => {
  const ics = D.generarICS([D.diaDe('2026-09-05', base)], { sello: '20260821T000000Z' });
  assert.ok(ics.includes('DTSTART:20260905T230000'));
  assert.ok(ics.includes('DTEND:20260906T070000'));
});

test('el turno de mañana empieza y acaba el mismo día', () => {
  const ics = D.generarICS([D.diaDe('2026-09-01', base)], { sello: '20260821T000000Z' });
  assert.ok(ics.includes('DTSTART:20260901T070000'));
  assert.ok(ics.includes('DTEND:20260901T150000'));
});

test('cada evento lleva su aviso, y se puede quitar', () => {
  const con = D.generarICS([D.diaDe('2026-09-01', base)], { sello: '20260821T000000Z' });
  assert.ok(con.includes('BEGIN:VALARM'));
  assert.ok(con.includes('TRIGGER;RELATED=START:-PT60M'));

  const otro = D.generarICS([D.diaDe('2026-09-01', base)], { avisoMinutos: 15, sello: '20260821T000000Z' });
  assert.ok(otro.includes('TRIGGER;RELATED=START:-PT15M'));

  const sin = D.generarICS([D.diaDe('2026-09-01', base)], { avisoMinutos: 0, sello: '20260821T000000Z' });
  assert.ok(!sin.includes('BEGIN:VALARM'));
});

test('las notas con comas y saltos no rompen el fichero', () => {
  const datos = { ...base, excepciones: { '2026-09-01': { nota: 'cambio con Ana; llamar, avisar\nal turno' } } };
  const ics = D.generarICS([D.diaDe('2026-09-01', datos)], { sello: '20260821T000000Z' });
  assert.ok(ics.includes('\\;'));
  assert.ok(ics.includes('\\,'));
  assert.ok(ics.includes('\\n'));
  // y ninguna línea del fichero se sale del límite del formato
  for (const l of ics.split('\r\n')) assert.ok(l.length <= 75, `línea demasiado larga: ${l}`);
});

test('una nota larga con acentos se pliega por bytes, no por letras', () => {
  const nota = 'Guardia de refuerzo en la unidad de reanimación posquirúrgica; '
    + 'sustitución de María jiménez por baja médica añadida en el último momento';
  const datos = { ...base, excepciones: { '2026-09-01': { nota } } };
  const ics = D.generarICS([D.diaDe('2026-09-01', datos)], { sello: '20260821T000000Z' });

  for (const l of ics.split('\r\n')) {
    const bytes = Buffer.byteLength(l, 'utf8');
    assert.ok(bytes <= 75, `línea de ${bytes} octetos: ${l}`);
  }
  // y el texto sobrevive intacto al desplegarlo
  const desplegado = ics.replace(/\r\n /g, '');
  assert.ok(desplegado.includes('reanimación posquir'));
  assert.ok(desplegado.includes('médica'));
});

test('un emoji no se parte por la mitad al plegar', () => {
  const nota = '🚑'.repeat(40);
  const datos = { ...base, excepciones: { '2026-09-01': { nota } } };
  const ics = D.generarICS([D.diaDe('2026-09-01', datos)], { sello: '20260821T000000Z' });
  assert.ok(!ics.includes('�'), 'se ha partido un carácter');
  const desplegado = ics.replace(/\r\n /g, '');
  assert.ok(desplegado.includes(nota));
});

/* ================= catálogos ================= */

test('todos los patrones de fábrica usan tipos que existen', () => {
  const ids = new Set(D.TIPOS_BASE.map((t) => t.id));
  for (const p of D.PATRONES) {
    assert.ok(p.secuencia.length > 0, `${p.id} sin secuencia`);
    for (const id of p.secuencia) assert.ok(ids.has(id), `${p.id} usa un turno inexistente: ${id}`);
  }
});

test('cada patrón de fábrica deja días libres', () => {
  for (const p of D.PATRONES) {
    assert.ok(p.secuencia.includes('L'), `${p.id} no descansa nunca`);
  }
});

test('los tipos de un patrón incluyen siempre el libre', () => {
  const t = D.tiposDePatron(['M', 'N']);
  assert.deepStrictEqual(t.map((x) => x.id).sort(), ['L', 'M', 'N']);
});
