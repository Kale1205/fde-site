from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "build-version.txt"

version = VERSION_FILE.read_text(encoding="utf-8").strip()
if not re.fullmatch(r"[0-9A-Za-z._-]+", version):
    raise SystemExit(f"Invalid build version: {version!r}")

# Local JS/CSS cache keys only. External URLs are intentionally untouched.
versioned_asset = re.compile(
    r"(?P<prefix>(?:src|href)=[\"'])(?P<path>(?!https?://|//)[^\"'?]+\.(?:js|css))\?v=[^\"'&\s>]+(?P<suffix>[\"'])",
    re.IGNORECASE,
)
string_asset = re.compile(
    r"(?P<quote>[\"'])(?P<path>(?!https?://|//)[A-Za-z0-9_./-]+\.(?:js|css))\?v=[0-9A-Za-z._-]+(?P=quote)",
    re.IGNORECASE,
)

changed = []

# All root HTML entry points: public pages, order/customer flows and CMS.
for path in sorted(ROOT.glob("*.html")):
    text = path.read_text(encoding="utf-8")
    new = versioned_asset.sub(
        lambda m: f"{m.group('prefix')}{m.group('path')}?v={version}{m.group('suffix')}",
        text,
    )
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(path.relative_to(ROOT).as_posix())

# Runtime loaders that inject additional local JS files dynamically.
for name in ("contact-config.js", "i18n-final.js"):
    path = ROOT / name
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    new = string_asset.sub(
        lambda m: f"{m.group('quote')}{m.group('path')}?v={version}{m.group('quote')}",
        text,
    )
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(path.relative_to(ROOT).as_posix())

print(f"Build version: {version}")
if changed:
    print("Updated:")
    for item in changed:
        print(f"- {item}")
else:
    print("No version changes required.")
