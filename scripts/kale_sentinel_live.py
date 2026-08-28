#!/usr/bin/env python3
"""Live Kale Sentinel runner with an explicit monitoring User-Agent."""

import argparse
from pathlib import Path
import sys
import urllib.request

import kale_sentinel_probe as probe


def install_http_identity() -> None:
    opener = urllib.request.build_opener()
    opener.addheaders = [
        ("User-Agent", "baked-kale-sentinel/1.0"),
        ("Accept", "*/*"),
    ]
    urllib.request.install_opener(opener)


def main() -> int:
    parser = argparse.ArgumentParser(description="Kale Sentinel live read-only runner")
    parser.add_argument("--output", default="sentinel-report")
    args = parser.parse_args()
    install_http_identity()
    return probe.run_live(Path(args.output))


if __name__ == "__main__":
    sys.exit(main())
