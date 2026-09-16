"""
Page d'accueil technique du service.

Elle remplace l'ancien site HTML quand SERVE_LEGACY_SITE est desactive : pas de
formulaire, pas de promesse commerciale, pas d'imagerie bancaire — uniquement
les points d'entree utiles a un developpeur. C'est volontaire : une page
d'accueil de type banque en ligne sur un domaine sans reputation est classee
comme hameconnage par les filtres des navigateurs.
"""

from django.http import HttpResponse
from django.views.decorators.cache import cache_control

PAGE = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>PoolPay API</title>
<style>
  body { margin:0; padding:48px 24px; background:#f6f7fb; color:#1f2430;
         font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height:1.6; }
  main { max-width:640px; margin:0 auto; background:#fff; border:1px solid #e4e7ef;
         border-radius:14px; padding:32px; }
  h1 { margin:0 0 4px; font-size:1.35rem; }
  p.sub { margin:0 0 24px; color:#697086; font-size:.95rem; }
  ul { list-style:none; padding:0; margin:0; }
  li { padding:11px 0; border-bottom:1px solid #eef0f6; display:flex;
       justify-content:space-between; gap:16px; flex-wrap:wrap; }
  li:last-child { border-bottom:none; }
  a { color:#3d4cd4; text-decoration:none; font-weight:600; }
  a:hover { text-decoration:underline; }
  code { background:#f2f4f9; padding:2px 7px; border-radius:5px; font-size:.86rem; }
  footer { margin-top:24px; color:#8b91a5; font-size:.82rem; }
</style>
</head>
<body>
<main>
  <h1>PoolPay API</h1>
  <p class="sub">Service applicatif. Ce serveur expose une API REST ; il ne contient pas d'interface destinee aux clients.</p>
  <ul>
    <li><span>Documentation interactive</span><a href="/api/schema/swagger-ui/">Swagger UI</a></li>
    <li><span>Documentation de reference</span><a href="/api/schema/redoc/">ReDoc</a></li>
    <li><span>Schema OpenAPI</span><a href="/api/schema/">/api/schema/</a></li>
    <li><span>Administration</span><a href="/admin/">/admin/</a></li>
    <li><span>Authentification</span><code>POST /user/login/</code></li>
  </ul>
  <footer>Les requetes necessitent un jeton JWT, a l'exception de la connexion et de l'inscription.</footer>
</main>
</body>
</html>
"""


@cache_control(max_age=300)
def api_root(request):
    return HttpResponse(PAGE, content_type="text/html; charset=utf-8")
