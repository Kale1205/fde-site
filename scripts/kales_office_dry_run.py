#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

import kales_office_rules as office


def synthetic_release_fixture():
    source_ref = "synthetic://fde-ims/release/p3-6-fixture"
    return {
        "synthetic": True,
        "direction": "public_editorial_only",
        "sourceKind": "mirror_release",
        "sourceId": "p3-6-synthetic-release",
        "releaseStatus": "released",
        "releaseApproved": True,
        "sourceRefs": [source_ref],
        "headlineJa": "P3-6 foundation用の合成Product News",
        "summaryJa": "これはKale’s Officeの権限境界を検証するための合成データです。実製品のリリースを示すものではありません。",
        "claims": [
            {
                "text": "この記録はsynthetic foundation fixtureであり、実際の製品公開情報ではありません。",
                "sourceRef": source_ref,
                "supported": True,
            }
        ],
    }


def write_report(output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)

    packet = office.build_editorial_packet(synthetic_release_fixture())
    office.validate_editorial_packet(packet)

    report = {
        "phase": "P3-6",
        "agent": "Kale’s Office",
        "verdict": "READY_FOR_ADMIN_REVIEW",
        "mode": "synthetic_dry_run_only",
        "packet": packet,
        "cmsBoundaryFingerprints": office.cms_boundary_fingerprints(),
        "externalNetworkPerformed": False,
        "secretsUsed": False,
        "cloudflareWritePerformed": False,
        "gitWritePerformed": False,
        "cmsPublishPerformed": False,
        "publicPostPerformed": False,
        "outboundCampaignPerformed": False,
        "customerSendPerformed": False,
        "containsRealCustomerData": False,
        "containsSensitiveSourceData": False,
    }

    json_path = output_dir / "kales-office-foundation-report.json"
    md_path = output_dir / "kales-office-foundation-report.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = f"""# Kale’s Office foundation report

- Phase: P3-6
- Verdict: {report['verdict']}
- Mode: {report['mode']}
- Direction: {packet['direction']}
- Category: {packet['cmsDraft']['category']}
- Publication state: {packet['publication']['state']}
- CMS publish performed: {str(report['cmsPublishPerformed']).lower()}
- Public post performed: {str(report['publicPostPerformed']).lower()}
- Outbound campaign performed: {str(report['outboundCampaignPerformed']).lower()}
- Customer send performed: {str(report['customerSendPerformed']).lower()}
- External network performed: {str(report['externalNetworkPerformed']).lower()}
- Secrets used: {str(report['secretsUsed']).lower()}
- Cloudflare write performed: {str(report['cloudflareWritePerformed']).lower()}
- Git write performed: {str(report['gitWritePerformed']).lower()}
- Contains real customer data: {str(report['containsRealCustomerData']).lower()}
- Contains sensitive source data: {str(report['containsSensitiveSourceData']).lower()}

This artifact is synthetic foundation evidence only. It is not a published News item, social post, product release announcement, or sales campaign.
"""
    md_path.write_text(md, encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print("P3-6 Kale’s Office synthetic foundation dry-run passed.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="office-report")
    args = parser.parse_args()
    write_report(Path(args.output))


if __name__ == "__main__":
    main()
