/* ===========================================================
   TurnoLibre · llevárselo fuera
   Tres salidas: el calendario del móvil (que es quien sabe avisar),
   un parte de horas para imprimir o llevar al sindicato, y una copia
   completa de los datos, que es la única red de seguridad de verdad.
   =========================================================== */
const Exportar = (() => {
  'use strict';

  const { esc } = UI;

  /* ---------- descargar un fichero ---------- */

  function bajar(nombre, texto, tipo) {
    const blob = new Blob([texto], { type: `${tipo};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  const soportaCompartir = () => !!(navigator.canShare && navigator.share);

  /** En el móvil, compartir suele ser más útil que descargar (va directo
      al calendario, a Drive o a WhatsApp). Si no se puede, se descarga. */
  async function entregar(nombre, texto, tipo) {
    if (soportaCompartir()) {
      try {
        const fichero = new File([texto], nombre, { type: tipo });
        if (navigator.canShare({ files: [fichero] })) {
          await navigator.share({ files: [fichero], title: nombre });
          return 'compartido';
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelado';
      }
    }
    bajar(nombre, texto, tipo);
    return 'descargado';
  }

  /* ---------- calendario del móvil ---------- */

  async function calendario(desde, hasta) {
    const datos = Estado.paraDominio();
    const dias = Dominio.diasEntreFechas(desde, hasta, datos);

    // La secuencia sube en cada exportación: así el calendario del
    // teléfono reconoce que es el mismo evento y lo actualiza.
    let secuencia = 0;
    Estado.cambiar((d) => { d.secuenciaICS = (d.secuenciaICS || 0) + 1; secuencia = d.secuenciaICS; });
    Estado.guardarYa();

    const ics = Dominio.generarICS(dias, {
      avisoMinutos: Estado.leer().ajustes.avisoMinutos,
      secuencia,
      nombre: 'Mis turnos',
    });

    return entregar(`turnos-${desde}.ics`, ics, 'text/calendar');
  }

  /* ---------- parte de horas para imprimir ---------- */

  function parteDeHoras(anio, mes) {
    const datos = Estado.paraDominio();
    const nombre = (Estado.leer().ajustes.nombre || '').trim();

    const unMes = mes != null;
    const dias = unMes
      ? Dominio.diasDeMes(anio, mes, datos)
      : Dominio.diasEntreFechas(`${anio}-01-01`, `${anio}-12-31`, datos);
    // Al parte solo van los días que cuentan: es un registro, no una
    // proyección hacia atrás del patrón.
    const trabajados = dias.filter((d) => d.trabaja && d.cuenta !== false);
    const r = Dominio.resumen(dias);
    const contrato = Dominio.horasContratoDe(datos.ajustes, r.diasContados, anio);
    const saldo = contrato === null ? null : Dominio.r2(r.horasReales - contrato);

    const titulo = unMes
      ? `${Dominio.nombreMes(mes)} de ${anio}`
      : `Año ${anio}`;

    const filas = trabajados.map((d) => `
      <tr>
        <td>${esc(Dominio.fechaLarga(d.fecha))}</td>
        <td>${esc(d.tipo ? d.tipo.nombre : '')}</td>
        <td class="n">${d.tipo && d.tipo.entrada ? esc(d.tipo.entrada + '–' + d.tipo.salida) : ''}</td>
        <td class="n">${d.horasPrevistas}</td>
        <td class="n${d.extra > 0.01 ? ' ojo' : ''}">${d.horasReales}</td>
        <td>${[d.festivo ? 'festivo' : '', d.domingo ? 'domingo' : '', d.nocturno ? 'noche' : '', esc(d.nota)]
          .filter(Boolean).join(' · ')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Parte de horas · ${esc(titulo)}</title>
<style>
  @page { margin: 16mm; }
  body { font: 11pt/1.45 Georgia, "Times New Roman", serif; color: #111; margin: 0; }
  h1 { font-size: 17pt; margin: 0 0 2px; }
  .sub { color: #555; font-size: 10pt; margin: 0 0 18px; }
  .totales { display: flex; gap: 26px; flex-wrap: wrap; border-top: 2px solid #111;
             border-bottom: 1px solid #999; padding: 10px 0; margin-bottom: 16px; }
  .totales div span { display: block; font-size: 8.5pt; text-transform: uppercase;
                      letter-spacing: .06em; color: #666; }
  .totales div b { font-size: 15pt; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
  th { text-align: left; border-bottom: 1px solid #111; padding: 5px 6px;
       font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; }
  td { border-bottom: 1px solid #ddd; padding: 4px 6px; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  td.ojo { font-weight: bold; }
  tfoot td { border-top: 2px solid #111; border-bottom: 0; font-weight: bold; padding-top: 7px; }
  .nota { margin-top: 20px; font-size: 8.5pt; color: #555; line-height: 1.5;
          border-top: 1px solid #ccc; padding-top: 10px; }
</style></head><body>

<h1>Parte de horas · ${esc(titulo)}</h1>
<p class="sub">${nombre ? esc(nombre) + ' · ' : ''}generado el ${esc(Dominio.fechaLarga(Dominio.hoyISO()))}</p>

<div class="totales">
  <div><span>Horas trabajadas</span><b>${r.horasReales}</b></div>
  <div><span>Según contrato</span><b>${contrato === null ? '—' : contrato}</b></div>
  <div><span>Diferencia</span><b>${saldo === null ? '—' : (saldo > 0 ? '+' : '') + saldo}</b></div>
  <div><span>Días</span><b>${r.diasTrabajados}</b></div>
  <div><span>Noches</span><b>${r.noches}</b></div>
  <div><span>Festivos</span><b>${r.festivos}</b></div>
  <div><span>Domingos</span><b>${r.domingos}</b></div>
</div>

<table>
  <thead><tr><th>Día</th><th>Turno</th><th>Horario</th><th>Previstas</th><th>Reales</th><th>Observaciones</th></tr></thead>
  <tbody>${filas}</tbody>
  <tfoot><tr><td colspan="3">Total</td><td class="n">${r.horasPrevistas}</td><td class="n">${r.horasReales}</td><td></td></tr></tfoot>
</table>

<p class="nota"><b>Sobre este documento.</b> Es un registro personal, elaborado por quien lo firma
a partir de su propio cuadrante. No es un certificado de empresa ni sustituye al registro de jornada
que la empresa está obligada a llevar: sirve como indicio, que es justo lo que se pide para poder
reclamar. Generado con TurnoLibre, software libre — applibre.github.io/turnolibre</p>

<script>window.onload = () => setTimeout(() => window.print(), 250);<\/script>
</body></html>`;

    const v = window.open('', '_blank');
    if (!v) return false;
    v.document.write(html);
    v.document.close();
    return true;
  }

  /* ---------- copia completa ---------- */

  function copiaSeguridad() {
    const d = Estado.leer();
    const texto = JSON.stringify({ ...d, exportado: Dominio.hoyISO(), app: 'turnolibre' }, null, 2);
    return entregar(`turnolibre-${Dominio.hoyISO()}.json`, texto, 'application/json');
  }

  function restaurar(texto) {
    let d;
    try { d = JSON.parse(texto); } catch (_) { return { ok: false, por: 'El fichero no se puede leer' }; }
    if (!d || typeof d !== 'object') return { ok: false, por: 'El fichero no tiene el formato esperado' };
    if (!d.patron && !Object.keys(d.excepciones || {}).length) {
      return { ok: false, por: 'El fichero no parece una copia de TurnoLibre' };
    }
    Estado.reemplazar(d);
    return { ok: true };
  }

  return { calendario, parteDeHoras, copiaSeguridad, restaurar, entregar, soportaCompartir };
})();
