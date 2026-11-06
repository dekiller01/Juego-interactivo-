# Neon Beat Rush

Shooter 3D en primera persona que corre en el navegador, con música reactiva y eventos de TikTok LIVE
(regalos, comentarios, likes y follows) que cambian lo que pasa en el juego.

## Qué hay aquí

- `index.html` y `three.min.js`: el juego completo (Three.js incluido).
- `server.js`: sirve el juego y reenvía los eventos de TikTok al juego por WebSocket (`/ws`).
- `render.yaml`: configuración para desplegar en Render con un toque.
- `build_public.py`: regenera `index.html` a partir del fragmento que edita Claude.

## Variables de entorno (Render → Environment)

| Variable | Para qué sirve |
|---|---|
| `TIKTOK_USER` | Tu usuario de TikTok sin `@`. Puede quedar vacío y ponerse desde el juego. |
| `ADMIN_KEY` | Clave para cambiar el usuario desde el juego. Render la genera sola. |
| `EULER_API_KEY` | Opcional. La librería firma la conexión con el servicio Euler Stream; sin clave usa límites gratuitos. |

## Desplegar en Render (desde el teléfono)

1. **GitHub**: crea una cuenta en github.com y un repositorio nuevo (por ejemplo `neon-beat-rush`, privado o público).
   Descomprime este ZIP y sube TODOS sus archivos con *Add file → Upload files*. Son archivos sueltos, sin carpetas.
2. **Render**: entra en render.com con tu cuenta de GitHub → *New + → Blueprint* → elige el repositorio.
   Lee `render.yaml` solo. Plan *Free*. Si te pide `TIKTOK_USER`, escribe tu usuario sin `@` (o déjalo vacío).
3. Cuando termine el despliegue, abre la URL `https://neon-beat-rush.onrender.com` (o la que te dé Render).
4. En el juego: ⚙ → DIRECTO → escribe tu `@usuario` y la `ADMIN_KEY` (Render → tu servicio → Environment) → CONECTAR TIKTOK.

El plan gratuito de Render duerme el servidor tras ~15 minutos sin visitas. Abre el juego unos minutos antes del directo.

## Seguir añadiendo cosas

Cada cambio que se sube al repositorio (rama principal) hace que Render vuelva a desplegar solo, en un par de minutos.
Si Claude cambia el juego, se vuelve a generar `index.html` (con `build_public.py`) y se sube ese archivo.

## Probar sin TikTok

Con `ADMIN_KEY` configurada, envía un evento falso:

```
curl -X POST https://TU-APP.onrender.com/api/event -H 'content-type: application/json' \
  -d '{"key":"TU_ADMIN_KEY","type":"chat","user":"ana","text":"!boss"}'
```

Tipos: `chat` (`text`), `gift` (`gift`, `count`, `diamonds`), `like` (`count`), `follow`.
Estado del servidor: `/api/status`.

## Reacciones del directo

**Comandos de chat** (cada espectador tiene su propio enfriamiento):

| Comando | Qué hace |
|---|---|
| `!ump` `!pistola` `!escopeta` `!sniper` | cambia el arma |
| `!granada` `!curar` `!lento` `!caos` | granada, curación, tiempo lento, horda |
| `!creeper` | tres explosivos |
| `!boss` `!dragon` `!fenix` | invoca jefe, dragón o fénix (dispara hielo) |
| `!toro` | un toro que embiste en línea recta |
| `!fantasma` | un fantasma que se teletransporta al ritmo |
| `!ayuda` | un dron aliado con su nombre, 12 s |
| `!congelar` | congela a todos 3 s |
| `!disco` | 10 s de luces y puntos x2 |
| `!medico` | un MÉDICO verde que huye; matarlo te cura |
| `!siguiente` | pasa a la siguiente canción de tu lista |

**Regalos**: por nombre (rosa, helado/GG, corazón, galaxia, león) activan un efecto propio (pétalos y vida, congelar,
escudo de amor, meteoritos, 4 drones). Los demás dependen de su valor: pequeños curan, medianos lanzan granadas,
grandes dan minigun y la nuke limpia el salón. Casi todos suman drones aliados con el nombre de quien envió el regalo.

