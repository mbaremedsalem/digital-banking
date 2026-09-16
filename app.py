"""
Point d'entree de compatibilite pour Render.

Quand un service Render est cree manuellement (et non via render.yaml), la
commande de demarrage laissee vide devient « gunicorn app:app ». Ce module
existe pour que cette commande par defaut fonctionne : il expose l'application
Django sous le nom `app`.

Il execute aussi les taches que build.sh aurait faites, car un service manuel
garde le build par defaut (« pip install -r requirements.txt ») et n'applique
donc ni les migrations ni la collecte des fichiers statiques.

ORDRE IMPORTANT : `collectstatic` doit tourner AVANT la construction de
l'application WSGI. WhiteNoise indexe le contenu de STATIC_ROOT une seule fois,
a l'initialisation de son middleware ; si le dossier est encore vide a cet
instant, toutes les feuilles de style repondent 404 pour toute la duree du
processus.

Le point d'entree canonique reste `project.wsgi:application` : si vous
renseignez la commande de demarrage recommandee dans le dashboard, ce fichier
n'est plus utilise.
"""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")

import django  # noqa: E402

# Charge les applications et les reglages, sans encore construire le WSGI.
django.setup()


def _run_startup_tasks():
    """Migrations + fichiers statiques, de maniere idempotente et non bloquante."""
    from django.conf import settings
    from django.core.management import call_command

    try:
        call_command("migrate", interactive=False, verbosity=1)
    except Exception as exc:  # une base injoignable ne doit pas masquer la cause
        print(f"[demarrage] migrate a echoue : {exc}", file=sys.stderr)

    # La collecte ne se refait pas si le manifeste est deja la.
    manifest = os.path.join(str(settings.STATIC_ROOT), "staticfiles.json")
    if not os.path.exists(manifest):
        try:
            call_command("collectstatic", interactive=False, verbosity=0)
            print("[demarrage] fichiers statiques collectes", file=sys.stderr)
        except Exception as exc:
            print(f"[demarrage] collectstatic a echoue : {exc}", file=sys.stderr)


# Desactivable avec RUN_STARTUP_TASKS=0 (par exemple si build.sh s'en charge deja).
if os.environ.get("RUN_STARTUP_TASKS", "1") == "1":
    _run_startup_tasks()

# Construit l'application WSGI une fois les statiques en place : c'est ici que
# WhiteNoise parcourt STATIC_ROOT.
from project.wsgi import application  # noqa: E402

# Nom attendu par « gunicorn app:app ».
app = application
