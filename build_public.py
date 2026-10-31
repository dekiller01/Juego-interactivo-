#!/usr/bin/env python3
"""Convierte el fragmento del artefacto (neon-beat-rush.html) en index.html completo para el servidor."""
import sys, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(__file__).parent / 'index.html'
s = src.read_text(encoding='utf-8')
i = s.index('</style>') + len('</style>')
head, body = s[:i], s[i:]
body = body.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', '/three.min.js')
doc = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n'
       '<meta name="theme-color" content="#07040f">\n' + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
out.write_text(doc, encoding='utf-8'); print('escrito', out, len(doc), 'bytes')
