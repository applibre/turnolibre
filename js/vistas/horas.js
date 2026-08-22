/* ===========================================================
   TurnoLibre · vista de horas
   El motivo por el que esta app existe y no es una más:
   cuántas horas has hecho de verdad frente a las pactadas.
   =========================================================== */
const Horas = (() => {
  'use strict';

  const { $, esc, horas, tosti } = UI;

  let anio;

  function iniciar() {
    anio = Dominio.deISO(Dominio.hoyISO()).getFullYear();
    $('#anio-antes').onclick = () => { anio--; pintar(); };
    $('#anio-despues').onclick = () => { anio++; pintar(); };
    $('#anio-titulo').onclick = () => {
      anio = Dominio.deISO(Dominio.hoyISO()).getFullYear();
      pintar();
    };
    Estado.escuchar(() => { if ($('#p-horas').classList.contains('viva')) pintar(); });
  }

  function pintar() {
    const datos = Estado.paraDominio();
    const a = Dominio.saldoDeAnio(anio, datos);
    $('#anio-titulo').textContent = anio;

    const hoy = Dominio.hoyISO();
    const mesActual = Dominio.deISO(hoy).getMonth() + 1;
    const esteAnio = anio === Dominio.deISO(hoy).getFullYear();

    /* Solo se cuenta lo VIVIDO: ni el patrón proyectado hacia atrás
       antes de empezar, ni los turnos que todavía no han llegado.
       Un contador que suma el futuro miente igual que uno que se
       inventa el pasado. */
    const primero = `${anio}-01-01`;
    const ultimo = `${anio}-12-31`;
    const arranque = datos.desde && datos.desde > primero ? datos.desde : primero;
    const cierre = esteAnio ? hoy : ultimo;
    const hayTramo = Dominio.diasEntre(arranque, cierre) >= 0;

    const vivido = hayTramo
      ? Dominio.resumen(Dominio.diasEntreFechas(arranque, cierre, datos))
      : { horasReales: 0, diasContados: 0, noches: 0, festivos: 0, domingos: 0, diasTrabajados: 0 };

    const realesHasta = vivido.horasReales;
    const contadosHasta = vivido.diasContados;
    const contratoHasta = Dominio.horasContratoDe(datos.ajustes, contadosHasta, anio);
    const saldoHasta = contratoHasta === null ? null : Dominio.r2(realesHasta - contratoHasta);

    const clase = saldoHasta === null ? '' : (saldoHasta > 0.01 ? 'mas' : (saldoHasta < -0.01 ? 'menos' : ''));
    const maxMes = Math.max(...a.meses.map((m) => m.horasReales), 1);
    const desde = datos.desde;
    const empiezaDentro = desde && desde > primero && desde <= ultimo;

    $('#horas-cuerpo').innerHTML = `
      <div class="tarjeta">
        <h3>${esteAnio ? 'Lo que va de año' : 'Año completo'}</h3>
        <div class="grande ${clase}">${saldoHasta === null ? '—' : esc(horas(saldoHasta, true))}</div>
        <p class="pista">
          ${esc(horas(realesHasta))} trabajadas
          ${contratoHasta === null ? '' : ` · ${esc(horas(contratoHasta))} según contrato`}
        </p>
        ${contadosHasta === 0 ? `
          <p class="pista chica">Aún no hay nada que contar en ${anio}.</p>`
        : datos.ajustes.horasContrato === null ? `
          <p class="pista chica">Dinos tus horas de contrato en Ajustes y aquí verás tu saldo.</p>` : `
          <p class="pista chica">${saldoHasta > 0
            ? `Equivale a ${Dominio.r2(saldoHasta / 8)} jornadas de ocho horas por encima de lo pactado.`
            : (saldoHasta < 0 ? 'Vas por debajo de lo pactado.' : 'Vas justo.')}</p>`}
        ${empiezaDentro ? `
          <p class="pista chica">Se cuenta desde el <b>${esc(Dominio.fechaLarga(desde))}</b>, cuando
          empezaste a usar la app. Lo anterior se pinta en el calendario, pero no se suma:
          sería una suposición, no un registro. Puedes cambiar esa fecha en Ajustes.</p>` : ''}
      </div>

      <div class="tarjeta">
        <h3>Se paga aparte${esteAnio ? ' · hasta hoy' : ''}</h3>
        <div class="fila"><span>Noches</span><span class="v">${vivido.noches}</span></div>
        <div class="fila"><span>Festivos trabajados</span><span class="v">${vivido.festivos}</span></div>
        <div class="fila"><span>Domingos</span><span class="v">${vivido.domingos}</span></div>
        <div class="fila"><span>Días trabajados</span><span class="v">${vivido.diasTrabajados}</span></div>
      </div>

      <div class="tarjeta">
        <h3>Mes a mes</h3>
        <div class="barras">
          ${a.meses.map((m, i) => {
            const futuro = esteAnio && i + 1 > mesActual;
            const dif = m.horasContrato === null ? 0 : m.horasReales - m.horasContrato;
            return `<button class="barra-mes" data-mes="${i + 1}" style="border:0;background:none;padding:0;text-align:left;${futuro ? 'opacity:.4' : ''}">
              <span class="m">${esc(Dominio.MESES[i].slice(0, 3))}</span>
              <span class="via"><i class="${dif > 0.01 ? 'mas' : ''}" style="width:${(m.horasReales / maxMes * 100).toFixed(1)}%"></i></span>
              <span class="h">${m.horasReales ? esc(horas(m.horasReales)) : '—'}</span>
            </button>`;
          }).join('')}
        </div>
        <p class="pista chica">Toca un mes para ver su parte de horas.${
          esteAnio ? ' Los meses que aún no han llegado se ven apagados: son una previsión.' : ''}</p>
      </div>

      <div class="tarjeta">
        <h3>Llevártelo fuera</h3>
        <button class="btn" data-parte-anio>Parte de horas del año</button>
        <button class="btn" data-ics>Enviar los turnos al calendario</button>
        <p class="pista chica">El parte es un registro personal, no un certificado de empresa:
        vale como indicio, que es lo que se pide para poder reclamar.</p>
      </div>`;

    $('#horas-cuerpo').querySelectorAll('[data-mes]').forEach((b) => {
      b.onclick = () => {
        if (!Exportar.parteDeHoras(anio, +b.dataset.mes)) {
          tosti('El navegador bloqueó la ventana. Permite las ventanas emergentes', 'mala');
        }
      };
    });

    $('[data-parte-anio]', $('#horas-cuerpo')).onclick = () => {
      if (!Exportar.parteDeHoras(anio, null)) {
        tosti('El navegador bloqueó la ventana. Permite las ventanas emergentes', 'mala');
      }
    };

    $('[data-ics]', $('#horas-cuerpo')).onclick = () => elegirTramo();
  }

  /* ---------- qué tramo mandar al calendario ---------- */

  function elegirTramo() {
    const hoy = Dominio.hoyISO();
    const d = Dominio.deISO(hoy);
    const a = d.getFullYear();
    const m = d.getMonth() + 1;
    const dos = (n) => String(n).padStart(2, '0');

    const tramos = [
      { t: 'Este mes', desde: `${a}-${dos(m)}-01`, hasta: `${a}-${dos(m)}-${dos(Dominio.diasDelMes(a, m))}` },
      { t: 'Los próximos 3 meses', desde: hoy, hasta: Dominio.sumarDias(hoy, 92) },
      { t: 'Todo el año', desde: `${a}-01-01`, hasta: `${a}-12-31` },
    ];

    UI.hoja({
      titulo: 'Enviar al calendario',
      sub: 'Tu teléfono avisará antes de cada turno, aunque la app esté cerrada.',
      html: tramos.map((x, i) => `<button class="btn" data-i="${i}">${esc(x.t)}</button>`).join('')
        + `<p class="pista chica">Si más adelante cambias un turno, vuelve a enviarlo:
           el calendario reconoce los eventos y los actualiza. Los días que pasen a ser
           libres tendrás que borrarlos a mano.</p>`,
      listo(c) {
        c.querySelectorAll('[data-i]').forEach((b) => {
          b.onclick = async () => {
            const x = tramos[+b.dataset.i];
            UI.cerrarHoja();
            const r = await Exportar.calendario(x.desde, x.hasta);
            if (r === 'cancelado') return;
            tosti(r === 'compartido' ? 'Enviado' : 'Descargado: ábrelo para añadirlo al calendario', 'buena');
          };
        });
      },
    });
  }

  return { iniciar, pintar };
})();
