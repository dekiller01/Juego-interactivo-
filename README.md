# Neon Beat Rush

Shooter 3D en primera persona que corre en el navegador, con música reactiva y eventos de TikTok LIVE
(regalos, comentarios, likes y follows) que cambian lo que pasa en el juego.

## Qué hay aquí

- `index.html` y `three.min.js`: el juego completo (Three.js incluido).
- `server.js`: sirve el juego y reenvía los eventos de TikTok al juego por WebSocket (`/ws`).
- `salas.js`: salas del multijugador (v22); el servidor solo reparte mensajes entre los jugadores por WebSocket (`/mp`).
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

## Multijugador cooperativo (v22)

Hasta **4 jugadores** en la misma arena, contra los mismos enemigos. Se entra desde el menú con **👥 MULTIJUGADOR**.

- **Crear sala:** el anfitrión pone su apodo y pulsa CREAR SALA. Sale un código de 4 letras y un enlace (`…/?sala=ABCD`) que se comparte con el botón COMPARTIR ENLACE. Quien abre el enlace ya llega a la pantalla de la sala con el código puesto; solo pone su apodo y pulsa UNIRME. También se puede escribir el código a mano.
- **Empezar:** solo el anfitrión ve EMPEZAR. Puedes empezar solo, para probar. Con la partida en marcha no entra nadie más (se espera a la siguiente).
- **Cómo funciona:** el teléfono del **anfitrión** corre toda la partida (enemigos, jefes, niveles, música). Los demás ven lo que ocurre (10 veces por segundo), se mueven y disparan en su teléfono y le mandan al anfitrión sus golpes. El servidor no ejecuta el juego, solo reparte mensajes, así que consume muy poco. **Si el anfitrión se sale, la partida termina para todos** (todavía no hay cambio de anfitrión).
- **Vida individual:** cada uno tiene su propia vida y sus propias mejoras. Los enemigos persiguen **al jugador vivo más cercano**, y las explosiones, el fuego y los proyectiles hieren a cualquiera que esté dentro. Hay más enemigos y con algo más de vida según cuántos jugáis (+40 % de vida y +50 % de enemigos por cada jugador extra, con tope de 40 a la vez).
- **Caer y reanimar:** al quedarte sin vida no pierdes: quedas **caído** y un compañero vivo que se quede a menos de 3 m te reanima en unos 2,5 s (vuelves con la mitad de vida y 2,5 s de protección). La partida termina cuando **todos** han caído y se ve un marcador del equipo.
- **Mejoras:** al subir de nivel (el nivel es del equipo, por bajas totales) cada uno elige su mejora **sin pausar la partida**: mientras eliges no te pueden herir.
- **Música:** v22 manda a todos **el ritmo del anfitrión** (pulso, golpe de bombo y avisos de caída); la canción completa sincronizada llega en la siguiente versión.
- **No cuenta para el ranking de solitario:** las partidas multijugador no se guardan en el perfil ni en el ranking, ni tocan tu récord.
- **Seguridad:** el servidor limita mensajes por segundo, tamaño, salas por IP y solo acepta conexiones desde el propio sitio y la app. Los apodos se limpian de símbolos raros.
- **Límites conocidos:** las habilidades que afectan a todos los enemigos a la vez (tiempo lento, vacío, congelar) solo los afectan en el teléfono del anfitrión; los demás ven sus golpes, pero el empuje no se comparte. El anfitrión necesita un teléfono medianamente bueno (corre todo). Si la conexión de un invitado se corta más de 9 s, su partida termina.
- **App Android:** hace falta volver a ejecutar «Construir APK» para que la app traiga el multijugador. La app usa el mismo servidor, así que debería poder entrar a las mismas salas que la web (no se ha probado todavía en un teléfono real).
- `GET /api/status` muestra cuántas salas y jugadores hay ahora mismo (`multijugador`).

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
