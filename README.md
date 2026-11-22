# Neon Beat Rush

Shooter 3D en primera persona que corre en el navegador, con música reactiva y eventos de TikTok LIVE
(regalos, comentarios, likes y follows) que cambian lo que pasa en el juego.

## Qué hay aquí

- `index.html` y `three.min.js`: el juego completo (Three.js incluido).
- `server.js`: sirve el juego y reenvía los eventos de TikTok al juego por WebSocket (`/ws`).
- `salas.js`: salas del multijugador (v22; v24 añade el modo de la sala); el servidor solo reparte mensajes entre los jugadores por WebSocket (`/mp`).
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
| `AUTO` | Mide los FPS y baja o sube solo la resolución y los detalles (6 niveles, de 100 % a 45 % de resolución) para llegar a 60 FPS. |
| `AHORRO` | Objetivo 30 FPS. Empieza en el nivel 2 (75 % de resolución, sin cascarones) y **baja solo hasta el nivel 5** si el teléfono no llega; si le sobra, vuelve a subir (nunca por encima del nivel 2). Ignora la «alta resolución». |
| `MÁXIMO` | La mejor calidad mientras vaya fluido. Red de seguridad: si cae por debajo de 30 FPS durante 3 s baja un escalón (como mucho hasta el nivel 2) y vuelve a subir solo cuando le sobra. |

⚙ → **MOSTRAR FPS** pone arriba a la izquierda `FPS · RES · N nivel · dib · k△ · JS ms` (v30). **JS ms** es lo que tarda el procesador en preparar cada cuadro: si los FPS son bajos pero JS es pequeño (menos de ~8 ms), el límite es la tarjeta gráfica; si JS es grande, es el procesador. Dime esos números y se ajusta mejor.
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
- **Dragones y fénix (v19)**: +37 % de vida base (`DRAGON_HP = 1.37`: DRAGÓN 300 → 411, FÉNIX 260 → 356 antes del escalado por nivel). El resto de enemigos y el jefe no cambian.
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

## Perfiles, datos de partida y ranking (v20)

**Perfil sin correo ni contraseña.** En el menú, **👤 PERFIL** → eliges un apodo (3 a 16 letras, números, espacio, `_`, `.` o `-`) y el juego crea tu
perfil. Te da un **código de recuperación** (`XXXX-XXXX-XXXX`): con tu apodo y ese código entras desde otro teléfono o desde la app. Guárdalo
(captura de pantalla o notas); quien lo tenga puede entrar a tu perfil. Desde el perfil también puedes cambiar el apodo, pedir un código nuevo
(el viejo deja de servir), cerrar sesión o **borrar tu perfil y todas tus partidas** del servidor. Jugar sin perfil sigue siendo posible: no se envía nada.

**Qué se guarda de cada partida** (solo si tienes perfil, partidas de más de 20 s): puntaje, bajas, nivel, duración, personaje, tiempo/disparos/precisión/
daño por impacto/distancia del impacto/críticos/bajas **por arma**, disparos y esquivas **al ritmo**, bajas por tipo de enemigo, mejoras elegidas,
tiempo que tardaste en cada nivel, daño recibido, metros recorridos, causa de la muerte, FPS (medio, mínimo, segundos bajo 30) y nivel de calidad,
BPM y si había mapa de ritmo, y el modelo de gráfica del teléfono (por ejemplo «Adreno 619») para saber qué dispositivos van justos.
**No se guarda** nombre real, correo, ubicación ni la IP. El juego avisa de todo esto al crear el perfil.

**Ranking**: botón **🏆 RANKING** (y al terminar cada partida). Pestañas PUNTAJE (mejor partida: bajas × combo) o BAJAS (suma), y 24 H / SEMANA / SIEMPRE. Sales
resaltado aunque no estés en el top. Si no hay conexión (o el servidor está despertando), la partida se guarda en el teléfono y se envía sola después.

**Anti-trampas (nivel amigos/hobby).** El puntaje lo manda el teléfono, así que alguien con ganas podría falsearlo. El servidor descarta las partidas
imposibles (bajas o puntos por segundo absurdos, nivel que no cuadra con las bajas, bajas por arma que no suman) y esas **no cuentan** para el ranking ni
para los récords. Si un jugador hace trampa de forma más fina, lo ocultas desde el panel. Límites: 6 perfiles nuevos por hora y por IP, 5 intentos de
recuperación fallidos y se bloquea un rato, una partida cada pocos segundos como mucho. Hay un filtro básico de apodos (palabras ofensivas y nombres como «admin»).

### Base de datos (para que el ranking no se borre)

Sin base de datos externa el servidor guarda todo en un archivo, **pero en el plan gratis de Render el disco se borra al reiniciar o actualizar**.
Para que sea permanente:

