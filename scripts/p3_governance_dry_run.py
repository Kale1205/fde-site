#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from validate_p3_governance import ROOT, load_matrix, validate_model, validate_repository

SOURCE_PATHS = [
    "docs/architecture/p3-1-auto-security-audit.md", "docs/operations/KALE_SENTINEL.md",
    "docs/operations/KALE_DESK.md", "docs/operations/KALES_OFFICE.md", "docs/operations/KALE_OUTREACH.md",
    "docs/operations/P3_AGENT_GOVERNANCE_ACCEPTANCE.md", "docs/operations/p3-agent-governance.json",
    ".github/workflows/auto-security-audit.yml", ".github/workflows/kale-sentinel.yml",
    ".github/workflows/kale-desk.yml", ".github/workflows/kales-office.yml", ".github/workflows/kale-outreach.yml",
    ".github/workflows/p3-agent-governance.yml", ".github/workflows/pr-checks.yml",
    ".github/workflows/notify-slack-on-failure.yml", "worker/wrangler.toml",
]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="governance-report")
    args = parser.parse_args()
    output = ROOT / args.output
    output.mkdir(parents=True, exist_ok=True)

    model = load_matrix()
    errors = validate_model(model) + validate_repository(ROOT, model)
    fingerprints = [{"path": relative, "sha256": sha256_file(ROOT / relative) if (ROOT / relative).exists() else None} for relative in SOURCE_PATHS]
    generated_at = datetime.now(timezone.utc).isoformat()
    evidence_boundary = dict(model["evidence"])

    report = {
        "phase": "P3-8", "title": "Agent Governance Acceptance", "generatedAt": generated_at,
        "verdict": "READY_FOR_ADMIN_REVIEW" if not errors else "BLOCKED",
        "mode": "synthetic_cross_agent_governance_only", "baseline": model["baseline"],
        "administrator": model["administrator"], "hardSafetyGates": model["hardSafetyGates"],
        "handoffs": model["handoffs"], "failureHandling": model["failureHandling"],
        "agentAuthorityMatrix": model["agents"], "evidenceBoundary": evidence_boundary,
        "validationErrors": errors, "sourceFingerprints": fingerprints,
        "notes": [
            "This evidence is a point-in-time cross-agent governance acceptance packet.",
            "It does not authorize merge, release, CMS/public publication, customer send, outbound send, live payments, production fulfillment, installer distribution, or production activation.",
            "Private fde-ims is represented by the pinned verified baseline SHA and is not fetched by this public fde-site workflow.",
            "No external network, secrets, Cloudflare write, or Git write is used by this synthetic evidence workflow.",
        ],
    }

    (output / "governance-acceptance.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        "# P3-8 Agent Governance Acceptance Evidence", "", f"- Generated: `{generated_at}`",
        f"- Verdict: `{report['verdict']}`", "- Mode: `synthetic_cross_agent_governance_only`",
        f"- fde-site baseline: `{model['baseline']['fdeSiteMain']}`", f"- fde-ims baseline: `{model['baseline']['fdeImsMain']}`",
        f"- Production commerce enabled: `{str(model['baseline']['productionCommerceEnabled']).lower()}`",
        f"- Sentinel hourly schedule enabled: `{str(model['baseline']['sentinelHourlyScheduleEnabled']).lower()}`",
        f"- Outreach execution: `{model['baseline']['outreachExecutionState']}`", "", "## Handoffs", "",
    ]
    for name, path in model["handoffs"].items(): lines.append(f"- **{name}:** " + " → ".join(path))
    lines.extend(["", "## Hard Safety Gates", ""])
    for gate, enabled in model["hardSafetyGates"].items(): lines.append(f"- {gate}: `{'ON' if enabled else 'OFF'}`")
    lines.extend(["", "## Evidence Boundary", ""])
    for key, value in evidence_boundary.items(): lines.append(f"- {key}: `{value}`")
    lines.extend(["", "## Validation", ""])
    if errors:
        for error in errors: lines.append(f"- BLOCKED: {error}")
    else:
        lines += ["- Cross-agent authority separation: PASS", "- Required handoffs and Administrator gates: PASS", "- Communications separation: PASS", "- Failure/escalation contract: PASS", "- Hard Safety Gates remain OFF: PASS", "- Synthetic evidence / no-write boundary: PASS"]
    lines.extend(["", "## Source Fingerprints", ""])
    for item in fingerprints: lines.append(f"- `{item['path']}` — `{item['sha256']}`")
    lines += ["", "This artifact is evidence only. It is not Administrator approval and performs no merge, release, publication, customer/outbound send, Cloudflare write, or production activation.", ""]
    (output / "governance-acceptance.md").write_text("\n".join(lines), encoding="utf-8")

    if errors:
        print("P3-8 synthetic governance dry-run BLOCKED:")
        for error in errors: print(f"- {error}")
        return 1
    print(f"P3-8 synthetic governance evidence generated: {output}")
    print("Verdict: READY_FOR_ADMIN_REVIEW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
