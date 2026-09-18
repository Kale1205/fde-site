#!/usr/bin/env python3
"""Generate sitemap.xml from the committed history of each public HTML page."""

import argparse
import difflib
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

from sitemap_config import (
    GitHistoryError,
    SITEMAP_NAMESPACE,
    SITEMAP_PAIRS,
    XHTML_NAMESPACE,
    git_last_modified,
    require_complete_git_history,
)


ROOT = Path(__file__).resolve().parents[1]
SITEMAP_PATH = ROOT / "sitemap.xml"


def qualified(namespace, tag):
    return f"{{{namespace}}}{tag}"


def render_sitemap():
    require_complete_git_history(ROOT)
    ET.register_namespace("", SITEMAP_NAMESPACE)
    ET.register_namespace("xhtml", XHTML_NAMESPACE)

    urlset = ET.Element(qualified(SITEMAP_NAMESPACE, "urlset"))
    for pair in SITEMAP_PAIRS:
        for page in pair.pages:
            item = ET.SubElement(urlset, qualified(SITEMAP_NAMESPACE, "url"))
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "loc")).text = page.url
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "lastmod")).text = git_last_modified(
                ROOT, page.html_path
            )
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "changefreq")).text = pair.changefreq
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "priority")).text = pair.priority
            for hreflang, href in pair.alternates:
                ET.SubElement(
                    item,
                    qualified(XHTML_NAMESPACE, "link"),
                    {"rel": "alternate", "hreflang": hreflang, "href": href},
                )

    ET.indent(urlset, space="  ")
    serialized = ET.tostring(urlset, encoding="unicode", short_empty_elements=True)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{serialized}\n'


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify that sitemap.xml already matches the generated output",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    try:
        generated = render_sitemap()
    except GitHistoryError as exc:
        print(f"Sitemap generation stopped: {exc}", file=sys.stderr)
        return 1

    current = SITEMAP_PATH.read_text(encoding="utf-8") if SITEMAP_PATH.exists() else ""
    if args.check:
        if current == generated:
            print("sitemap.xml is current.")
            return 0
        print("sitemap.xml is stale; run `npm run sitemap` and commit the result.", file=sys.stderr)
        sys.stderr.writelines(
            difflib.unified_diff(
                current.splitlines(keepends=True),
                generated.splitlines(keepends=True),
                fromfile="sitemap.xml",
                tofile="generated sitemap.xml",
            )
        )
        return 1

    if current == generated:
        print("sitemap.xml is already current.")
        return 0

    SITEMAP_PATH.write_text(generated, encoding="utf-8")
    print("Generated sitemap.xml from committed HTML history.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