1. Entra en **neon.tech** y crea una cuenta gratis (no pide tarjeta). Crea un proyecto (nombre `neon-beat-rush`; elige una región cercana a tu servidor de Render).
2. En el panel del proyecto toca **Connect** y copia la **cadena de conexión** (empieza por `postgresql://`). Vale la versión normal o la «pooled».
3. En **Render** → tu servicio → **Environment** → **Add Environment Variable**: nombre `DATABASE_URL`, valor = la cadena copiada → **Save**. Render reinicia solo.
4. Abre `https://TU-SERVIDOR.onrender.com/admin/panel?key=TU_ADMIN_KEY` (la `ADMIN_KEY` está en Render → Environment). En «Estado» debe decir
   **PostgreSQL ✔ permanente**. Las tablas se crean solas; no hay que escribir SQL.

Supabase u otro Postgres también sirven (misma variable). Opcionales: `DATABASE_SSL=strict` (verifica el certificado; Neon lo permite) o `DATABASE_SSL=off`,
y `DATA_DIR` para cambiar dónde va el archivo cuando no hay base. Neon gratis se «duerme» tras unos minutos sin uso: la primera partida tras un rato
puede tardar un segundo más en guardarse; no se pierde nada. Las partidas completas se guardan 180 días; los récords y totales de cada jugador, siempre.

### Calidad gráfica inicial según el teléfono (v21)

El juego ya recordaba el nivel de calidad de **cada teléfono** después de jugar un rato. Lo nuevo: cuando un teléfono **nunca ha jugado** (instalación nueva,
otro navegador, la app), el juego le pregunta al servidor con qué nivel les va mejor a los demás **con la misma gráfica** (por ejemplo «Adreno 619») y arranca
ahí, en vez de empezar en el nivel 1 y bajar a tirones durante los primeros segundos.

- Se calcula con las partidas en modo **AUTO**: se mira en qué nivel pasó el tiempo cada teléfono (mediana por segundos). 0 es la calidad más alta y 4 la más baja; el inicio nunca pasa de 3.
- Solo recomienda con datos suficientes: **3 partidas, 5 minutos y 2 jugadores distintos** con esa gráfica. Si no, no cambia nada y el juego se ajusta solo, como antes.
- No toca nada si el teléfono ya tiene su nivel guardado, si elegiste AHORRO o MÁXIMO a mano, si hay una partida en curso o si el servidor no responde. Pregunta como mucho una vez cada 6 horas.
- No necesita perfil: la pregunta no lleva datos personales, solo el modelo de gráfica. Las partidas sospechosas y las manuales no cuentan.
- En el panel, la tabla de rendimiento tiene una columna **Inicio** con lo que se recomendaría a un teléfono nuevo con esa gráfica («–» si aún no hay datos suficientes).
- Cada partida guarda ahora los **segundos que pasó en cada nivel de calidad** (campo `qh`).

### Panel del dueño (`/admin/panel?key=…`)

Pensado para verse en el teléfono: estado del almacenamiento, **rendimiento por dispositivo** (FPS medio, % del tiempo bajo 30 FPS y calidad media por
gráfica: si un modelo pasa del 15 % bajo 30 FPS hay que bajarle la carga), **armas** (uso, disparos, precisión, % al ritmo, daño por impacto, críticos, distancia,
bajas), **niveles** (cuántos llegan a cada uno y cuánto tardan en superarlo), bajas por enemigo, **cómo terminan las partidas**, ritmo y esquivas (con mapa vs.
detección en vivo), mejoras elegidas, personajes y la lista de jugadores con **Ocultar/Mostrar/Borrar**. Periodo 1, 7 o 30 días. **Descargar partidas (JSON)**
saca todas las partidas sin tokens ni códigos, por si quieres analizarlas aparte. Una captura del panel es la forma más fácil de enseñármelo para afinar el juego.

APIs (por si las necesitas): `POST /api/p/registro|recuperar|apodo|codigo|salir|borrar|partida`, `GET /api/p/yo`, `GET /api/p/ranking?por=score|kills&per=day|week|all&n=20`.
La app Android usa las mismas (el servidor ya acepta su origen). **Hace falta volver a ejecutar «Construir APK»** para que la app traiga el perfil y el ranking.

## Multijugador: en equipo y todos contra todos (v22 · v23 · v24)

Hasta **4 jugadores** en la misma arena: en equipo contra los mismos enemigos, o todos contra todos. Se entra desde el menú con **👥 MULTIJUGADOR**.