**Likes**: barra de 100 likes; al llenarla hay fuegos artificiales, mejora y vida. **Seguir**: bonus y fuegos.
**Compartir**: carga de ultimate. Abajo en pantalla se ve el TOP 3 de fans de la sesión.

## Música

En la pantalla de inicio, **🎵 MI MÚSICA**: añade varias canciones a la vez desde el teléfono. Se guardan en el navegador
(no hace falta volver a elegirlas), suenan una detrás de otra, y puedes activar el modo aleatorio. Durante la partida
el botón ⏭ (arriba a la derecha) y el menú de pausa cambian de canción. Si solo hay una, se repite en bucle.

Usa música libre de derechos: la música comercial puede hacer que TikTok silencie o sancione el directo.

**Anillo de latido**: un anillo se cierra sobre la mira y llega justo en el siguiente latido; ahí destella. Disparar en ese instante
da el bono de daño al ritmo. La ventana es de 0,11 s después del latido y 0,07 s antes (antes solo existía la de después), así que
es más fácil acertar. Se redibuja solo en cada latido, así que no cuesta nada de rendimiento.

### Mapa por canción (v16)
Al añadir una canción, el juego la **analiza una sola vez** (en el menú, nunca durante la partida; unos segundos por canción) y guarda un
mapa diminuto en el teléfono: tempo (BPM), desfase del primer latido, secciones por compás (intro, subida, fuerte, pausa) y los momentos
de «caída». En la partida los latidos salen de ese mapa, calculados con el reloj del audio, en vez de adivinarse al oír la música. Así:
- el latido y el anillo caen en el instante exacto, sin adelantos ni retrasos;
- la fase (intro/subida/fuerte/pausa) y las caídas se conocen de antemano: aparece **¡PREPÁRATE!** unos 4 latidos antes de cada caída;
- si el análisis no es fiable (confianza menor a 0,35: tempo que cambia, música sin percusión, etc.) o la canción no tiene mapa, el juego
  vuelve solo a la detección en vivo de antes. En la lista cada canción muestra `128 BPM ✓` (mapa activo), `122 BPM ?` (poco fiable, no se usa),
  `✎` (ajustado a mano) o `sin mapa`.

En **🎵 MI MÚSICA → MAPA DE LA CANCIÓN** (toca el nombre de una canción para oírla; el punto de arriba late con el mapa):
- **½× / 2× TEMPO**: si el análisis cogió el doble o la mitad del tempo.
- **◀ −10 ms / +10 ms ▶**: mueve la rejilla si los latidos van un poco antes o después de lo que oyes.
- **TAP**: toca al ritmo (mínimo 5 toques) y el mapa se rehace con ese tempo y fase. Compensa la latencia del audio.
- **RE-ANALIZAR**: vuelve a analizar desde cero (borra tus ajustes a mano).
- **EXPORTAR / IMPORTAR**: guarda el mapa como un archivo `.nbrmap.json` de unos 150 bytes (solo números: **nunca incluye la canción**) para
  pasarlo a otro teléfono o hacer copia. Al importar se comprueba que la duración coincida (±2,5 s) con la canción elegida.
- **SINCRONÍA** (también en el menú de ajustes, −250 a +400 ms): para audífonos Bluetooth u otros con retraso. El juego ya descuenta la latencia
  que informa el navegador; este deslizador corrige el resto. Si ves el latido antes de oírlo, sube el valor; si lo oyes antes de verlo, bájalo.
  Vale también para la música interna del juego.

Perillas en el código (por si quieres tocarlas): `MAP_MIN` (confianza mínima para usar el mapa, 0,35).
Límites: probado con canciones sintéticas de tempo conocido, no con música comercial real; no entiende bien tempos que cambian durante la
canción ni intros sin percusión (para eso están ½×/2×, TAP y el respaldo en vivo).

## Movimiento y flujo (v17, inspirado en Tachyon Flow)

**Carrera por paredes y pilares**: si corres pegado a una pared del salón o a un pilar (a menos de ~1 m) avanzando a lo largo, entras en
*carril*: +22 % de velocidad (que además late con cada latido de la música), chispas en la superficie y la cámara se inclina ~6° hacia fuera.
Basta con empujar el joystick en diagonal contra la pared; no hay que saltar. Si te quedas quieto o te separas, sales del carril.

