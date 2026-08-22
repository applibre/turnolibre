# TurnoLibre

**Tu cuadrante de turnos, y la cuenta de tus horas.** Gratis, sin cuenta, sin anuncios y sin que tus datos salgan de tu teléfono.

👉 **[applibre.github.io/turnolibre](https://applibre.github.io/turnolibre/)**

---

## Para quién es

Para quien no trabaja de nueve a cinco: enfermería, policía, bomberos, fábrica, seguridad, hostelería. Gente con una rotación que no coincide con el calendario de nadie más.

## Qué hace

**Te pinta el año entero.** Le dices tu rotación una vez —2-2-2, 7×7, 6×4, semana fija, o la tuya montada día a día— y le señalas qué turno tienes hoy. Con eso ya sabe pintarte cualquier fecha, hacia adelante y hacia atrás.

**Te lleva la cuenta.** Esto es lo que ninguna otra app hace: cuántas horas has trabajado **de verdad** frente a las que dice tu contrato, con el saldo del mes y del año. Aparte, el recuento de noches, festivos y domingos, que se pagan distinto.

**Te deja corregir.** Te cambian el turno, haces un doblete, te quedas dos horas porque no llegó el relevo. Tocas el día y lo ajustas en dos toques. La diferencia entre lo previsto y lo real es justo lo que nadie te cuenta.

**Te lo puedes llevar.** Un parte de horas para imprimir o llevar al sindicato. Tus turnos al calendario del móvil, con aviso antes de cada uno. Y una copia de seguridad completa, que es tuya.

## Lo que no hace, y por qué

- **No monta cuadrantes de equipo.** Eso necesita un servidor y es el negocio de otros. Aquí el usuario eres tú, no tu jefe.
- **No te localiza ni te hace fichar por GPS.** Sería convertirla en lo contrario de lo que es.
- **No calcula tu nómina en euros.** Cada convenio paga distinto la noche, el festivo y la hora extra. Contamos horas, que es objetivo.
- **No inventa historial.** El patrón se puede pintar hacia atrás sin fin, pero esas horas serían una suposición. Solo se suman las de la fecha que tú marques como inicio; lo anterior aparece rayado en el calendario y no cuenta en ningún total.
- **No te pide cuenta, ni correo, ni contraseña.** No hay nada que crear.

## Una advertencia honesta

El parte de horas es un **registro personal**, elaborado por ti a partir de tu propio cuadrante. No es un certificado de empresa ni sustituye al registro de jornada que la empresa está obligada a llevar. Sirve como **indicio**, que es justo lo que se pide para poder reclamar. Vender más que eso sería engañarte en algo serio.

## Dónde viven tus datos

En tu dispositivo, y en ningún sitio más. No hay servidor, no hay cuenta y nadie —ni nosotros ni tu empresa— puede verlos.

Eso tiene una contrapartida que conviene saber: **si borras los datos del navegador, se van.** Por eso hay copia de seguridad, y por eso conviene usarla. En iPhone, además, Safari borra el almacenamiento de las webs tras siete días sin visitarlas: **instálala en la pantalla de inicio** y eso deja de pasar.

## Instalar

No hace falta descargar nada. Abre la dirección y, desde el menú del navegador, elige «Añadir a la pantalla de inicio» o «Instalar aplicación». A partir de ahí funciona sin conexión, como cualquier otra app.

## Para quien quiera tocar el código

Sin compilar, sin dependencias, sin cadena de construcción. HTML, CSS y JavaScript a secas.

```bash
git clone https://github.com/applibre/turnolibre.git
cd turnolibre
python -m http.server 8000
```

Las pruebas del motor de cálculo van con el corredor que trae Node:

```bash
node --test tests/dominio.test.js
```

Estructura:

| Fichero | Qué hace |
|---|---|
| `js/dominio.js` | Todo el cálculo, en funciones puras y sin DOM: qué turno toca cada día, saldos, generación del calendario exportable |
| `js/almacen.js` | Guardado local, versión de esquema, migraciones y rescate si los datos se corrompen |
| `js/estado.js` | Un solo sitio donde cambian los datos, con aviso a las vistas |
| `js/vistas/` | Una pantalla por fichero |
| `tests/` | 47 pruebas del dominio |

Adáptalo a tu convenio, cámbiale los colores, tradúcelo. Es tuyo: licencia MIT.

---

Parte de **[applibre](https://github.com/applibre)** — herramientas libres, sin cuentas y sin anuncios.