- **Crear sala:** el anfitrión pone su apodo y pulsa CREAR SALA. Sale un código de 4 letras y un enlace (`…/?sala=ABCD`) que se comparte con el botón COMPARTIR ENLACE. Quien abre el enlace ya llega a la pantalla de la sala con el código puesto; solo pone su apodo y pulsa UNIRME. También se puede escribir el código a mano.
- **Empezar:** solo el anfitrión ve EMPEZAR. Puedes empezar solo, para probar. Con la partida en marcha no entra nadie más (se espera a la siguiente).
- **Cómo funciona:** el teléfono del **anfitrión** corre toda la partida (enemigos, jefes, niveles, música). Los demás ven lo que ocurre (10 veces por segundo), se mueven y disparan en su teléfono y le mandan al anfitrión sus golpes. El servidor no ejecuta el juego, solo reparte mensajes, así que consume muy poco. **Si el anfitrión se sale, la partida termina para todos** (todavía no hay cambio de anfitrión).
- **Vida individual:** cada uno tiene su propia vida y sus propias mejoras. Los enemigos persiguen **al jugador vivo más cercano**, y las explosiones, el fuego y los proyectiles hieren a cualquiera que esté dentro. Hay más enemigos y con algo más de vida según cuántos jugáis (+40 % de vida y +50 % de enemigos por cada jugador extra, con tope de 40 a la vez).
- **Caer y reanimar:** al quedarte sin vida no pierdes: quedas **caído** y un compañero vivo que se quede a menos de 3 m te reanima en unos 2,5 s (vuelves con la mitad de vida y 2,5 s de protección). La partida termina cuando **todos** han caído y se ve un marcador del equipo.
- **Mejoras:** al subir de nivel (el nivel es del equipo, por bajas totales) cada uno elige su mejora **sin pausar la partida**: mientras eliges no te pueden herir.
- **Música propia y ritmo independiente (v24):** cada jugador oye **su propia música** (su archivo, el mapa de ritmo de su canción o el sintetizador con sus BPM) y el **bono de ritmo es suyo**: disparar al compás de *tu* canción da tu bonus, aunque los demás vayan con otra. No hace falta tener el mismo archivo. Lo que sí es común de toda la partida: los enemigos, los jefes, los niveles y su dificultad, que los marca el teléfono del anfitrión (con *su* música); los invitados sienten además sus propios latidos (pulso, anillos, avisos de caída), pero esos latidos no hacen aparecer ni mover enemigos. Sustituye a la sincronía de canción de la v23.
- **Modo de la sala (v24):** el anfitrión elige en la sala **🤝 EN EQUIPO** o **⚔ TODOS CONTRA TODOS** (los demás ven cuál está elegido, pero solo él lo cambia).
- **Todos contra todos (v24):** partida de **5 minutos** en la misma arena, con los monstruos todavía presentes. Ahora **tus disparos también aciertan a los demás jugadores** (cuerpo y cabeza ×1,35, con crítico, bonus de ritmo, mejoras y armas como siempre) pero con el **30 % del daño** que le harías a un monstruo, para que no sea una carnicería de dos segundos. Cada jugador sale en un punto distinto del salón. Si alguien te queda sin vida, **eliminas a un jugador**: ganas **+300 puntos** (si diste el último golpe en los 8 s anteriores) y sale el aviso «Ana eliminó a Beto». El eliminado **reaparece solo a los 3,5 s** en un punto lejos de los demás, con la vida llena y 2,5 s de protección; mientras dura esa protección no se le puede dañar. Arriba aparece el reloj y tus eliminados (⚔); en la lista de la izquierda, los de cada rival. **Gana quien tenga más puntos** (monstruos + eliminaciones) cuando se acaba el tiempo; en la pantalla final cada fila lleva sus eliminados, muertes y daño. En este modo no hay reanimar compañeros y la dificultad no sube por jugador extra.
- **Marcador de equipo (v23):** al terminar sale cada jugador con puntaje y bajas, y debajo su **daño**, **reanimaciones** y **mejor combo**; arriba el resumen del equipo (bajas totales y tiempo) y un 🏆 para quien más puntos hizo. El daño de los compañeros lo cuenta el anfitrión con los golpes que le llegan.
- **Arranque más suave (v23):** el anfitrión empieza con la calidad gráfica un poco más baja (nivel 2) cuando está en AUTO, y sube sola si el teléfono va sobrado. Así se evitan los tirones de los primeros segundos mientras el juego se ajusta.
- **Ranking (v25):** las partidas multijugador **suman tus bajas al ranking de BAJAS** (con perfil creado). No entran en el ranking de **puntaje** ni cambian tu **récord** ni tu mejor nivel de solitario. Mira «Novedades v25».
- **Seguridad:** el servidor limita mensajes por segundo, tamaño, salas por IP y solo acepta conexiones desde el propio sitio y la app. Los apodos se limpian de símbolos raros.
- **Límites conocidos:** las habilidades que afectan a todos los enemigos a la vez (tiempo lento, vacío, congelar) solo los afectan en el teléfono del anfitrión; los demás ven sus golpes, pero el empuje no se comparte. El anfitrión necesita un teléfono medianamente bueno (corre todo). Si la conexión de un invitado se corta más de 9 s, su partida termina.
- **App Android:** hace falta volver a ejecutar «Construir APK» para que la app traiga el multijugador. La app usa el mismo servidor, así que debería poder entrar a las mismas salas que la web (no se ha probado todavía en un teléfono real).
- `GET /api/status` muestra cuántas salas y jugadores hay ahora mismo (`multijugador`).

