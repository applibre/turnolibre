/* ===========================================================
   TurnoLibre · vista del mes
   La pantalla principal, y la única que mucha gente va a usar.

   Aquí se pinta. No se pide a nadie que describa su rotación en
   abstracto —que es difícil aunque la vivas— sino que la enseñe:
   eliges un turno abajo y tocas los días. Sirve igual para quien
   rota siempre igual que para quien cubre huecos sin ningún orden,
   que es mucha más gente de la que parece.

   Si de lo pintado sale una repetición clara, la app se ofrece a
   seguirla. Nunca lo hace sola.
   =========================================================== */
const Mes = (() => {
  'use strict';

  const { $, esc, hoja, cerrarHoja, tosti, vibrar, horas } = UI;

  let anio, mes;
  let brocha = null;          // el turno que se pone al tocar; null = abrir el detalle

  const hoy = () => Dominio.hoyISO();
  const dos = (n) => String(n).padStart(2, '0');
  const tono = (color) => `color-mix(in srgb, ${color} 20%, var(--surface))`;

  function iniciar() {
    const h = Dominio.deISO(hoy());
    anio = h.getFullYear();
    mes = h.getMonth() + 1;

    $('#mes-antes').onclick = () => mover(-1);
    $('#mes-despues').onclick = () => mover(1);
    $('#mes-titulo').onclick = irAHoy;

    // La brocha arranca en el primer turno de trabajo: quien entra por
    // primera vez tiene un calendario vacío y lo que necesita es pintar.
    const t = (Estado.leer().tiposTurno || []).find((x) => !x.libre);
    brocha = t ? t.id : null;

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

  /* ---------- pintar la pantalla ---------- */

  function pintar() {
    const datos = Estado.paraDominio();
    $('#mes-titulo').textContent = `${Dominio.nombreMes(mes)} ${anio}`;

    pintarTira(datos);
    pintarRejilla(datos);
    pintarBrochas(datos);
    pintarAyuda(datos);
    revisarCiclo(datos);
  }

  /* La tira dice exactamente lo que es: en un mes pasado son horas
     trabajadas; en el mes en curso, las de hasta hoy; en uno que aún
     no ha llegado, una previsión. Y si el mes es anterior a cuando
     empezaste a contar, no dice nada, porque no hay nada que decir. */
  function pintarTira(datos) {
    const h = hoy();
    const primero = `${anio}-${dos(mes)}-01`;
    const ultimo = `${anio}-${dos(mes)}-${dos(Dominio.diasDelMes(anio, mes))}`;

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
      const puesto = !!t;
      const fondo = puesto && !t.libre ? tono(t.color) : '';
      const color = puesto && !t.libre ? t.color : '';
      const num = Dominio.deISO(d.fecha).getDate();

      const marcas = [];
      if (d.extra > 0.01) marcas.push(`<span class="extra">+${Dominio.r2(d.extra)}</span>`);
      if (d.extra < -0.01) marcas.push(`<span class="extra">${Dominio.r2(d.extra)}</span>`);

      const clases = ['dia'];
      if (!puesto) clases.push('vacio');
      if (t && t.libre) clases.push('libre');
      if (d.relleno) clases.push('relleno');
      if (d.fecha === h) clases.push('hoy');
      if (d.cuenta === false) clases.push('proyectado');

      return `<button class="${clases.join(' ')}"
        data-f="${d.fecha}"
        style="${fondo ? `background:${fondo};` : ''}${color ? `color:${color};` : ''}"
        aria-label="${esc(Dominio.fechaLarga(d.fecha))}: ${esc(t ? t.nombre : 'sin poner')}">
        ${d.festivo ? '<span class="fest"></span>' : ''}
        ${marcas.length ? `<span class="marcas">${marcas.join('')}</span>` : ''}
        <span class="n">${num}</span>
        ${t && t.abrev ? `<span class="a">${esc(t.abrev)}</span>` : ''}
        ${d.nota ? '<span class="nota-p"></span>' : ''}
      </button>`;
    }).join('');

    $('#rejilla').querySelectorAll('.dia').forEach((b) => {
      b.onclick = () => tocarDia(b.dataset.f);
    });
  }

  /* ---------- la barra de brochas ----------
     Siempre visible y siempre marcada: al mirarla sabes qué va a pasar
     cuando toques un día. Sin modos escondidos. */

  function pintarBrochas(datos) {
    const tipos = datos.tiposTurno || [];
    const conPatron = !!(datos.patron && datos.patron.secuencia && datos.patron.secuencia.length);

    $('#brochas').innerHTML = tipos.map((t) => `
      <button data-b="${esc(t.id)}" class="${brocha === t.id ? 'viva' : ''}"
        style="${brocha === t.id && !t.libre ? `background:${esc(t.color)};border-color:${esc(t.color)};color:#fff` : ''}"
        aria-pressed="${brocha === t.id}">
        <i style="background:${t.libre ? 'var(--line2)' : esc(t.color)}"></i>${esc(t.nombre)}
      </button>`).join('')
      + `<button data-b="" class="${brocha === null ? 'viva' : ''}" aria-pressed="${brocha === null}">
           <span class="lapiz">✎</span>Detalle
         </button>`;

    $('#brochas').querySelectorAll('[data-b]').forEach((b) => {
      b.onclick = () => {
        brocha = b.dataset.b || null;
        vibrar();
        pintarBrochas(Estado.paraDominio());
        pintarAyuda(Estado.paraDominio());
      };
    });

    $('#brochas').classList.toggle('con-patron', conPatron);
  }

  function pintarAyuda(datos) {
    const puestos = Object.keys(datos.excepciones || {}).length;
    const conPatron = !!(datos.patron && datos.patron.secuencia && datos.patron.secuencia.length);
    const t = brocha ? Dominio.tipoPorId(datos.tiposTurno, brocha) : null;

    let texto = '';
    if (brocha === null) {
      texto = 'Toca un día para ver y ajustar sus horas, su nota o si fue festivo.';
    } else if (!puestos && !conPatron) {
      texto = `Toca los días que trabajas de <b>${esc(t ? t.nombre : '')}</b>. `
        + 'Cambia de turno abajo cuando lo necesites.';
    } else {
      texto = `Tocando pones <b>${esc(t ? t.nombre : '')}</b>. Toca otra vez el mismo día para quitarlo.`;
    }
    $('#ayuda-pintar').innerHTML = texto;
  }

  /* ---------- tocar un día ---------- */

  function tocarDia(fecha) {
    vibrar();
    if (brocha === null) { abrirDia(fecha); return; }

    const datos = Estado.paraDominio();
    const d = Dominio.diaDe(fecha, datos);

    if (d.tipoId === brocha) {
      // segundo toque con la misma brocha: quitar. Pero si el día lleva
      // nota u horas ajustadas, no se borra a la callada: se abre para
      // que se vea lo que hay.
      if (d.nota || d.ajustado) { abrirDia(fecha); return; }
      Estado.quitarExcepcion(fecha);
      return;
    }

    const delPatron = Dominio.turnoDePatron(fecha, datos.patron);
    Estado.ponerExcepcion(fecha, { tipoId: brocha === delPatron ? null : brocha });
  }

  /* ---------- proponer seguir la rotación ----------
     Se mira lo pintado; si se repite entero al menos dos veces, se
     ofrece continuarlo. Nunca se aplica solo, y si se dice que no,
     no se vuelve a insistir con esa misma rotación. */

  function revisarCiclo(datos) {
    const b = $('#banner-ciclo');
    const ya = !!(datos.patron && datos.patron.secuencia && datos.patron.secuencia.length);
    const fechas = Object.keys(datos.excepciones || {})
      .filter((f) => datos.excepciones[f].tipoId)
      .sort();

    if (ya || fechas.length < 4) { b.classList.add('oculto'); return; }

    const ids = [];
    for (let f = fechas[0]; Dominio.diasEntre(f, fechas[fechas.length - 1]) >= 0; f = Dominio.sumarDias(f, 1)) {
      const e = datos.excepciones[f];
      ids.push(e && e.tipoId ? e.tipoId : null);
    }

    const c = Dominio.detectarCiclo(ids);
    if (!c) { b.classList.add('oculto'); return; }

    const firma = c.secuencia.join('') + '@' + fechas[0];
    if (datos.ajustes.cicloRechazado === firma) { b.classList.add('oculto'); return; }

    const ancla = Dominio.sumarDias(fechas[0], c.desplazamiento);
    b.innerHTML = `<span>🔁</span><span>Tus turnos se repiten cada <b>${c.periodo} días</b>.
      ¿Sigo yo con el resto del año?</span>`;
    b.classList.remove('oculto');
    b.onclick = () => confirmarCiclo(c, ancla, firma);
  }

  function confirmarCiclo(c, ancla, firma) {
    const tipos = Estado.leer().tiposTurno;
    hoja({
      titulo: `¿Se repite cada ${c.periodo} días?`,
      sub: 'Si lo confirmas, relleno el resto del año con esta rotación. '
        + 'Podrás corregir cualquier día tocándolo, y deshacerlo en Ajustes.',
      html: `<div class="turnos" style="margin-bottom:14px">
          ${c.secuencia.map((id, i) => {
            const t = Dominio.tipoPorId(tipos, id);
            const libre = !t || t.libre;
            return `<div class="turnos-ver" style="color:${libre ? 'var(--tx2)' : esc(t.color)};
              background:${libre ? 'var(--sunk)' : tono(t.color)}">
              <span class="t">${esc(t ? t.nombre : '—')}</span><span class="h">día ${i + 1}</span></div>`;
          }).join('')}
        </div>
        <div class="botones">
          <button class="btn" data-no>Ahora no</button>
          <button class="btn principal" data-si>Sí, continúa</button>
        </div>`,
      listo(cc) {
        $('[data-si]', cc).onclick = () => {
          Estado.cambiar((d) => {
            d.patron = { secuencia: [...c.secuencia], ancla };
            // los días pintados que ya coinciden con la rotación dejan de
            // guardarse uno a uno: el patrón los calcula
            Object.keys(d.excepciones).forEach((f) => {
              const e = d.excepciones[f];
              if (!e.tipoId || e.nota || typeof e.horasReales === 'number') return;
              if (Dominio.turnoDePatron(f, d.patron) === e.tipoId) delete d.excepciones[f];
            });
          });
          cerrarHoja();
          tosti('Listo: el año está puesto. Toca cualquier día para corregirlo', 'buena');
        };
        $('[data-no]', cc).onclick = () => {
          Estado.cambiar((d) => { d.ajustes.cicloRechazado = firma; });
          cerrarHoja();
        };
      },
    });
  }

  /* ---------- el detalle de un día ---------- */

  function abrirDia(fecha) {
    const datos = Estado.paraDominio();
    const d = Dominio.diaDe(fecha, datos);
    const tipos = datos.tiposTurno || [];
    const delPatron = Dominio.turnoDePatron(fecha, datos.patron);

    const sub = !d.tipo ? 'Sin poner'
      : (d.tipoId === delPatron ? 'Lo que dice tu rotación'
        : (delPatron ? `Cambiado · tu rotación decía ${nombreDe(tipos, delPatron)}` : ''));

    hoja({
      titulo: Dominio.fechaLarga(fecha),
      sub,
      html: `
        <div class="campo">
          <label>Turno</label>
          <div class="turnos" id="elegir-turno">
            ${tipos.map((t) => `
              <button data-t="${esc(t.id)}" class="${t.id === d.tipoId ? 'viva' : ''}"
                style="color:${t.libre ? 'var(--tx2)' : esc(t.color)};background:${t.libre ? 'var(--sunk)' : tono(t.color)}">
                <span class="t">${esc(t.nombre)}</span>
                <span class="h">${t.libre ? '—' : esc(horas(Dominio.horasDeTipo(t)))}</span>
              </button>`).join('')}
            <button data-t="" class="${!d.tipoId ? 'viva' : ''}" style="color:var(--tx3)">
              <span class="t">Sin poner</span><span class="h">—</span>
            </button>
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
          <input type="checkbox" id="in-fest" ${d.festivo ? 'checked' : ''} style="width:22px;height:22px">
        </label>

        <div class="botones">
          ${d.cambiado || d.ajustado || d.nota
            ? `<button class="btn" data-restaurar>${delPatron ? 'Volver a mi rotación' : 'Vaciar el día'}</button>` : ''}
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
        };

        c.querySelectorAll('#elegir-turno button').forEach((b) => {
          b.onclick = () => {
            tipoId = b.dataset.t || null;
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
          marcarFestivo(fecha, false);
          cerrarHoja();
          tosti(delPatron ? 'Día devuelto a tu rotación' : 'Día vaciado');
        };

        $('[data-guardar]', c).onclick = () => {
          const t = Dominio.tipoPorId(tipos, tipoId);
          const previstas = Dominio.horasDeTipo(t);
          const reales = t && !t.libre ? Dominio.r2(+inHoras.value || 0) : 0;

          Estado.ponerExcepcion(fecha, {
            tipoId: !tipoId || tipoId === delPatron ? null : tipoId,
            horasReales: reales === previstas ? null : reales,
            nota: $('#in-nota', c).value.trim() || null,
          });
          marcarFestivo(fecha, $('#in-fest', c).checked);

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

  function marcarFestivo(fecha, debeSerlo) {
    Estado.cambiar((d) => {
      const i = d.festivos.indexOf(fecha);
      if (debeSerlo && i === -1) d.festivos.push(fecha);
      if (!debeSerlo && i !== -1) d.festivos.splice(i, 1);
    });
  }

  return { iniciar, pintar, irAHoy, abrirDia };
})();