**FLUJO** (barra junto a RITMO): de 0 a 100.
- Sube: moviéndote (+4/s), en carril (+8/s extra y +2 por latido), disparando al latido (+2 por latido), esquivando al ritmo (+8) y con la esquiva perfecta (+25).
- Baja: poco a poco (−2/s), quieto más de 0,7 s (−12/s) y −30 de golpe cuando te hacen daño.
- Da hasta **+25 % de daño** y **+8 % de velocidad** al llegar a 100 («MÁX»). Es un bono moderado a propósito: premia moverse bien, no rompe el equilibrio.

**ESQUIVA** (botón **ESQ**, encima de DISPARO; en teclado Shift o Q): salto corto de ~4 m con 0,3 s de invulnerabilidad y 1,5 s de enfriamiento.
Sirve para todos los personajes (no sustituye a la habilidad de cada uno). Si lo haces *dentro de la ventana del latido*: invulnerabilidad 0,42 s,
enfriamiento un 40 % menor y +8 de flujo («AL RITMO»).
**ESQUIVA PERFECTA**: si un golpe te iba a alcanzar mientras eres invulnerable por esquivar (o por el DASH de Volt o el BLINK de Zero) no recibes daño y ganas:
cámara lenta de 0,4 s para el mundo (tú vas a velocidad normal), +25 de flujo y **CONTRAATAQUE** (+30 % de daño 3 s). Se puede repetir cada 0,8 s como mínimo.
El escudo de Titan no cuenta como esquiva perfecta.

Perillas en el código: `FLOW_DMG` (.25), `FLOW_SPD` (.08), `RAIL_SPD` (.22), `RAIL_GAP` (1.15 m), `DODGE_CD` (1.5 s).

## APK de Android (v18)

La APK es el mismo juego dentro de una app (Capacitor): el juego va empaquetado en el teléfono (arranca al instante y se puede jugar sin internet),
y para TikTok LIVE se conecta por WebSocket a tu servidor de Render, igual que en el navegador. Se compila en GitHub, sin ordenador.

Archivos en la raíz del repositorio: `index.html`, `three.min.js`, `server.js` (con CORS para la app), `apk_prepare.py` y `.github/workflows/apk.yml`.

**Compilar**: pestaña *Actions* → «Construir APK» → *Run workflow* (la dirección del servidor ya viene puesta). Tarda ~6-10 min. La APK queda en
*Releases* (`NeonBeatRush.apk`); el enlace fijo es `https://github.com/<usuario>/<repositorio>/releases/latest/download/NeonBeatRush.apk`.

**Firma (una sola vez)**: para que cada APK nueva se instale *encima* de la anterior sin perder tus canciones, crea dos *secrets* en
*Settings → Secrets and variables → Actions*: `KEYSTORE_B64` (el texto largo de la clave) y `KEYSTORE_PASS` (su contraseña). Sin ellos la APK se firma con una
clave de prueba que cambia en cada compilación (habría que desinstalar para actualizar). **Guarda la clave y su contraseña: si las pierdes no podrás actualizar la app.**
No subas la clave al repositorio.

**Qué cambia respecto a la web**: pantalla siempre encendida y a pantalla completa, siempre horizontal, icono neón. Las canciones y mapas son de la app
(no se comparten con el navegador): hay que volver a añadir las canciones dentro de la app. «EXPORTAR» mapa abre el menú de compartir de Android.
El botón atrás cierra la app. Cada cambio del juego (`index.html`) requiere compilar una APK nueva; el servidor se actualiza solo en Render.

## Rendimiento

⚙ → **RENDIMIENTO** tiene tres modos:

| Modo | Qué hace |
|---|---|
| `AUTO` | Mide los FPS y baja o sube solo la resolución y los detalles (5 niveles) para mantener fluidez. En pantallas de 90/120 Hz limita a ~60 FPS. |
| `AHORRO` | Límite de 30 FPS y menos detalles. Úsalo si el teléfono se calienta transmitiendo. |
| `MÁXIMO` | Siempre la mejor calidad, sin bajar nada automáticamente. |

