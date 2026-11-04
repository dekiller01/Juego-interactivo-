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
(~0,1 s) da el bono de daño al ritmo. Se redibuja solo en cada latido, así que no cuesta nada de rendimiento. Con canciones tuyas el latido
se detecta sobre la marcha, por lo que puede adelantarse o atrasarse un poco; con la música del juego es casi exacto.

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
  Los jefes siguen la misma curva algo suavizada (^0,92) más su extra de +3 % por nivel hasta el 24, y como máximo hay 2 jefes a la vez.
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
- **El jefe es el tanque**: mientras haya un jefe vivo, el **60 % del daño de tus balas contra mobs pequeños pasa al jefe** (los mobs solo reciben
  el 40 %; sale un rayo magenta del mob al jefe) y los mobs pequeños van **+20 % más rápidos y pegan +25 % más** (brillan en magenta al ritmo).
  Así que lo que más conviene es matar al jefe primero. No afecta a dragones, fénix, médicos ni a habilidades y regalos (el NUKE sigue igual).
  Al caer el jefe, el enlace y el bono se acaban y los mobs quedan aturdidos 1 s. El 60 % es `TANK_LINK` en `index.html`.
- **Los enemigos aprenden**: el juego anota cómo juegas (qué arma llevas, cuánto te mueves, a qué distancia aciertas) con memoria de ~40 s, y
  hasta el **35 %** de lo que aparece sale de una lista que contrarresta eso (con sniper: más veloces y esquivos; con UMP: más tanques y
  divisores; con escopeta: más a distancia; si te quedas quieto: más escupidores y explosivos; si corres: más toros y corredores). Empieza en
  el nivel 3 y llega al máximo en el nivel 12. Avisa **una sola vez** ("LOS ENEMIGOS APRENDEN", sin decir a qué) la primera vez que se juega.
  Si cambias de arma o de estilo, se adaptan de nuevo. Cuesta microsegundos y 0 dibujos extra. Tope en `LEARN_MAX`.

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
