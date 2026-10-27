"""Zero-dependency regression checks for the static Wonderverse website."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


class AuditHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.duplicate_ids = set()
        self.hrefs = []
        self.scripts = []
        self.stylesheets = []
        self.buttons = []
        self.roles = []
        self.document_lang = None
        self.images_missing_alt = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        identifier = attrs.get("id")
        if identifier:
            if identifier in self.ids:
                self.duplicate_ids.add(identifier)
            self.ids.add(identifier)
        if tag == "html":
            self.document_lang = attrs.get("lang")
        if tag == "a" and attrs.get("href"):
            self.hrefs.append(attrs["href"])
        if tag == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.stylesheets.append(attrs.get("href", ""))
        if tag == "button":
            self.buttons.append(attrs)
        if attrs.get("role"):
            self.roles.append(attrs["role"])
        if tag == "img" and "alt" not in attrs:
            self.images_missing_alt.append(attrs.get("src", "<unknown>"))


def inspect_page(path: str):
    text = (ROOT / path).read_text(encoding="utf-8")
    parser = AuditHTML()
    parser.feed(text)
    parser.close()
    assert parser.document_lang == "en", f"Missing language attribute: {path}"
    assert not parser.duplicate_ids, f"Duplicate IDs in {path}: {parser.duplicate_ids}"
    assert not parser.images_missing_alt, f"Unlabeled images in {path}"
    for href in parser.hrefs:
        parsed = urlparse(href)
        if parsed.scheme or href.startswith(("mailto:", "tel:")):
            continue
        if href.startswith("#"):
            assert href[1:] in parser.ids, f"{path}: Broken anchor {href}"
        elif href.startswith("/"):
            destination = ROOT / href.lstrip("/")
            assert destination.is_file() or href == "/", f"{path}: Missing {href}"
    for asset in parser.scripts + parser.stylesheets:
        if asset.startswith("/"):
            assert (ROOT / asset.lstrip("/")).is_file(), f"{path}: Missing asset {asset}"
    return parser, text


def main():
    for page in ("index.html", "privacy.html", "terms.html"):
        inspect_page(page)
        print(f"PASS: {page} links, anchors, IDs and accessibility basics")

    homepage, html = inspect_page("index.html")
    must_have = (
        "heroTitle", "worlds", "discover", "play", "studio", "founder",
        "transparency", "secret", "contact", "starGame", "gameScore",
        "gameTime", "gameOverlay", "startGame", "restartGame",
        "secretDialog", "puzzleStatus", "yuvanDedicationTitle",
    )
    for identifier in must_have:
        assert identifier in homepage.ids, f"Missing interactive element #{identifier}"
    assert homepage.roles.count("tab") == 3, "Expected three keyboard-operable tabs"
    assert homepage.roles.count("tabpanel") == 3
    for letter in "YUVAN":
        assert html.count(f'data-letter="{letter}"') == 1, f"Missing or duplicate secret letter {letter}"
    assert "Uday Reddy" in html, "Founder must be credited"
    assert '<h2 id="yuvanDedicationTitle" class="dedication-name">YUVAN' in html, "YUVAN must be visible, not just a hidden easter egg"
    for word in ("OUNG", "NIVERSE", "AST", "DVENTURES", "EVER-ENDING WONDER."):
        assert word in html, f"Missing YUVAN dedication phrase: {word}"
    assert 'href="#secret"' in html, "Visible dedication must link to the constellation hunt"
    assert "MiraVana Studio" in html and "The Curious Loop" in html
    assert "UCuSK43WMaBRN-ULvEVeSSIw" in html
    assert "UCpSeEHYHZd1C1oki8TIVPHA" in html
    assert "https://thecuriousloop.in/" in html
    script = (ROOT / "script.js").read_text(encoding="utf-8")
    assert "requestAnimationFrame" in script and "canvas.getContext" in script
    assert "ArrowLeft" in script and "pointerdown" in script
    assert "prefers-reduced-motion" in script
    assert not any(x in script for x in ("localStorage", "sendBeacon", "navigator.geolocation"))
    assert (ROOT / "CNAME").read_text().strip() == "thecuriousloop.in"
    assert (ROOT / "favicon.svg").is_file()
    assert (ROOT / "social-preview.svg").is_file()
    print("PASS: full interactive site contract, channel destinations, founder, secrets and game")


if __name__ == "__main__":
    main()
