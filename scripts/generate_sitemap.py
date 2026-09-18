#!/usr/bin/env python3
"""Generate persisted page lastmods and sitemap.xml from substantive PR changes."""

import argparse
import difflib
from pathlib import Path
import sys

from sitemap_config import (
    LASTMOD_MANIFEST_NAME,
    SITEMAP_NAME,
    SitemapStateError,
    expected_lastmods_for_base,
    load_lastmod_manifest,
    render_sitemap,
    resolve_base_ref,
    serialize_lastmod_manifest,
)


ROOT = Path(__file__).resolve().parents[1]


def generated_outputs(root, base_ref=None):
    root = Path(root)
    current_lastmods = load_lastmod_manifest(root)
    materially_changed = set()
    if base_ref:
        current_lastmods, materially_changed = expected_lastmods_for_base(
            root, base_ref, current_lastmods=current_lastmods
        )
    return (
        serialize_lastmod_manifest(current_lastmods),
        render_sitemap(current_lastmods),
        materially_changed,
    )


def generate_files(root, base_ref=None, check=False):
    root = Path(root)
    manifest_text, sitemap_text, materially_changed = generated_outputs(root, base_ref)
    expected = {
        LASTMOD_MANIFEST_NAME: manifest_text,
        SITEMAP_NAME: sitemap_text,
    }
    stale = []
    for name, generated in expected.items():
        path = root / name
        current = path.read_text(encoding="utf-8") if path.exists() else ""
        if current == generated:
            continue
        stale.append(name)
        if check:
            sys.stderr.writelines(
                difflib.unified_diff(
                    current.splitlines(keepends=True),
                    generated.splitlines(keepends=True),
                    fromfile=name,
                    tofile=f"generated {name}",
                )
            )
        else:
            path.write_text(generated, encoding="utf-8")
    return stale, materially_changed


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base",
        help="PR base ref; defaults to SITEMAP_BASE_REF or origin/main off main",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify that the manifest and sitemap already match generated output",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    try:
        base_ref = resolve_base_ref(ROOT, args.base)
        stale, materially_changed = generate_files(ROOT, base_ref=base_ref, check=args.check)
    except SitemapStateError as exc:
        print(f"Sitemap generation stopped: {exc}", file=sys.stderr)
        return 1

    if args.check and stale:
        print(
            f"Generated sitemap state is stale ({', '.join(stale)}); "
            "run `npm run sitemap` and commit the result.",
            file=sys.stderr,
        )
        return 1
    if stale:
        print(f"Updated {', '.join(stale)}.")
    else:
        print("Sitemap manifest and sitemap.xml are already current.")
    if materially_changed:
        print("Materially changed indexed HTML: " + ", ".join(sorted(materially_changed)))
    else:
        print("No substantive indexed HTML changes detected; persisted lastmod values were retained.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
