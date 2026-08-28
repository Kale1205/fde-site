#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from kale_desk_rules import build_support_packet, source_fingerprints, validate_support_packet


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic Kale Desk P3-5 foundation evidence.")
    parser.add_argument("--output", default="desk-report", help="Output directory")
    args = parser.parse_args()

    inquiry = {
        "direction": "inbound",
        "synthetic": True,
        "lang": "en",
        "product": "FDE IMS License",
        "subject": "Synthetic licensing inquiry",
        "message": "Can our team modify the source code for internal use, and are updates included?",
    }

    packet = build_support_packet(inquiry)
    validate_support_packet(packet)
    packet["sourceFingerprints"] = source_fingerprints(packet["analysis"]["sourceRefs"])
    packet["evidence"] = {
        "foundationOnly": True,
        "externalNetworkCalls": False,
        "secretsUsed": False,
        "customerSendPerformed": False,
        "cloudflareWritePerformed": False,
        "gitWritePerformed": False,
    }

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    json_path = out / "kale-desk-foundation-report.json"
    md_path = out / "kale-desk-foundation-report.md"

    json_path.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Kale Desk P3-5 Foundation Evidence",
        "",
        "- Verdict: READY_FOR_ADMIN_REVIEW",
        "- Mode: synthetic dry-run only",
        "- Direction: inbound only",
        f"- Category: {packet['analysis']['category']}",
        f"- Reply state: {packet['replyDraft']['state']}",
        "- Customer send performed: false",
        "- Outbound sales authority: false",
        "- Order/payment/fulfillment mutation authority: false",
        "- Cloudflare deploy/KV-write authority: false",
        "- Git merge/release authority: false",
        "- FAQ output: candidate only / not published",
        "",
        "## Grounding source fingerprints",
        "",
    ]
    for item in packet["sourceFingerprints"]:
        lines.append(f"- `{item['path']}` — `{item['sha256']}`")
    lines.extend(
        [
            "",
            "This artifact contains only synthetic support data and repository source fingerprints.",
            "It is not a customer communication and cannot authorize sending.",
        ]
    )
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print("P3-5 Kale Desk synthetic foundation dry-run passed.")


if __name__ == "__main__":
    main()