## Novedades v25: menú, ranking, habilidades y modelos 3D

- **Menú que se desliza en todas partes:** antes solo se podía deslizar tocando el borde derecho vacío, porque `touch-action:none` estaba puesto en todo y un hijo no puede devolver el deslizado que su padre bloquea. Ahora todo lo que hay dentro de los menús (títulos, botones, tarjetas, listas) deja pasar el deslizado vertical, también en perfil, ranking, música, multijugador y el cajón de pausa. Los deslizadores (BPM, volumen) siguen funcionando con el dedo. Probado con un dedo simulado (`t60.js`).
- **Multijugador en el ranking de BAJAS:** al terminar una partida multijugador se envía con `mp:1` (y si fue todos contra todos, `pvp:1`, y cuántos jugaban). El servidor la suma a tus **bajas totales** (ranking de bajas de siempre / semana / día). No cambia el ranking de puntaje, el récord ni el mejor nivel. En el panel del dueño las partidas multijugador salen aparte («Partidas multijugador») y no ensucian las estadísticas de solitario. Solo cuentan bajas de **monstruos**; los «frags» de jugadores en todos contra todos no se suman. La comprobación anti‑trampas sigue activa (no se valida el nivel contra las bajas en multijugador porque el nivel es del equipo).
- **Habilidades reforzadas.** SUPERNOVA era la mejor siempre; ahora cada última tiene su propio hueco (NOVA se deja igual):

  | Personaje | Habilidad | Antes | Ahora |
  |---|---|---|---|
  | VOLT | DASH | espera 3,2 s | espera 2,6 s, daña fuerte (60) en 2,6 m |
  | VOLT | TORMENTA | rayos durante 2,5 s | 3,5 s de rayos más rápidos que se propagan; uno de cada cuatro va a por el más fuerte; sales invulnerable 1 s |
  | ECHO | LENTO | espera 16 s, 4 s | espera 13 s, 5,5 s y +30 % de daño tuyo |
  | ECHO | ECO | 6 s, cadencia ×2 y daño ×2 | 9 s, cadencia ×2, daño ×2, **munición infinita**, siempre al ritmo, cada bala perfora 2 más y rebota un eco (60 %); cura 20 % |
  | TITAN | ESCUDO | espera 14 s | espera 11 s y suelta una onda (60 de daño, 8 m) |
  | TITAN | FURIA | 8 s, daño ×2 y balas explosivas | 10 s, balas explosivas enormes, onda inicial (220, 12 m), escudo 3,5 s y cura 30 % |
  | ZERO | BLINK | espera 4,5 s | espera 3,8 s y daña fuerte (60) en 5,5 m |
  | ZERO | VACÍO | atrae y estalla a los 3 s | atrae en 22 m durante 4 s, tritura y estalla (radio 12, daño 420) |

  Cada una queda con su nicho: SUPERNOVA borra de golpe a los pequeños, TORMENTA da presión sostenida y castiga al fuerte, VACÍO agrupa y revienta, FURIA aguanta y limpia en área, ECO es la mejor contra un solo objetivo grande (jefes). Hay también 5 mejoras nuevas ligadas a las últimas (no salen de regalo aleatorio). Los números salen de una **simulación con disparo automático** (`t62.js`), no de partidas reales: si alguna sigue sobrando o quedándose corta, basta cambiar un número en `CHARS`.
- **Modelos 3D:** los 15 enemigos tienen su propio modelo (zombi con costillas y garras, corredor con casco y mochila propulsora, tanque con hombreras de pinchos, escupidor con saco de ácido, toro con cuernos y argolla, médico con bata y cruz, sanador con túnica y báculo, jefe con corona y capa, dron con hélice, fantasma, bomba con pinchos y mecha, gelatina y cría, dragón con alas membranosas y fénix con plumas). Cada uno de los **5 héroes** también tiene el suyo: VOLT (rayo y aletas), NOVA (estrella y corona), ECHO (auriculares y ecualizador), TITAN (armadura y escudo) y ZERO (capucha y orbe de vacío).
  - **Dónde se ven:** en el **menú** (vista previa que gira junto a la descripción; arrastra con el dedo para girarlo), en **multijugador** (los compañeros aparecen con el modelo de su héroe, caminan, apuntan y llevan un anillo de su color) y en **tu mano** (guante del color de tu héroe sobre el arma). En solitario no se ve tu cuerpo porque es primera persona.
  - **Cómo están hechos:** con piezas simples fusionadas en una sola malla con color por vértice y luz «horneada», porque la escena solo tiene luz ambiente. Las partes que se mueven (brazos, piernas, cabeza, cola, alas, hélice) son mallas aparte, con los mismos nombres que usa la animación de siempre; por eso el destello al recibir daño, el aviso de ataque, la congelación y los puntos de cabeza (headshot) siguen igual. Medido con 30 enemigos + jefe + dragón: 189 llamadas de dibujo (antes 206) y unos 43 000 triángulos (antes unos 12 000). Es más pesado en triángulos pero poco en llamadas; el modo AUTO de calidad sigue bajando si el teléfono sufre, y con calidad baja se quitan los brillos de contorno.
  - **Ver todos los modelos:** `nbr/t63.js` (enemigos), `t64.js` (héroes y menú), `t65.js` (partida real).
  - Es una **primera tanda** de modelos procedurales (formas sencillas). Se pueden ir puliendo uno a uno desde `models25.js` sin tocar nada más.
