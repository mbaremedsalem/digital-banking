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
