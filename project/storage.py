"""
Stockage des fichiers statiques pour la production.

`CompressedManifestStaticFilesStorage` interrompt `collectstatic` des qu'une
feuille de style reference un fichier absent (ici `assets/css/arafat-font.css`
pointe vers des polices qui ne sont pas dans le depot). Cela ferait echouer le
build Render alors que le site fonctionne tres bien sans ces polices.

On garde donc la compression et le hash des noms (cache longue duree), mais une
reference cassee devient un simple avertissement.
"""

import logging

from whitenoise.storage import CompressedManifestStaticFilesStorage

logger = logging.getLogger(__name__)


class ForgivingManifestStaticFilesStorage(CompressedManifestStaticFilesStorage):
    # Un fichier absent du manifeste est servi sous son nom d'origine
    # au lieu de lever une exception a l'execution.
    manifest_strict = False

    def hashed_name(self, name, content=None, filename=None):
        """
        Un fichier statique reference mais absent ne doit pas faire tomber la
        page entiere. Django leve ici une ValueError : on retombe alors sur le
        nom d'origine, ce qui donne un 404 sur cette ressource au lieu d'une
        erreur 500 sur toute la vue.
        """
        try:
            return super().hashed_name(name, content, filename)
        except ValueError as exc:
            logger.warning("Fichier statique introuvable, servi sans hash : %s (%s)", name, exc)
            return name

    def post_process(self, paths, dry_run=False, **options):
        for name, hashed_name, processed in super().post_process(paths, dry_run, **options):
            if isinstance(processed, Exception):
                logger.warning(
                    "Fichier statique ignore (reference cassee) : %s -> %s", name, processed
                )
                # On ne propage pas l'exception : collectstatic la relancerait
                # et le deploiement s'arreterait.
                processed = False
            yield name, hashed_name, processed