- **No se ha probado en teléfonos reales:** todo esto pasó en el navegador de pruebas (con tarjeta gráfica por software). Falta ver cómo va de rápido en tu teléfono y si el deslizado se siente bien con tu dedo.
- **Para actualizar:** sube `index.html` y `perfiles.js` (`salas.js` y `server.js` no cambian), espera a que Render termine de desplegar, y vuelve a ejecutar «Construir APK» si usas la app.

## Novedades v26: puertas, créditos y laberintos que cambian (solo en solitario)

Como en los mapas de zombis de Call of Duty: empiezas en la sala de siempre y vas **ganando créditos** para **abrir puertas** y ampliar el mapa.

- **Créditos (CR):** se ganan matando enemigos (según lo fuerte que sea: zombi 4, tanque 11, dragón 51, jefe 126…). Solo cuentan dentro de la partida; al terminar o empezar otra se ponen a 0. Se ven bajo la puntuación (en verde cuando ya te alcanzan para abrir una puerta).
- **Las 4 puertas:** una en cada pared de la sala (NORTE, SUR, ESTE, OESTE), con su precio escrito. La primera cuesta **300 CR**, la segunda **600**, la tercera **1000** y la cuarta **1500** (el precio sube con cada puerta que abres, da igual cuál elijas). Acércate (7 m) y aparece el botón **ABRIR PUERTA** (en el ordenador, tecla **R**; la F ya es disparar). Si te faltan créditos te dice cuántos.
- **El laberinto:** detrás de cada puerta hay un ala de **5×5 celdas** (pasillos de 6 m de ancho, muros de 2 m) con enemigos esperando (desde la v27 esperan en las **minizonas**; ver v27 y v28 más abajo). Los enemigos de la partida también aparecen ahí y te **persiguen por los pasillos** (siguen el camino más corto hasta ti; si tienen línea libre van directos). Las balas, los proyectiles y los escupitajos **chocan con los muros**; los enemigos no te atacan ni te disparan a través de una pared. El fantasma (que se teletransporta) y el dragón (vuela) sí pasan por encima.
- **El laberinto cambia solo:** cada 70 s de partida (desde que abres la primera puerta) se avisa con **5 s de cuenta atrás** («¡EL LABERINTO CAMBIA!», temblor y pitidos): los pasillos que se van a **cerrar** salen en **rojo** y los que se van a **abrir** en **verde**. Pasado el aviso, los muros suben y bajan en 1 s. Siempre se cierra tantos pasillos como se abren, y **siempre queda un camino entre todas las celdas** y hasta la sala (se comprueba antes de cerrar cada uno); un muro nunca se cierra encima de ti ni de un enemigo (si hay alguien justo ahí, ese muro no se cierra). Así no puedes quedarte atrapado, pero el mapa que memorizaste ya no vale.
- **Interruptor en Ajustes (⚙):** botón **LABERINTO: SÍ/NO** (junto a CALIDAD; se aplica en la próxima partida). Con NO el juego es como el v25 (solo la sala). **En multijugador está desactivado** (primero solo en solitario).
- **Cómo está hecho:** `world26.js` (se mete dentro de `index.html`) usa una cuadrícula de baldosas de 1 m. Choques con círculos contra baldosas (pasos cortos para no atravesar muros ni con el impulso), rayos DDA para balas y línea de visión, y un campo de distancias (BFS) desde el jugador para que los enemigos sepan por dónde ir. Las paredes, suelos y techos de las alas son **3 mallas** (se regeneran al abrir una puerta o al cambiar el laberinto), por lo que casi no añaden llamadas de dibujo. Mientras no abras ninguna puerta, todo funciona exactamente como en v25.
- **Pruebas:** `nbr/t73.js` (todo alcanzable, rayos contra fuerza bruta, colisiones con 24 000 pasos aleatorios, 60 patrullas que llegan siempre, 40 reordenados seguidos sin romper nada), `t74.js` (enemigos recorriendo pasillos, balas contra muro, créditos, jefe y dragón en el ala, rendimiento), `t70/t71/t75.js` (capturas).
- **Honesto:** no se ha probado en teléfonos reales (sí en el navegador de pruebas). Es una **primera versión**: los enemigos son los de siempre (no hay enemigos ni objetos propios del laberinto, ni minimapa de pasillos). Las partidas con laberinto cuentan igual en los rankings que las de sala sola.
- **Para actualizar:** sube solo `index.html` (`perfiles.js`, `salas.js` y `server.js` no cambian), espera a que Render termine de desplegar y vuelve a ejecutar «Construir APK» si usas la app.