⚙ → **MOSTRAR FPS** pone arriba a la izquierda `FPS · RES · nivel · dib`. Si algo sigue lento, esos números ayudan a ajustarlo.
Los efectos de pantalla (golpe, vida baja, escudo, velocidad) ahora se dibujan en una sola pasada dentro del propio juego.

## Controles y curación

- **Mira fija** en el centro. Arrastra el dedo por la pantalla para girar la cámara (no dispara).
- **Botón rojo DISPARO**: mantenlo para disparar. Si arrastras el dedo desde el propio botón, giras la cámara y sigues disparando.
  En ordenador, mantén la tecla `F` o `J`.
- **Curarte**: los enemigos sueltan **botiquines verdes ✚** (más seguido cuanto menos vida tienes; el que lleva más de 18 s sin soltar uno
  lo suelta seguro si estás por debajo de la mitad). Se recogen caminando cerca y duran 16 s. Con poca vida aparece un **MÉDICO** verde
  que huye: al matarlo recuperas el 25 %. Una flecha verde arriba te indica el botiquín o el médico más cercano, y también salen en el radar.
  Al curarte, la barra de vida brilla en verde.

## Dificultad, jefes y mejoras

- La vida de los enemigos sube **+9 % por nivel** y, además, un extra compuesto que sigue el ritmo de tus mejoras: **×1,025 por nivel del 12 al 100,
  ×1,018 del 100 al 130 y ×1,012 después**. Resultado: nivel 10 = ×1,8 · nivel 30 = ×5,6 · nivel 50 = ×14 · nivel 100 = ×87 · nivel 150 = ×274.
  A nivel 100 un zombi tiene ≈3.100 de vida y tu UMP (mejoras al azar) hace 200-400 por bala. La curva está en `hpMulAt` (en `index.html`).
  Los jefes tienen la misma curva completa, más +3 % por nivel hasta el 24, +0,4 % por nivel desde el 40 y **+35 % de tu bonificación CAZAJEFES**
  (cuantas más cartas CAZAJEFES apiles, más vida tienen al aparecer). Como máximo hay 2 jefes a la vez. Con el ejemplo del nivel 129 y 6 CAZAJEFES:
  ≈1,07 millones de vida (antes ≈313.000). **Daño del jefe**: +0,8 % por nivel desde el 20 (×1,9 en el 129, tope ×2,2) y ataca más seguido
  desde el nivel 60 (1 latido menos entre ataques) y el 100 (2 menos). Se ajusta con `bossHpMul`, `bossDmg` y `bossTempo` en `index.html`.
  Las habilidades y regalos (granadas, drones, supernova, tormenta, vacío…) escalan con la vida enemiga, y el NUKE mata todo menos jefes (a esos les quita el 50 %).
- **Pausa de mejoras**: cada 2 niveles (2, 4, 6…) el juego se detiene unos segundos (la música sigue) y eliges 1 de 3 cartas. La pantalla muestra la vida
  de los enemigos (`Enemigos ×1,81`) y tu daño actual. Si no eliges, a los 10 s se toma la primera carta (siempre es de poder: daño, cadencia, puntería o tu arma actual).
  Tarda 0,5 s en aceptar toques para evitar elecciones sin querer. En `index.html` está `UP_EVERY` si quieres que sea cada 3 niveles.
- Cartas: 🔥 DAÑO · ⚡ CADENCIA · 🎯 PUNTERÍA (crítico) · 🔋 CARGADOR · ➶ PERFORANTE · 💥 EXPLOSIVAS · 🩸 VAMPIRISMO · 👑 CAZAJEFES · 🛡 BLINDAJE · 👟 ZAPATILLAS
  y una por arma (PISTOLA+, UMP+, ESCOPETA+, SNIPER+). Cada una sale COMÚN, RARA o ÉPICA; con el nivel suben la probabilidad de rara/épica y un poco los valores.
- Las mejoras del mismo tipo **se suman** (no se multiplican), así tu daño crece parejo con la vida: con cartas al azar andas cerca de la vida
  de los enemigos (≈0,9× desde el nivel 10 hasta el 150); eligiendo bien vas 2-4× por delante y con mala suerte un poco por detrás, sin quedarte atascado.
