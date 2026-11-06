#!/usr/bin/env python3
"""Neon Beat Rush · prepara el proyecto Capacitor/Android para compilar la APK.
Lo ejecuta .github/workflows/apk.yml (no hace falta usarlo a mano).

  python3 apk_prepare.py web     --src <raíz del repo> --out <carpeta apk> --server https://tu-app.onrender.com
  python3 apk_prepare.py android --out <carpeta apk> --code <versionCode> --name <versionName>
"""
import argparse, os, re, shutil, sys, json, glob

APP_ID = 'io.github.dekiller01.neonbeatrush'
APP_NAME = 'Neon Beat Rush'
BG = '#07040F'

def fail(msg):
    print('ERROR:', msg); sys.exit(1)

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='\n') as f: f.write(s)

def sub_once(s, a, b, what):
    if s.count(a) != 1: fail(f'no encontré (o hay varias veces) «{what}» en el proyecto generado; la plantilla de Capacitor cambió')
    return s.replace(a, b)

# ------------------------------------------------------------------ 1) parte web
def web(a):
    server = a.server.strip().rstrip('/')
    if not re.fullmatch(r'https://[A-Za-z0-9.-]+(:\d{2,5})?', server):
        fail('la dirección del servidor debe ser tipo https://algo.onrender.com (sin barra final ni ruta)')
    src, out = a.src, a.out
    www = os.path.join(out, 'www'); shutil.rmtree(www, ignore_errors=True); os.makedirs(www)
    html = read(os.path.join(src, 'index.html'))
    if html.count('<head>') != 1: fail('index.html debe tener exactamente un <head>')
    snippet = '<head>\n<script>window.NBR_APP=1;window.NBR_SERVER=' + json.dumps(server) + ';</script>\n<script src="capacitor.js"></script>'
    write(os.path.join(www, 'index.html'), html.replace('<head>', snippet, 1))
    for f in ('three.min.js',):
        shutil.copy(os.path.join(src, f), os.path.join(www, f))
    cap = os.path.join(out, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js')
    if not os.path.exists(cap): fail('falta node_modules/@capacitor/core/dist/capacitor.js (¿se instaló Capacitor?)')
    shutil.copy(cap, os.path.join(www, 'capacitor.js'))
    cfg = {'appId': APP_ID, 'appName': APP_NAME, 'webDir': 'www', 'server': {'androidScheme': 'https'}}
    write(os.path.join(out, 'capacitor.config.json'), json.dumps(cfg, indent=2) + '\n')
    print('web listo en', www, '· servidor', server)

# ------------------------------------------------------------------ 2) iconos (solo adorno: si falla no se detiene)
def make_icons(res):
    try:
        from PIL import Image, ImageDraw, ImageFilter
    except Exception as e:
        print('aviso: sin Pillow, se queda el icono por defecto de Capacitor', e); return
    def gradient(w, h):
        im = Image.new('RGBA', (w, h)); px = im.load()
        top, bot = (24, 8, 54), (4, 2, 12)
        for y in range(h):
            t = y / max(1, h - 1); c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,)
            for x in range(w): px[x, y] = c
        return im
    def glyph(size, R):
        """anillo de latido + mira, centrados; R = radio exterior relativo al lado."""
        S = size * 2; g = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(g); c = S / 2
        def ring(r, col, w):
            d.ellipse([c - r, c - r, c + r, c + r], outline=col, width=max(2, int(w)))
        ro = R * S
        ring(ro, (25, 240, 255, 255), S * .028)
        d.arc([c - ro * .72, c - ro * .72, c + ro * .72, c + ro * .72], 200, 20, fill=(255, 47, 208, 255), width=max(2, int(S * .028)))
        L, G = ro * .5, ro * .16
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            d.line([c + dx * G, c + dy * G, c + dx * L, c + dy * L], fill=(255, 255, 255, 255), width=max(2, int(S * .018)))
        dr = S * .022; d.ellipse([c - dr, c - dr, c + dr, c + dr], fill=(255, 255, 255, 255))
        glow = g.filter(ImageFilter.GaussianBlur(S * .018)); out = Image.alpha_composite(glow, g)
        return out.resize((size, size), Image.LANCZOS)
    def paste_center(base, g):
        base.alpha_composite(g, ((base.width - g.width) // 2, (base.height - g.height) // 2)); return base
    def save(img, path):
        os.makedirs(os.path.dirname(path), exist_ok=True); img.save(path)
    dens_leg = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for k, px in dens_leg.items():
        # cuadrado con esquinas redondeadas y círculo
        im = paste_center(gradient(px, px), glyph(px, .34))
        m = Image.new('L', (px, px), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * .18), fill=255)
        sq = Image.new('RGBA', (px, px), (0, 0, 0, 0)); sq.paste(im, (0, 0), m); save(sq, f'{res}/mipmap-{k}/ic_launcher.png')
        m2 = Image.new('L', (px, px), 0); ImageDraw.Draw(m2).ellipse([0, 0, px - 1, px - 1], fill=255)
        rd = Image.new('RGBA', (px, px), (0, 0, 0, 0)); rd.paste(im, (0, 0), m2); save(rd, f'{res}/mipmap-{k}/ic_launcher_round.png')
        fg = int(px * 108 / 48)   # el primer plano adaptable mide 108 dp
        save(glyph(fg, .24), f'{res}/mipmap-{k}/ic_launcher_foreground.png')
    # fondo del icono adaptable
    p = f'{res}/values/ic_launcher_background.xml'
    if os.path.exists(p): write(p, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B0618</color>\n</resources>\n')
    # pantalla de inicio: mismas medidas que las originales, fondo oscuro y el símbolo en el centro
    for f in glob.glob(f'{res}/drawable*/splash.png'):
        w, h = Image.open(f).size; im = gradient(w, h); paste_center(im, glyph(int(min(w, h) * .45), .42)); im.convert('RGB').save(f)
    print('iconos y pantalla de inicio generados')

# ------------------------------------------------------------------ 3) parte Android
JAVA = '''package %s;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/* Neon Beat Rush: pantalla siempre encendida y a pantalla completa (las barras vuelven al deslizar desde el borde). */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    private void hideBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
''' % APP_ID

def android(a):
    out = a.out; ad = os.path.join(out, 'android'); app = os.path.join(ad, 'app'); main = os.path.join(app, 'src', 'main'); res = os.path.join(main, 'res')
    if not os.path.isdir(ad): fail('no existe la carpeta android (¿corrió «npx cap add android»?)')
    # manifiesto: siempre horizontal
    p = os.path.join(main, 'AndroidManifest.xml'); s = read(p)
    s = sub_once(s, 'android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"', 'activity .MainActivity'); write(p, s)
    # temas: pantalla completa, muesca y color de inicio
    write(os.path.join(res, 'values', 'nbr_colors.xml'), f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="nbr_bg">{BG}</color>\n</resources>\n')
    p = os.path.join(res, 'values', 'styles.xml'); s = read(p)
    s = sub_once(s, '<item name="windowNoTitle">true</item>', '<item name="windowNoTitle">true</item>\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>', 'windowNoTitle')
    s = sub_once(s, '<item name="android:background">@drawable/splash</item>', '<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">@color/nbr_bg</item>', 'splash background')
    write(p, s)
    # actividad principal
    jp = os.path.join(main, 'java', *APP_ID.split('.'), 'MainActivity.java')
    if not os.path.exists(jp): fail('no encuentro MainActivity.java en ' + jp)
    write(jp, JAVA)
    # gradle: versión, firma y lint sin abortar
    p = os.path.join(app, 'build.gradle'); s = read(p)
    s = sub_once(s, 'versionCode 1', f'versionCode {int(a.code)}', 'versionCode')
    s = sub_once(s, 'versionName "1.0"', f'versionName "{a.name}"', 'versionName')
    s = sub_once(s, '    buildTypes {\n        release {\n            minifyEnabled false\n',
'''    lint {
        abortOnError false
        checkReleaseBuilds false
    }
    signingConfigs {
        nbr {
            storeFile file(System.getenv("NBR_KS") ?: "sin-clave")
            storePassword System.getenv("NBR_KS_PASS")
            keyAlias "nbr"
            keyPassword System.getenv("NBR_KS_PASS")
            storeType "pkcs12"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.nbr
            minifyEnabled false
''', 'buildTypes release'); write(p, s)
    gw = os.path.join(ad, 'gradlew')
    if os.path.exists(gw): os.chmod(gw, 0o755)
    make_icons(res)
    print('android listo · versionCode', a.code, '· versionName', a.name)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
    w = sp.add_parser('web'); w.add_argument('--src', required=True); w.add_argument('--out', required=True); w.add_argument('--server', required=True)
    d = sp.add_parser('android'); d.add_argument('--out', required=True); d.add_argument('--code', required=True); d.add_argument('--name', required=True)
    a = ap.parse_args()
    web(a) if a.cmd == 'web' else android(a)
