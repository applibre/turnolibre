/* ===========================================================
   TurnoLibre · vista del mes
   La pantalla principal. Abrirla ya es ver si trabajas el 14:
   eso no debe costar ni un toque.
   =========================================================== */
const Mes = (() => {
  'use strict';

  const { $, esc, hoja, cerrarHoja, tosti, vibrar, horas } = UI;

  let anio, mes;

  const hoy = () => Dominio.hoyISO();

  function iniciar() {
    const h = Dominio.deISO(hoy());
    anio = h.getFullYear();
    mes = h.getMonth() + 1;

    $('#mes-antes').onclick = () => mover(-1);
    $('#mes-despues').onclick = () => mover(1);
    $('#mes-titulo').onclick = irAHoy;

    Estado.escuchar(() => { if ($('#p-mes').classList.contains('viva')) pintar(); });
  }

  function mover(n) {
    mes += n;
    if (mes < 1) { mes = 12; anio--; }
    if (mes > 12) { mes = 1; anio++; }
    pintar();
  }

  function irAHoy() {
    const h = Dominio.deISO(hoy());
    anio = h.getFullYear();
    mes = h.getMonth() + 1;
    pintar();
  }

  /* ---------- pintar ---------- */

  function pintar() {
    const datos = Estado.paraDominio();
    $('#mes-titulo').textContent = `${Dominio.nombreMes(mes)} ${anio}`;

    pintarTira(datos);
    pintarRejilla(datos);
    pintarLeyenda(datos);
  }

  /* La tira dice exactamente lo que es: en un mes pasado son horas
     trabajadas; en el mes en curso, las de hasta hoy; en uno que aún
     no ha llegado, una previsión. Y si el mes es anterior a cuando
     empezaste a contar, no dice nada, porque no hay nada que decir. */
  function pintarTira(datos) {
    const h = hoy();
    const dosc = (n) => String(n).padStart(2, '0');
    const primero = `${anio}-${dosc(mes)}-01`;
    const ultimo = `${anio}-${dosc(mes)}-${dosc(Dominio.diasDelMes(anio, mes))}`;

    const futuro = primero > h;
    const enCurso = primero <= h && h <= ultimo;

    const arranque = datos.desde && datos.desde > primero ? datos.desde : primero;
    const cierre = enCurso ? h : ultimo;
    const hay = Dominio.diasEntre(arranque, cierre) >= 0;

    const r = hay ? Dominio.resumen(Dominio.diasEntreFechas(arranque, cierre, datos)) : null;
    const contrato = r ? Dominio.horasContratoDe(datos.ajustes, r.diasContados, anio) : null;
    const saldo = r && contrato !== null ? Dominio.r2(r.horasReales - contrato) : null;
    const clase = saldo === null ? '' : (saldo > 0.01 ? 'mas' : (saldo < -0.01 ? 'menos' : ''));

    const queSon = futuro ? 'previstas' : (enCurso ? 'hasta hoy' : 'trabajadas');

    $('#tira-saldo').innerHTML = !hay ? `
      <div style="grid-column:1/-1">
        <b>—</b>
        <span>este mes es anterior a cuando empezaste a contar</span>
      </div>` : `
      <div>
        <b>${esc(horas(r.horasReales))}</b>
        <span>${queSon}</span>
      </div>
      <div>
        <b class="${clase}">${saldo === null ? '—' : esc(horas(saldo, true))}</b>
        <span>${contrato === null ? 'sin contrato' : (futuro ? 'previsto' : 'de saldo')}</span>
      </div>
      <div>
        <b>${r.diasTrabajados}</b>
        <span>${r.diasTrabajados === 1 ? 'día' : 'días'}</span>
      </div>`;

    $('#tira-saldo').onclick = () => App.ir('horas');
  }

  function pintarRejilla(datos) {
    const dias = Dominio.rejillaDeMes(anio, mes, datos);
    const h = hoy();

    $('#rejilla').innerHTML = dias.map((d) => {
      const t = d.tipo;
      const fondo = t && !t.libre ? tono(t.color) : '';
      const color = t && !t.libre ? t.color : '';
      const num = Dominio.deISO(d.fecha).getDate();

      const marcas = [];
      if (d.extra > 0.01) marcas.push(`<span class="extra">+${Dominio.r2(d.extra)}</span>`);
      if (d.extra < -0.01) marcas.push(`<span class="extra">${Dominio.r2(d.extra)}</span>`);

      return `<button class="dia${d.relleno ? ' relleno' : ''}${d.fecha === h ? ' hoy' : ''}${d.cuenta === false ? ' proyectado' : ''}"
        data-f="${d.fecha}"
        style="${fondo ? `background:${fondo};` : ''}${color ? `color:${color};` : ''}"
        aria-label="${esc(Dominio.fechaLarga(d.fecha))}: ${esc(t ? t.nombre : 'sin turno')}">
        ${d.festivo ? '<span class="fest"></span>' : ''}
        ${marcas.length ? `<span class="marcas">${marcas.join('')}</span>` : ''}
        <span class="n">${num}</span>
        ${t && t.abrev ? `<span class="a">${esc(t.abrev)}</span>` : ''}
        ${d.nota ? '<span class="nota-p"></span>' : ''}
      </button>`;
    }).join('');

    $('#rejilla').querySelectorAll('.dia').forEach((b) => {
      b.onclick = () => { vibrar(); abrirDia(b.dataset.f); };
    });
  }

  /* Fondo suave del color del turno: legible en claro y en oscuro
     porque se mezcla con el fondo real de la pantalla, no con blanco. */
  const tono = (color) => `color-mix(in srgb, ${color} 20%, var(--surface))`;

  function pintarLeyenda(datos) {
    const usados = (datos.tiposTurno || []).filter((t) => !t.libre);
    $('#leyenda').innerHTML = usados.map((t) => `
      <span><i style="background:${esc(t.color)}"></i>${esc(t.nombre)}${
        t.entrada ? ` · ${esc(t.entrada)}–${esc(t.salida)}` : ''}</span>`).join('');
  }

  /* ---------- corregir un día ---------- */

  function abrirDia(fecha) {
    const datos = Estado.paraDominio();
    const d = Dominio.diaDe(fecha, datos);
    const tipos = datos.tiposTurno || [];
    const delPatron = Dominio.turnoDePatron(fecha, datos.patron);

    hoja({
      titulo: Dominio.fechaLarga(fecha),
      sub: d.tipoId === delPatron
        ? 'Lo que dice tu patrón'
        : `Cambiado · el patrón decía ${esc(nombreDe(tipos, delPatron))}`,
      html: `
        <div class="campo">
          <label>Turno</label>
          <div class="turnos" id="elegir-turno">
            ${tipos.map((t) => `
              <button data-t="${esc(t.id)}" class="${t.id === d.tipoId ? 'viva' : ''}"
                style="color:${esc(t.color)};background:${t.libre ? 'var(--sunk)' : tono(t.color)}">
                <span class="t">${esc(t.nombre)}</span>
                <span class="h">${t.libre ? '—' : esc(horas(Dominio.horasDeTipo(t)))}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="campo" id="caja-horas" ${d.trabaja ? '' : 'hidden'}>
          <label>Horas de verdad <small style="color:var(--tx3);font-weight:400">· previstas ${esc(horas(d.horasPrevistas))}</small></label>
          <div class="grupo">
            <button class="btn" data-h="-0.5">−30 min</button>
            <input type="number" id="in-horas" step="0.25" min="0" max="24" value="${d.horasReales}">
            <button class="btn" data-h="0.5">+30 min</button>
          </div>
        </div>

        <div class="campo">
          <label>Nota</label>
          <input type="text" id="in-nota" maxlength="120" value="${esc(d.nota)}"
            placeholder="cambio con Ana, no llegó el relevo…">
        </div>

        <label class="fila" style="border:0;padding:4px 0 12px">
          <span>Festivo</span>
          <input type="checkbox" id="in-fest" ${d.festivo ? 'checked' : ''}
            style="width:22px;height:22px">
        </label>

        <div class="botones">
          ${d.cambiado || d.ajustado || d.nota
            ? '<button class="btn" data-restaurar>Volver al patrón</button>' : ''}
          <button class="btn principal" data-guardar>Guardar</button>
        </div>`,

      listo(c) {
        let tipoId = d.tipoId;
        const inHoras = $('#in-horas', c);
        const cajaHoras = $('#caja-horas', c);

        const refrescarCaja = () => {
          const t = Dominio.tipoPorId(tipos, tipoId);
          const libre = !t || t.libre;
          cajaHoras.hidden = libre;
          if (!libre && +inHoras.value === 0) inHoras.value = Dominio.horasDeTipo(t);
        };

        c.querySelectorAll('#elegir-turno button').forEach((b) => {
          b.onclick = () => {
            tipoId = b.dataset.t;
            c.querySelectorAll('#elegir-turno button').forEach((x) => x.classList.remove('viva'));
            b.classList.add('viva');
            const t = Dominio.tipoPorId(tipos, tipoId);
            inHoras.value = t && !t.libre ? Dominio.horasDeTipo(t) : 0;
            refrescarCaja();
            vibrar();
          };
        });

        c.querySelectorAll('[data-h]').forEach((b) => {
          b.onclick = () => {
            const v = Math.max(0, Math.min(24, (+inHoras.value || 0) + parseFloat(b.dataset.h)));
            inHoras.value = Dominio.r2(v);
            vibrar();
          };
        });

        const botonRestaurar = $('[data-restaurar]', c);
        if (botonRestaurar) botonRestaurar.onclick = () => {
          Estado.quitarExcepcion(fecha);
          quitarFestivoSiHace(fecha, false);
          cerrarHoja();
          tosti('Día devuelto al patrón');
        };

        $('[data-guardar]', c).onclick = () => {
          const t = Dominio.tipoPorId(tipos, tipoId);
          const previstas = Dominio.horasDeTipo(t);
          const reales = t && !t.libre ? Dominio.r2(+inHoras.value || 0) : 0;

          Estado.ponerExcepcion(fecha, {
            tipoId: tipoId === delPatron ? null : tipoId,
            horasReales: reales === previstas ? null : reales,
            nota: $('#in-nota', c).value.trim() || null,
          });
          quitarFestivoSiHace(fecha, $('#in-fest', c).checked);

          cerrarHoja();
          tosti('Guardado', 'buena');
        };

        refrescarCaja();
      },
    });
  }

  const nombreDe = (tipos, id) => {
    const t = Dominio.tipoPorId(tipos, id);
    return t ? t.nombre : 'nada';
  };

  function quitarFestivoSiHace(fecha, debeSerFestivo) {
    Estado.cambiar((d) => {
      const i = d.festivos.indexOf(fecha);
      if (debeSerFestivo && i === -1) d.festivos.push(fecha);
      if (!debeSerFestivo && i !== -1) d.festivos.splice(i, 1);
    });
  }

  return { iniciar, pintar, irAHoy, abrirDia };
})();