- El jefe ya no se queda parado en el centro: persigue (sin frenarse cuando le disparas), rodea los pilares y, al ritmo de la música, alterna **¡SALTO!**
  (marca una zona rosa donde estás y cae encima), **¡EMBESTIDA!**, **¡RÁFAGA!**, **¡ONDA DE FUEGO!** y **¡REFUERZOS!**. Tras saltar o embestir queda
  **¡ABIERTO!** ~1,5 s (azulado, +50 % de daño). Con menos de la mitad de vida se enfurece.
- **El jefe es el tanque**: mientras haya un jefe vivo, el **95 % del daño de tus balas contra cualquier mob (pequeños, dragones y fénix) pasa al jefe**
  (el mob solo recibe el 5 %; sale un rayo magenta del mob al jefe) y los mobs pequeños van **+20 % más rápidos y pegan +25 % más** (brillan en magenta
  al ritmo). Así que hay que matar al jefe primero, y ningún disparo se pierde porque todos le llegan. No afecta al médico (el tuyo), al sanador
  (para poder matarlo) ni a habilidades y regalos (el NUKE sigue igual). Al caer el jefe, el enlace y el bono se acaban y los mobs quedan aturdidos 1 s.
  El 95 % es `TANK_LINK` en `index.html`.
- **SANADOR** (blanco con cruz y halo cian): desde el nivel 15 aparece uno (2 desde el 60, 3 desde el 125) que se queda a 12-18 m de ti y, en cada
  latido, **cura el 3 % de la vida máxima de todos los mobs menos el jefe** (brillan en verde agua y sale un anillo). Es frágil y se libra del enlace
  del jefe: mátalo primero si no quieres que los demás se regeneren. Ajustes: `HEALER_FROM` y `HEAL_PCT`.
- **Los enemigos aprenden**: el juego anota cómo juegas (qué arma llevas, cuánto te mueves, a qué distancia aciertas) con memoria de ~40 s, y
  hasta el **55 %** de lo que aparece sale de una lista que contrarresta eso (con sniper: más veloces y esquivos; con UMP: más tanques y
  divisores; con escopeta: más a distancia; si te quedas quieto: más escupidores y explosivos; si corres: más toros y corredores). Empieza en
  el nivel 3 y llega al máximo en el nivel 12. Avisa **una sola vez** ("LOS ENEMIGOS APRENDEN", sin decir a qué) la primera vez que se juega.
  Desde el nivel 125 el tope sube +0,4 % por nivel hasta el **75 %** (nivel 175). Si cambias de arma o de estilo, se adaptan de nuevo.
  Cuesta microsegundos y 0 dibujos extra. Tope en `LEARN_MAX`.

## Cómo seguir añadiendo cosas sin que se ponga pesado

Reglas que se siguen en cada mejora: reutilizar geometrías y materiales (nunca crear uno nuevo por enemigo o disparo), reutilizar objetos en vez de
crear y borrar (los proyectiles ya se reciclan), poner un **tope** a todo lo que se pueda acumular (proyectiles ≤ 90, zonas ≤ 12, drones ≤ 8, botiquines ≤ 3),
no usar luces dinámicas ni transparencias grandes superpuestas, y no tocar el HTML en cada fotograma. Además, cada cambio se mide con un banco de pruebas
con una escena muy cargada (2 jefes, ~25 enemigos, drones, proyectiles) comparando fotogramas por segundo, milisegundos de código por fotograma, llamadas de dibujo y memoria
antes y después. El selector de rendimiento (AUTO/AHORRO/MÁXIMO) baja la calidad solo si el teléfono no aguanta.

## Paneles (botón 👁)

Durante la partida, el botón 👁 (arriba a la derecha, junto a ⏭ ☠ ⚙) oculta o muestra al instante el contador de FPS,
el TOP 3 de fans, la barra de likes y el nombre de la canción. No pausa el juego. Se acuerda de tu elección.
También está en ⚙ como `PANELES: SÍ/NO`.

## Aviso

`tiktok-live-connector` no es oficial: TikTok puede romperlo con cambios. El servidor reintenta solo y
el resto del juego sigue funcionando con los botones de simulación.
