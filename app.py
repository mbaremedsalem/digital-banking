"""
Point d'entree de compatibilite pour Render.

Quand un service Render est cree manuellement (et non via render.yaml), la
commande de demarrage laissee vide devient « gunicorn app:app ». Ce module
existe pour que cette commande par defaut fonctionne : il expose l'application
Django sous le nom `app`.

Il execute aussi les taches que build.sh aurait faites, car un service manuel
garde le build par defaut (« pip install -r requirements.txt ») et n'applique
donc ni les migrations ni la collecte des fichiers statiques.

Le point d'entree canonique reste `project.wsgi:application` : si vous
renseignez la commande de demarrage recommandee dans le dashboard, ce fichier
n'est plus utilise.
"""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")

# Charge Django et construit l'application WSGI.
from project.wsgi import application  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _run_startup_tasks():
    """Migrations + fichiers statiques, de maniere idempotente et non bloquante."""
    from django.conf import settings
    from django.core.management import call_command

    try:
        call_command("migrate", interactive=False, verbosity=1)
    except Exception as exc:  # une base injoignable ne doit pas masquer la cause
        print(f"[demarrage] migrate a echoue : {exc}", file=sys.stderr)

    # La collecte ne se fait qu'une fois : inutile de rallonger chaque demarrage.
    manifest = os.path.join(str(settings.STATIC_ROOT), "staticfiles.json")
    if not os.path.exists(manifest):
        try:
            call_command("collectstatic", interactive=False, verbosity=0)
        except Exception as exc:
            print(f"[demarrage] collectstatic a echoue : {exc}", file=sys.stderr)


# Desactivable avec RUN_STARTUP_TASKS=0 (par exemple si build.sh s'en charge deja).
if os.environ.get("RUN_STARTUP_TASKS", "1") == "1":
    _run_startup_tasks()

# Nom attendu par « gunicorn app:app ».
app = application