### ¿Se puede repartir el trabajo entre varios servidores?
El juego **no** se procesa en el servidor: la física, los enemigos y los gráficos corren en el teléfono de cada jugador. El servidor solo sirve el archivo, reparte los eventos de TikTok y hace de «cartero» entre jugadores del multijugador. Por eso un mapa más grande **no carga el servidor**, solo el teléfono. Lo que sí se podría separar (si algún día hiciera falta) es el archivo del juego (hosting estático gratis) del servidor de TikTok/salas, pero hoy no compensa. Si quieres, se puede añadir un medidor de carga en `/api/status` para decidirlo con datos.

## Novedades v27: minizonas (salas abiertas dentro del laberinto)

Problema detectado jugando: en los pasillos de 6 m no hay espacio para rodear al enemigo ni esquivarlo, así que meterse ahí era casi un suicidio. Ahora cada ala tiene **2 minizonas**: salas abiertas donde sí puedes moverte y esquivar.

- **Cómo son:** cuadrados de **14 × 14 m** sin paredes internas (vs. 6 m de ancho de los pasillos), con **2 columnas de cobertura** (2 × 2 m, en diagonal) para rodearlas, taparte de las balas y hacer que los enemigos te sigan dando vueltas. Cada ala tiene una sala en cada lado (una a la izquierda y otra a la derecha), a distinta profundidad, y su posición cambia en cada partida.
- **Cómo se reconocen:** un **anillo cian en el suelo** en el centro de cada sala (lo ves al entrar; en el suelo, así que los muros lo tapan desde fuera).
- **Qué no cambia:** cuando el laberinto se reordena (cada 70 s) **el interior de las salas nunca se llena de muros** (sus conexiones internas están bloqueadas como abiertas). Los pasillos de alrededor sí se reordenan como antes, así que las entradas a la sala cambian de sitio, pero el laberinto siempre está conectado: siempre hay camino hasta cada sala.
- **Dónde aparecen los enemigos:** los **guardias** (4–7 según cuántas puertas lleves) aparecen dentro de las salas, y **aproximadamente la mitad de las apariciones de enemigos** (en cuanto hay alguna puerta abierta) también caen dentro de las salas (el resto sigue saliendo por los pasillos y la sala inicial). Así las salas son los sitios con pelea: entras, esquivas y rodeas; los pasillos sirven para ir de una a otra y para huir.
- **Solo en solitario**, igual que el laberinto; se desactiva con el interruptor **LABERINTO** en Ajustes (⚙). Con el laberinto en NO, el juego es como el v25.
- **Pruebas:** `nbr/t73.js` (ahora 16 comprobaciones: 2 salas por ala, 188 casillas abiertas en cada sala, las conexiones internas de las 2 salas siempre abiertas tras 40 reordenados, salas en lados opuestos, más del 45 % de las apariciones en salas), `t74.js`/`t76.js` (partida real y 40 s de prueba continua), `t79.js` (botón de la puerta con el dedo), capturas con `t80.js` y plano con `t81.js` (`salas_v27.png`).
- **Honesto:** no se ha probado en teléfonos reales. Es una **primera versión** de las salas: tamaño (14 m), columnas y porcentaje de enemigos en salas son valores que se pueden ajustar según lo que sientas jugando (si todavía es difícil, se puede hacer la sala más grande o poner menos enemigos en los pasillos). No hay objetos ni recompensas propias de las salas todavía.
- **Para actualizar:** sube solo `index.html` (`perfiles.js`, `salas.js` y `server.js` no cambian), espera a que Render termine de desplegar y vuelve a ejecutar «Construir APK» si usas la app.

## Novedades v29: alas unidas por parejas y mapa dentro del juego

**Puertas (igual que la v26):** siguen existiendo las **4 puertas** (NORTE, SUR, ESTE, OESTE), cada una abre solo su ala y cuestan 300 / 600 / 1000 / 1500 CR (sube con cada puerta que abres).

**Alas unidas por parejas (nuevo):** al empezar cada partida las 4 alas se emparejan **al azar** en 2 parejas de alas vecinas:
- Opción 1: **NORTE↔ESTE** y **SUR↔OESTE**
- Opción 2: **NORTE↔OESTE** y **SUR↔ESTE**

Cada pareja se une por **un pasillo de unión** (6 m de ancho, por la esquina, con una forma distinta cada partida). El pasillo **aparece cuando abres las dos alas de la pareja** (en cualquier orden): entras por una puerta, cruzas por la esquina y sales por la puerta de la pareja. Entre una pareja y la otra no hay unión (solo se pasa por la sala). Dos pasillos en total = las «2 salidas». Cada cartel de puerta ahora dice «SE UNE CON …». Los pasillos de unión son **fijos**: el reordenado de cada 70 s no los toca (las alas siguen siempre conectadas por dentro), y los enemigos los usan para perseguirte.

