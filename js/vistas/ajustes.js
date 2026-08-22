/* ===========================================================
   TurnoLibre · ajustes
   Todo lo que se configuró en la bienvenida se puede rehacer aquí,
   más los turnos a medida y la copia de seguridad.
   =========================================================== */
const Ajustes = (() => {
  'use strict';

  const { $, esc, hoja, cerrarHoja, tosti, confirmar, horas } = UI;

  const tono = (color) => `color-mix(in srgb, ${color} 22%, var(--surface))`;

  function iniciar() {
    Estado.escuchar(() => { if ($('#p-ajustes').classList.contains('viva')) pintar(); });
  }

  function pintar() {
    const d = Estado.leer();
    const c = d.ajustes.horasContrato;
    const tipos = d.tiposTurno || [];
    const patron = d.patron || { secuencia: [], ancla: '' };
    const excepciones = Object.keys(d.excepciones || {}).length;

    $('#ajustes-cuerpo').innerHTML = `
      <div class="tarjeta">
        <h3>Mi rotación</h3>
        ${patron.secuencia.length ? `
          <div class="patron viva" style="margin-bottom:10px">
            <b>Se repite cada ${patron.secuencia.length} días</b>
            <small>Empezó el ${esc(patron.ancla ? Dominio.fechaLarga(patron.ancla) : '—')}</small>
            <span class="tira-p">${patron.secuencia.map((id) => {
              const t = Dominio.tipoPorId(tipos, id);
              return `<i style="background:${t && !t.libre ? esc(t.color) : 'var(--line2)'}"></i>`;
            }).join('')}</span>
          </div>
          <button class="btn" data-editar-patron>Cambiar mi rotación</button>
          <button class="btn" data-mover-ciclo>Ajustar en qué día del ciclo estoy</button>
          <button class="btn" data-quitar-patron>Quitar la rotación</button>
          <p class="pista chica">Al quitarla, los días que ya tengas puestos se quedan;
          simplemente deja de rellenarse sola hacia adelante.</p>
        ` : `
          <div class="aviso" style="margin-bottom:12px">
            <span>🎨</span>
            <span>No tienes rotación, y <b>no hace falta</b>. Pinta tus días en el calendario
            y ya está: sirve igual si te ponen el cuadrante cada semana sin ningún orden.
            Si algún día se repite sola, la app te avisará y se ofrecerá a seguirla.</span>
          </div>
          <button class="btn" data-editar-patron>Tengo una rotación fija · montarla</button>
        `}
      </div>

      <div class="tarjeta">
        <h3>Mis turnos</h3>
        ${tipos.map((t) => `
          <button class="fila" data-turno="${esc(t.id)}" style="width:100%;border-bottom:1px solid var(--line);background:none;border-left:0;border-right:0;border-top:0;text-align:left">
            <span style="display:flex;align-items:center;gap:10px">
              <i style="width:13px;height:13px;border-radius:4px;background:${t.libre ? 'var(--line2)' : esc(t.color)};display:inline-block"></i>
              <span>${esc(t.nombre)}<small>${t.libre ? 'no suma horas' : esc(t.entrada + ' – ' + t.salida)}</small></span>
            </span>
            <span class="v">${t.libre ? '—' : esc(horas(Dominio.horasDeTipo(t)))}</span>
          </button>`).join('')}
        <button class="btn" data-nuevo-turno style="margin-top:10px">Añadir un turno</button>
      </div>

      <div class="tarjeta">
        <h3>Mi jornada</h3>
        <button class="fila" data-contrato style="width:100%;border:0;background:none;text-align:left">
          <span>Horas de contrato<small>${c ? `${c.valor} ${{ semanal: 'a la semana', mensual: 'al mes', anual: 'al año' }[c.tipo]}` : 'sin poner'}</small></span>
          <span class="v">›</span>
        </button>
        <button class="fila" data-desde style="width:100%;border:0;background:none;text-align:left">
          <span>Cuento mis horas desde<small>lo anterior se pinta, pero no se suma</small></span>
          <span class="v">${esc(Dominio.fechaCorta(d.ajustes.desde || d.creado || Dominio.hoyISO()))} ›</span>
        </button>
        <button class="fila" data-aviso style="width:100%;border:0;background:none;text-align:left">
          <span>Aviso antes del turno<small>en el calendario del móvil</small></span>
          <span class="v">${d.ajustes.avisoMinutos ? d.ajustes.avisoMinutos + ' min' : 'sin aviso'} ›</span>
        </button>
      </div>

      <div class="tarjeta">
        <h3>Tus datos</h3>
        <div class="aviso" style="margin-bottom:12px">
          <span>🔒</span>
          <span>Todo vive en este dispositivo. No hay cuenta, no hay servidor y nadie
          —tampoco nosotros ni tu empresa— puede ver tus horas.
          <b>Por eso la copia de seguridad importa:</b> si borras el navegador, se van.</span>
        </div>
        <button class="btn" data-copia>Guardar una copia</button>
        <button class="btn" data-restaurar>Restaurar desde una copia</button>
        <p class="pista chica">${excepciones} ${excepciones === 1 ? 'día corregido' : 'días corregidos'}
        · ${(d.festivos || []).length} festivos marcados</p>
      </div>

      <div class="tarjeta">
        <h3>Aspecto</h3>
        <div class="segmentos" id="seg-tema">
          ${[['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([v, t]) =>
            `<button data-tema="${v}" class="${(d.ajustes.tema || 'auto') === v ? 'viva' : ''}">${t}</button>`).join('')}
        </div>
      </div>

      <div class="tarjeta">
        <h3>Sobre TurnoLibre</h3>
        <p class="pista">Software libre de <b>applibre</b>. Gratis de verdad: sin anuncios,
        sin cuenta y sin suscripción. Puedes copiarlo y adaptarlo.</p>
        <p class="pista chica">El parte de horas es un registro personal, no un certificado
        de empresa. Vale como indicio, que es lo que se pide para reclamar.</p>
        <button class="btn peligro" data-borrar style="margin-top:10px">Borrar todos mis datos</button>
      </div>`;

    enganchar();
  }

  /* ---------- enganches ---------- */

  function enganchar() {
    const c = $('#ajustes-cuerpo');

    const alSiExiste = (sel, fn) => { const b = $(sel, c); if (b) b.onclick = fn; };
    alSiExiste('[data-editar-patron]', editarPatron);
    alSiExiste('[data-mover-ciclo]', moverCiclo);
    alSiExiste('[data-quitar-patron]', quitarPatron);
    $('[data-nuevo-turno]', c).onclick = () => editarTurno(null);
    $('[data-contrato]', c).onclick = editarContrato;
    $('[data-desde]', c).onclick = editarDesde;
    $('[data-aviso]', c).onclick = editarAviso;
    $('[data-copia]', c).onclick = async () => {
      const r = await Exportar.copiaSeguridad();
      if (r !== 'cancelado') tosti(r === 'compartido' ? 'Copia enviada' : 'Copia descargada', 'buena');
    };
    $('[data-restaurar]', c).onclick = restaurar;
    $('[data-borrar]', c).onclick = borrarTodo;

    c.querySelectorAll('[data-turno]').forEach((b) => {
      b.onclick = () => editarTurno(b.dataset.turno);
    });

    c.querySelectorAll('[data-tema]').forEach((b) => {
      b.onclick = () => {
        Estado.cambiar((d) => { d.ajustes.tema = b.dataset.tema; });
        App.aplicarTema();
      };
    });
  }

  /* ---------- patrón ---------- */

  async function quitarPatron() {
    if (!await confirmar({
      titulo: '¿Quitar la rotación?',
      sub: 'Los días que ya tienes puestos se quedan tal cual. Lo único que cambia es que '
        + 'los próximos dejan de rellenarse solos: los irás pintando tú.',
      aceptar: 'Quitarla',
    })) return;

    /* Antes de soltar la rotación se fijan como días puestos los que ya
       estaban a la vista. Si no, al quitarla se le vaciaría el calendario
       a alguien que creía tenerlo hecho. */
    Estado.cambiar((d) => {
      const p = d.patron;
      if (p && p.secuencia && p.secuencia.length) {
        /* Se arranca en la más antigua de las fechas con sentido: si la
           rotación nació de días pintados a mano, su ancla es anterior a
           la fecha de cómputo, y esos días también son suyos. */
        const candidatas = [d.ajustes.desde, d.creado, p.ancla].filter(Boolean);
        const desde = candidatas.sort()[0] || Dominio.hoyISO();
        const hasta = Dominio.sumarDias(Dominio.hoyISO(), 31);
        for (let f = desde; Dominio.diasEntre(f, hasta) >= 0; f = Dominio.sumarDias(f, 1)) {
          const id = Dominio.turnoDePatron(f, p);
          if (!id) continue;
          d.excepciones[f] = { ...(d.excepciones[f] || {}), tipoId: id };
        }
      }
      d.patron = null;
      delete d.ajustes.cicloRechazado;
    });
    tosti('Rotación quitada. Tus días siguen ahí', 'buena');
  }

  function editarPatron() {
    const actual = Estado.leer().patron;

    hoja({
      titulo: 'Cambiar mi patrón',
      sub: 'Elige uno de partida y luego ajústalo día a día si hace falta.',
      html: `<div class="patrones">
          ${Dominio.PATRONES.map((p) => `
            <button class="patron" data-p="${esc(p.id)}">
              <b>${esc(p.nombre)}</b><small>${esc(p.pista)}</small>
              <span class="tira-p">${p.secuencia.map((id) => {
                const t = Dominio.TIPOS_BASE.find((x) => x.id === id);
                return `<i style="background:${t && !t.libre ? t.color : 'var(--line2)'}"></i>`;
              }).join('')}</span>
            </button>`).join('')}
        </div>
        <button class="btn" data-medida style="margin-top:12px">Montarlo día a día</button>
        <p class="pista chica">Cambiar el patrón no borra los días que hayas corregido a mano.</p>`,
      listo(cc) {
        cc.querySelectorAll('[data-p]').forEach((b) => {
          b.onclick = () => {
            const p = Dominio.PATRONES.find((x) => x.id === b.dataset.p);
            Estado.cambiar((d) => {
              d.patron = { secuencia: [...p.secuencia], ancla: actual ? actual.ancla : Dominio.hoyISO() };
              // se conservan los turnos que ya existían y se añaden los que falten
              const tengo = new Set(d.tiposTurno.map((t) => t.id));
              Dominio.tiposDePatron(p.secuencia).forEach((t) => {
                if (!tengo.has(t.id)) d.tiposTurno.push(t);
              });
            });
            cerrarHoja();
            tosti('Patrón cambiado. Revisa en qué día del ciclo estás', 'buena');
          };
        });
        $('[data-medida]', cc).onclick = () => { cerrarHoja(); patronAMedida(); };
      },
    });
  }

  function patronAMedida() {
    const d = Estado.leer();
    let sec = [...(d.patron ? d.patron.secuencia : ['M', 'L'])];

    const pintarSec = () => sec.map((id, i) => {
      const t = Dominio.tipoPorId(d.tiposTurno, id);
      const libre = !t || t.libre;
      return `<button data-i="${i}" style="color:${libre ? 'var(--tx2)' : esc(t.color)};background:${libre ? 'var(--sunk)' : tono(t.color)}">
        <span class="t">${esc(t ? t.nombre.slice(0, 6) : '—')}</span><span class="h">${i + 1}</span></button>`;
    }).join('');

    const abrir = () => hoja({
      titulo: 'Mi patrón día a día',
      sub: 'Toca un día para cambiar su turno. El ciclo se repite sin fin.',
      html: `<div class="turnos" id="sec">${pintarSec()}</div>
        <div class="botones" style="margin-top:12px">
          <button class="btn" data-menos>Quitar día</button>
          <button class="btn" data-mas>Añadir día</button>
        </div>
        <button class="btn principal" data-ok style="margin-top:8px">Guardar patrón de ${sec.length} días</button>`,
      listo(cc) {
        cc.querySelectorAll('#sec button').forEach((b) => {
          b.onclick = () => {
            const i = +b.dataset.i;
            const ids = d.tiposTurno.map((t) => t.id);
            const siguiente = ids[(ids.indexOf(sec[i]) + 1) % ids.length];
            sec[i] = siguiente;
            UI.vibrar();
            abrir();
          };
        });
        $('[data-mas]', cc).onclick = () => { sec.push('L'); abrir(); };
        $('[data-menos]', cc).onclick = () => { if (sec.length > 1) sec.pop(); abrir(); };
        $('[data-ok]', cc).onclick = () => {
          Estado.cambiar((x) => { x.patron = { ...x.patron, secuencia: sec }; });
          cerrarHoja();
          tosti('Patrón guardado', 'buena');
        };
      },
    });
    abrir();
  }

  function moverCiclo() {
    const d = Estado.leer();
    const sec = d.patron ? d.patron.secuencia : [];
    if (!sec.length) return;

    const hoyId = Dominio.turnoDePatron(Dominio.hoyISO(), d.patron);
    const posActual = ((Dominio.diasEntre(d.patron.ancla, Dominio.hoyISO()) % sec.length) + sec.length) % sec.length;

    hoja({
      titulo: '¿Qué te toca hoy?',
      sub: `Hoy es ${Dominio.fechaLarga(Dominio.hoyISO())}. Ahora mismo la app cree que te toca ${
        (Dominio.tipoPorId(d.tiposTurno, hoyId) || {}).nombre || '—'}.`,
      html: `<div class="turnos">
        ${sec.map((id, i) => {
          const t = Dominio.tipoPorId(d.tiposTurno, id);
          const libre = !t || t.libre;
          return `<button data-pos="${i}" class="${i === posActual ? 'viva' : ''}"
            style="color:${libre ? 'var(--tx2)' : esc(t.color)};background:${libre ? 'var(--sunk)' : tono(t.color)}">
            <span class="t">${esc(t ? t.nombre : '—')}</span><span class="h">día ${i + 1}</span></button>`;
        }).join('')}
      </div>`,
      listo(cc) {
        cc.querySelectorAll('[data-pos]').forEach((b) => {
          b.onclick = () => {
            const ancla = Dominio.sumarDias(Dominio.hoyISO(), -(+b.dataset.pos));
            Estado.cambiar((x) => { x.patron = { ...x.patron, ancla }; });
            cerrarHoja();
            tosti('Ciclo ajustado', 'buena');
          };
        });
      },
    });
  }

  /* ---------- turnos ---------- */

  function editarTurno(id) {
    const d = Estado.leer();
    const t = id ? Dominio.tipoPorId(d.tiposTurno, id) : null;
    const nuevo = !t;
    const v = t || { id: '', nombre: '', abrev: '', color: '#17708C', entrada: '08:00', salida: '16:00' };
    const enUso = id ? (d.patron ? d.patron.secuencia.includes(id) : false) : false;

    hoja({
      titulo: nuevo ? 'Nuevo turno' : v.nombre,
      html: `
        ${v.libre ? '<div class="aviso" style="margin-bottom:12px"><span>ℹ️</span><span>Es el turno de descanso: no suma horas.</span></div>' : ''}
        <div class="campo">
          <label>Nombre</label>
          <input type="text" id="t-nombre" maxlength="24" value="${esc(v.nombre)}" placeholder="Mañana, Guardia, Refuerzo…">
        </div>
        <div class="campo">
          <label>Abreviatura (la que se ve en el calendario)</label>
          <input type="text" id="t-abrev" maxlength="4" value="${esc(v.abrev || '')}" placeholder="MAÑ">
        </div>
        ${v.libre ? '' : `
        <div class="grupo">
          <div class="campo"><label>Entra</label><input type="time" id="t-entrada" value="${esc(v.entrada || '08:00')}"></div>
          <div class="campo"><label>Sale</label><input type="time" id="t-salida" value="${esc(v.salida || '16:00')}"></div>
        </div>
        <p class="pista chica" id="t-duracion"></p>
        <label class="fila" style="border:0">
          <span>Cuenta como nocturno<small>se paga aparte en casi todos los convenios</small></span>
          <input type="checkbox" id="t-noche" ${v.nocturno ? 'checked' : ''} style="width:22px;height:22px">
        </label>
        <div class="campo">
          <label>Color</label>
          <input type="color" id="t-color" value="${esc(v.color)}" style="height:46px;padding:4px">
        </div>`}
        <div class="botones">
          ${!nuevo && !v.libre && !enUso ? '<button class="btn peligro" data-borrar-turno>Borrar</button>' : ''}
          <button class="btn principal" data-ok>Guardar</button>
        </div>
        ${enUso && !nuevo ? '<p class="pista chica">No se puede borrar: tu patrón lo usa.</p>' : ''}`,

      listo(cc) {
        const dur = $('#t-duracion', cc);
        const refrescar = () => {
          if (!dur) return;
          const e = $('#t-entrada', cc).value;
          const s = $('#t-salida', cc).value;
          if (e && s) dur.textContent = `Dura ${horas(Dominio.horasEntre(e, s))}.`;
        };
        if (dur) {
          $('#t-entrada', cc).oninput = refrescar;
          $('#t-salida', cc).oninput = refrescar;
          refrescar();
        }

        const borrar = $('[data-borrar-turno]', cc);
        if (borrar) borrar.onclick = async () => {
          if (!await confirmar({ titulo: `¿Borrar «${v.nombre}»?`, sub: 'Los días que lo usen quedarán sin turno.', aceptar: 'Borrar', peligro: true })) return;
          Estado.cambiar((x) => { x.tiposTurno = x.tiposTurno.filter((y) => y.id !== id); });
          cerrarHoja();
          tosti('Turno borrado');
        };

        $('[data-ok]', cc).onclick = () => {
          const nombre = $('#t-nombre', cc).value.trim();
          if (!nombre) { tosti('Ponle un nombre', 'mala'); return; }

          const campos = { nombre, abrev: ($('#t-abrev', cc).value.trim() || nombre.slice(0, 3)).toUpperCase() };
          if (!v.libre) {
            campos.entrada = $('#t-entrada', cc).value || '08:00';
            campos.salida = $('#t-salida', cc).value || '16:00';
            campos.nocturno = $('#t-noche', cc).checked;
            campos.color = $('#t-color', cc).value;
          }

          Estado.cambiar((x) => {
            if (nuevo) {
              const usados = new Set(x.tiposTurno.map((y) => y.id));
              let base = nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 2).toUpperCase() || 'X';
              let idNuevo = base;
              let n = 2;
              while (usados.has(idNuevo)) idNuevo = base + (n++);
              x.tiposTurno.push({ id: idNuevo, ...campos });
            } else {
              const i = x.tiposTurno.findIndex((y) => y.id === id);
              x.tiposTurno[i] = { ...x.tiposTurno[i], ...campos };
            }
          });
          cerrarHoja();
          tosti('Guardado', 'buena');
        };
      },
    });
  }

  /* ---------- jornada ---------- */

  function editarContrato() {
    const c = Estado.leer().ajustes.horasContrato || { tipo: 'semanal', valor: 40 };
    let tipo = c.tipo;

    hoja({
      titulo: 'Horas de contrato',
      sub: 'Está en tu contrato o en tu convenio. Sirve para calcular tu saldo.',
      html: `
        <div class="campo">
          <div class="segmentos" id="seg">
            ${[['semanal', 'A la semana'], ['mensual', 'Al mes'], ['anual', 'Al año']].map(([v, t]) =>
              `<button data-t="${v}" class="${tipo === v ? 'viva' : ''}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="campo">
          <label>Cuántas horas</label>
          <input type="number" id="in-c" inputmode="decimal" step="0.5" min="0" value="${c.valor}">
        </div>
        <div class="botones">
          <button class="btn" data-sin>Quitarlo</button>
          <button class="btn principal" data-ok>Guardar</button>
        </div>`,
      listo(cc) {
        cc.querySelectorAll('[data-t]').forEach((b) => {
          b.onclick = () => {
            tipo = b.dataset.t;
            cc.querySelectorAll('[data-t]').forEach((x) => x.classList.remove('viva'));
            b.classList.add('viva');
          };
        });
        $('[data-sin]', cc).onclick = () => {
          Estado.cambiar((d) => { d.ajustes.horasContrato = null; });
          cerrarHoja();
          tosti('Quitado');
        };
        $('[data-ok]', cc).onclick = () => {
          const valor = parseFloat($('#in-c', cc).value);
          if (!valor || valor <= 0) { tosti('Pon un número de horas', 'mala'); return; }
          Estado.cambiar((d) => { d.ajustes.horasContrato = { tipo, valor }; });
          cerrarHoja();
          tosti('Guardado', 'buena');
        };
      },
    });
  }

  function editarDesde() {
    const d = Estado.leer();
    const actual = d.ajustes.desde || d.creado || Dominio.hoyISO();
    const anio = Dominio.deISO(Dominio.hoyISO()).getFullYear();

    hoja({
      titulo: 'Cuento mis horas desde',
      sub: 'Tu patrón se puede pintar hacia atrás sin fin, pero esas horas serían una '
        + 'suposición, no un registro. Solo se suman las de esta fecha en adelante.',
      html: `
        <div class="campo">
          <label>Fecha de inicio</label>
          <input type="date" id="in-desde" value="${esc(actual)}">
        </div>
        <button class="btn" data-atajo="${anio}-01-01">Desde el 1 de enero de ${anio}</button>
        <button class="btn" data-atajo="${esc(d.creado || Dominio.hoyISO())}">Desde que instalé la app</button>
        <div class="aviso" style="margin-top:12px">
          <span>⚖️</span>
          <span>Ponla antes solo si tu patrón <b>realmente</b> era ese desde entonces.
          Un parte de horas vale como indicio precisamente porque es fiel.</span>
        </div>
        <button class="btn principal" data-ok style="margin-top:12px">Guardar</button>`,
      listo(cc) {
        const inp = $('#in-desde', cc);
        cc.querySelectorAll('[data-atajo]').forEach((b) => {
          b.onclick = () => { inp.value = b.dataset.atajo; };
        });
        $('[data-ok]', cc).onclick = () => {
          if (!inp.value) { tosti('Elige una fecha', 'mala'); return; }
          Estado.cambiar((x) => { x.ajustes.desde = inp.value; });
          cerrarHoja();
          tosti('Guardado', 'buena');
        };
      },
    });
  }

  function editarAviso() {
    const actual = Estado.leer().ajustes.avisoMinutos;
    const ops = [[0, 'Sin aviso'], [15, '15 minutos antes'], [30, '30 minutos antes'],
      [60, '1 hora antes'], [120, '2 horas antes'], [720, '12 horas antes']];

    hoja({
      titulo: 'Aviso antes del turno',
      sub: 'El aviso lo da el calendario de tu móvil, no la app: por eso funciona aunque esté cerrada.',
      html: ops.map(([v, t]) =>
        `<button class="btn ${v === actual ? 'principal' : ''}" data-v="${v}">${t}</button>`).join(''),
      listo(cc) {
        cc.querySelectorAll('[data-v]').forEach((b) => {
          b.onclick = () => {
            Estado.cambiar((d) => { d.ajustes.avisoMinutos = +b.dataset.v; });
            cerrarHoja();
            tosti('Vuelve a enviar tus turnos al calendario para que se aplique');
          };
        });
      },
    });
  }

  /* ---------- copia ---------- */

  function restaurar() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const texto = await f.text();
      if (!await confirmar({
        titulo: '¿Restaurar esta copia?',
        sub: 'Sustituirá todo lo que tienes ahora en la app.',
        aceptar: 'Sí, restaurar', peligro: true,
      })) return;
      const r = Exportar.restaurar(texto);
      tosti(r.ok ? 'Copia restaurada' : r.por, r.ok ? 'buena' : 'mala');
      if (r.ok) { App.aplicarTema(); App.ir('mes'); }
    };
    inp.click();
  }

  async function borrarTodo() {
    if (!await confirmar({
      titulo: '¿Borrar todos tus datos?',
      sub: 'Tu patrón, tus turnos y todos los días corregidos. No se puede deshacer, y no hay copia en ningún servidor.',
      aceptar: 'Borrar todo', peligro: true,
    })) return;
    Estado.reiniciar();
    location.reload();
  }

  return { iniciar, pintar };
})();
