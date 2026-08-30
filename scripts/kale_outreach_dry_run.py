#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from kale_outreach_rules import build_outreach_packet, source_fingerprints, validate_outreach_packet


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="outreach-report")
    args = parser.parse_args()

    source = {
        "synthetic": True,
        "direction": "outbound_growth_draft_only",
        "factsConfirmedPublished": True,
        "usesUnpublishedOfficeDraft": False,
        "mentionsUnreleasedFeature": False,
        "containsRealRecipientData": False,
        "recipientListProvided": False,
        "channel": "email",
        "audienceType": "prospect_segment",
        "language": "en",
        "commercialLaunchReady": False,
        "ctaIntent": "view_demo",
        "ctaUrl": "https://kale1205.github.io/fde-site/demo.html",
        "audienceLabel": "small businesses evaluating inventory workflow tools",
        "segmentRationale": "Synthetic segment used only to validate the P3-7 drafting boundary.",
        "sourceRefs": ["content/site-content.json"],
        "claims": [{"text": "FDE IMS is currently in development.", "sourceRef": "content/site-content.json", "supported": True}],
    }

    packet = build_outreach_packet(source)
    validate_outreach_packet(packet)
    packet["evidence"] = {
        "sourceFingerprints": source_fingerprints(packet["grounding"]["sourceRefs"]),
        "externalNetworkCalls": False,
        "secretsUsed": False,
        "realRecipientLookupPerformed": False,
        "recipientHarvestPerformed": False,
        "outboundSendPerformed": False,
        "customerSendPerformed": False,
        "crmWritePerformed": False,
        "cloudflareWritePerformed": False,
        "gitWritePerformed": False,
    }
    packet["verdict"] = "READY_FOR_ADMIN_REVIEW"

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    json_path = out / "kale-outreach-foundation-report.json"
    md_path = out / "kale-outreach-foundation-report.md"
    json_path.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = f"""# Kale Outreach Foundation Report

- Verdict: `{packet['verdict']}`
- Mode: `{packet['mode']}`
- Direction: `{packet['direction']}`
- Segment state: `{packet['segmentProposal']['state']}`
- Sales copy state: `{packet['salesCopy']['state']}`
- Execution state: `{packet['execution']['state']}`
- P5-3 country compliance review required: `{str(packet['execution']['p5_3CountryComplianceReviewRequired']).lower()}`
- Outbound send performed: `{str(packet['execution']['outboundSendPerformed']).lower()}`
- Real recipient data: `{str(packet['containsRealRecipientData']).lower()}`
- External network calls: `{str(packet['evidence']['externalNetworkCalls']).lower()}`
- Secrets used: `{str(packet['evidence']['secretsUsed']).lower()}`
- Cloudflare write: `{str(packet['evidence']['cloudflareWritePerformed']).lower()}`
- Git write: `{str(packet['evidence']['gitWritePerformed']).lower()}`

This is synthetic P3-7 foundation evidence only. It is not a real campaign, recipient list, sales send, or compliance approval.
"""
    md_path.write_text(md, encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print("P3-7 Kale Outreach synthetic foundation dry-run passed.")


if __name__ == "__main__":
    main()