**Mapa dentro del juego (nuevo):** botón **MAPA** (debajo del radar, a la izquierda; tecla **M** en ordenador). Muestra el plano del laberinto **en vivo** (no tapa los toques: sigues apuntando y disparando con el plano abierto):
- se acerca o aleja solo según las alas que tengas abiertas;
- tú (▲ amarillo, mirando hacia donde miras), los enemigos (puntos rojos), las **minizonas** (cian), los **pasillos de unión** (morado) y las puertas aún cerradas (doradas, con su precio y la inicial: N 300, E 300…; en verde si te alcanza);
- «**CAMBIA EN n s**»: cuenta atrás del próximo reordenado; durante el aviso marca en **rojo** los pasillos que se cierran y en **verde** los que se abren;
- solo aparece en partidas en solitario con el laberinto activado (Ajustes ⚙ → LABERINTO).

- **Pruebas:** `nbr/t84.js` (18 comprobaciones: 4 puertas siempre, parejas simétricas y de las 2 formas, precios 300/600/1000/1500, el pasillo solo aparece al abrir la 2.ª ala de la pareja en cualquier orden, con las 4 abiertas hay exactamente 2 bloques unidos fuera de la sala, las esquinas solo tienen los 2 pasillos, 30 reordenados con las uniones abiertas, botón MAPA con el dedo, el plano no tapa los toques, contenido del plano, sin botón con el laberinto apagado), más `t73.js`, `t74.js`, `t76.js`, `t79.js` y las de siempre; capturas en `mapa_v29.png`.
- **Honesto:** no se ha probado en teléfonos reales. El plano muestra todo lo abierto (no hay niebla de «lo ya explorado»). Si quieres, el siguiente paso es un minimapa pequeño siempre visible, o que el mapa solo muestre lo que ya has recorrido.
- **Para actualizar:** sube solo `index.html` (`perfiles.js`, `salas.js` y `server.js` no cambian), espera a que Render termine de desplegar y vuelve a ejecutar «Construir APK» si usas la app.

## Novedades v30: rendimiento (FPS que bajaban a 15–20)

**Qué se cambió (sin cambiar el aspecto ni el juego):**
- **Enemigos lejanos = 1 dibujo.** Un humanoide eran 6–8 mallas (torso, cabeza, 2 brazos, 2 piernas, cascarón, ojos). Más allá de 13 m (20 m en MÁXIMO) se dibuja una sola malla fusionada con la misma forma y color; al acercarse recupera las piezas animadas (con histéresis, sin parpadeos). Los ojos solo se dibujan cerca. Jefe y dragón no se simplifican.
- **Enemigos tras una pared no se dibujan** (laberinto): si ninguno de 3 rayos (centro y los lados) llega a ellos, quedan ocultos; a menos de 7 m siempre se ven. La lógica (IA, disparos, mapa) no cambia.
- **Laberinto:** las marcas de las minizonas pasan de 2 mallas transparentes a 1 por sala y las que están a más de 46 m no se dibujan. El mapa guarda su capa estática y solo la repinta cuando cambia el laberinto (antes ~1,2 ms en ordenador cada 0,2 s con el mapa abierto).
- **Efectos de pantalla:** el pulso del ritmo, el escudo y el clímax solo tocan los bordes, así que ahora usan un marco de 84 px en vez de cubrir toda la pantalla (la mitad de píxeles en un móvil apaisado). Daño, vida baja, flash y líneas de velocidad siguen a pantalla completa.
- **Calidad adaptativa en todos los modos** (antes AHORRO era fijo y MÁXIMO también): 6 niveles (resolución 100/85/75/65/55/45 %, partículas, cascarones, distancia de LOD, frecuencia del HUD). Ver la tabla de arriba. Los niveles que elige AHORRO/MÁXIMO por sí solos no se guardan; solo AUTO recuerda su último nivel.
- **AHORRO ya no usa «alta resolución»** (antes con ese ajuste activo dibujaba a 1,5× la pantalla incluso en AHORRO).
- Con la calidad en nivel 3 o menos el HUD (marcadores y ecualizador) se actualiza la mitad de veces.

**Medido (ordenador, GPU por software; 28 enemigos, mediana de 3 mediciones, misma máquina, v29 → v30):**

| | dibujos | tiempo de dibujado AHORRO | tiempo de dibujado MÁXIMO |
|---|---|---|---|
| laberinto | 115 → 62 (−46 %) | 17,1 → 13,3 ms (−22 %) | 32,5 → 25,5 ms (−22 %) |
| arena, enemigos a 18–38 m | 120 → 74 (−38 %) | no comparable: la calidad adaptativa de la v30 bajó un nivel durante la medición | idem |

Mallas de enemigos dibujadas en el laberinto: ~158 → 33–41 (según dónde caigan). No hay fugas: tras 1200 enemigos creados y destruidos las geometrías, programas y memoria se mantienen estables.

