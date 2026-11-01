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

**Regalos**: por nombre (rosa, helado/GG, corazón, galaxia, león) activan un efecto propio (pétalos y vida, congelar,
escudo de amor, meteoritos, 4 drones). Los demás dependen de su valor: pequeños curan, medianos lanzan granadas,
grandes dan minigun y la nuke limpia el salón. Casi todos suman drones aliados con el nombre de quien envió el regalo.

**Likes**: barra de 100 likes; al llenarla hay fuegos artificiales, mejora y vida. **Seguir**: bonus y fuegos.
**Compartir**: carga de ultimate. Abajo en pantalla se ve el TOP 3 de fans de la sesión.

## Aviso

`tiktok-live-connector` no es oficial: TikTok puede romperlo con cambios. El servidor reintenta solo y
el resto del juego sigue funcionando con los botones de simulación.
