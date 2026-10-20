# Gujarati support for the MkDocs Material global search.
#
# Why this exists: the search worker builds a multi-language "trimmer" from
# the configured search languages. For `lang: [en, hi]` it keeps only the
# characters in `\w` (ASCII alphanumerics) plus the word-character list of
# the Hindi language pack, which covers Devanagari (U+0900-U+097F) but not
# the Gujarati Unicode block (U+0A81-U+0AFF). There is no Gujarati pack in
# the bundled lunr-languages set, so every Gujarati term (e.g. કમળ on the
# Vocabulary page) is trimmed to an empty token and never reaches the
# search index at all - Gujarati searches always come back empty.
#
# What this does: after each build, append one statement to the built
# `assets/javascripts/lunr/min/lunr.hi.min.js` site asset that extends
# `lunr.hi.wordCharacters` with the Gujarati block. The search worker loads
# that file (via importScripts) before generating the multi-language
# trimmer, so the trimmer ends up keeping Gujarati tokens in both the
# index and query paths. No theme or source-content files are modified.

import logging
from pathlib import Path

GUJARATI_BLOCK = "\u0a81-\u0aff"
MARKER = "lunr-gujarati-wordchars"
# Guarded so a re-run (or a Material upgrade that re-serves this asset) can
# never append the same range twice.
APPEND = (
    f'/* {MARKER}: keep Gujarati script tokens in the multi-language trimmer */\n'
    f'if (typeof lunr != "undefined" && lunr.hi) '
    f'lunr.hi.wordCharacters += "{GUJARATI_BLOCK}";\n'
)

log = logging.getLogger("mkdocs.hooks.gujarati_search")


def on_post_build(config, **kwargs):
    """ stamp Gujarati word chars into the built lunr Hindi pack."""
    site_dir = Path(config["site_dir"])
    target = site_dir / "assets" / "javascripts" / "lunr" / "min" / "lunr.hi.min.js"
    if not target.exists():
        log.warning(
            "%s not found; Gujarati stays unsearchable in the global search "
            "(mkdocs-material asset layout changed? check the search worker's "
            "importScripts paths)",
            target,
        )
        return
    text = target.read_text(encoding="utf-8")
    if MARKER in text:
        return  # already patched
    target.write_text(text + APPEND, encoding="utf-8")
    log.info("Appended Gujarati word characters to %s", target.relative_to(site_dir))