- **Pruebas nuevas:** `nbr/t97.js` (19 comprobaciones: LOD con los 7 tipos de humanoide y mismo volumen que las piezas, histéresis, marco/pasada completa de efectos, controlador adaptativo de los 3 modos con 15/20/25/30/45/60 FPS simulados, enemigos tras paredes ocultos y visibles coherentes con la línea de visión, jefe y dragón nunca ocultos, marcas fusionadas y ocultas a distancia, mapa en caché), `t93.js`/`t95.js`/`t98.js` (mediciones), `t96.js` (fugas). Pasan también `t84` (18), `t73` (16), `t74` (7), `t76`, `t79` (6), `t67` (16), `t60` (11), `t15`, `t41`.
- **Honesto:** no se ha probado en teléfonos reales y la GPU del probador es por software, así que los milisegundos no se pueden trasladar tal cual a tu móvil; lo fiable son los **dibujos (−40 a −46 %)** y que ahora AHORRO y MÁXIMO bajan solos de calidad si no llegan. La lógica y el HUD corrían a 60 FPS incluso con la CPU frenada ×4: el cuello de botella es el dibujado 3D (número de dibujos y píxeles), que es lo que se ha atacado. Si tu móvil sigue yendo mal, activa ⚙ → MOSTRAR FPS y dime los números de `JS ms` y el nivel.
- **Para actualizar:** sube solo `index.html` (`perfiles.js`, `salas.js` y `server.js` no cambian), espera a que Render termine de desplegar y vuelve a ejecutar «Construir APK» si usas la app.

## Novedades v31: el rendimiento de la v30, también en multijugador

**Qué ya valía en multijugador desde la v30** (comparte el mismo código): los enemigos humanoides lejanos se dibujan con 1 malla (en el anfitrión y en los fantasmas del invitado), la calidad adaptativa de AHORRO/MÁXIMO/AUTO, el marco de efectos de borde, el HUD menos frecuente en calidad baja y «AHORRO sin alta resolución». Lo de «enemigos tras paredes» solo aplica al laberinto, que es de un solo jugador.

**Nuevo en la v31 (lo que faltaba):**
- **Los compañeros también se simplifican a distancia.** Un avatar eran 6 piezas del héroe + anillo + nombre + 2 barras. Más allá de la distancia de LOD (13 m en AHORRO, 20 m en MÁXIMO) se dibuja una sola malla del héroe **con el brazo ya en pose de apuntar** (idéntico a las piezas, comprobado en una captura lado a lado) y no se animan las piernas ni los brazos.
- **La barra de vida del compañero se oculta a más de 30 m** (el nombre y el anillo de color se siguen viendo para localizarlo). Al acercarse vuelve todo.
- Funciona igual en **EN EQUIPO** y en **TODOS CONTRA TODOS**, y para el anfitrión y los invitados.

**Medido (3 jugadores reales: anfitrión + 2 invitados, ~40 enemigos, un compañero a 42 m y otro a 4 m; GPU por software con 3 navegadores a la vez; calidad fijada en el nivel 2; vista del invitado):**

| | v29 | v30 | v31 |
|---|---|---|---|
| dibujos | 274 | 175 | 124 (−55 % respecto a la v29) |
| tiempo de dibujado | 103 ms | 86 ms | 75 ms |

(la diferencia v30 → v31 incluye algo de variación de dónde caen los enemigos en cada medición). Tráfico: un invitado recibe 12–19 KB/s con ~40 enemigos, razonable para datos móviles.

- **Pruebas:** `nbr/t100.js` (16 comprobaciones con 3 jugadores reales y `PVP=1 node t100.js` para todos contra todos: avatar lejano en 1 malla sin barra, cercano con 6 piezas y barra, el invitado ve igual, LOD coherente con la distancia en anfitrión e invitado, al acercarse vuelve a las piezas, el brazo apuntando está en la malla LOD, tráfico razonable, sin errores), `t101.js` (comparativa de dibujos entre versiones), `t102.js`/`t103.js` (capturas). Siguen pasando `t97` (19), `t60` (11), `t67` (16), `t74`, `t73`, `t79`, `t84`, `t76`.
- **Honesto:** no se ha probado con móviles reales ni con la red real de Render; el probador usa GPU por software, así que los milisegundos no se trasladan tal cual. Lo fiable son los dibujos y que el juego ahora baja de calidad solo si no llega a los FPS del modo. En multijugador el anfitrión hace además toda la simulación para todos: si el anfitrión tiene un móvil flojo, que use AHORRO.
- **Para actualizar:** sube solo `index.html` (`perfiles.js`, `salas.js` y `server.js` no cambian), espera a que Render termine de desplegar y vuelve a ejecutar «Construir APK». **Todos los jugadores** deben tener la versión nueva (si uno tiene la anterior sigue funcionando, solo que sin esta mejora en su pantalla).

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
