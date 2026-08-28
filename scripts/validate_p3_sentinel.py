#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "kale-sentinel.yml"
PROBE = ROOT / "scripts" / "kale_sentinel_probe.py"
TESTS = ROOT / "scripts" / "test_p3_sentinel_rules.py"
DOC = ROOT / "docs" / "operations" / "KALE_SENTINEL.md"
NOTIFIER = ROOT / ".github" / "workflows" / "notify-slack-on-failure.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
errors = []


def fail(message):
    errors.append(message)


def read(path):
    if not path.exists():
        fail(f"Required P3-4 file is missing: {path.relative_to(ROOT)}")
        return ""
    return path.read_text(encoding="utf-8")


workflow = read(WORKFLOW)
probe = read(PROBE)
tests = read(TESTS)
doc = read(DOC)
notifier = read(NOTIFIER)
pr_checks = read(PR_CHECKS)

workflow_required = (
    "name: Kale Sentinel operational check",
    "workflow_dispatch:",
    "permissions:",
    "contents: read",
    "actions: read",
    "CLOUDFLARE_SENTINEL_TOKEN",
    "python scripts/kale_sentinel_probe.py --live --output sentinel-report",
    "actions/upload-artifact@v4",
    "retention-days: 14",
)
for marker in workflow_required:
    if marker not in workflow:
        fail(f"Kale Sentinel workflow missing marker: {marker}")

# Activation is deliberately manual-only until the dedicated read-only token is
# configured and a manual live observation succeeds.
for forbidden_schedule in ("schedule:", "cron:"):
    if forbidden_schedule in workflow:
        fail(f"Kale Sentinel schedule must remain disabled before activation gate: {forbidden_schedule}")

for forbidden in (
    "CLOUDFLARE_API_TOKEN",
    "wrangler deploy",
    "wrangler pages deploy",
    "git push",
    "gh pr merge",
    "contents: write",
    "actions: write",
    "pull-requests: write",
    "deployments: write",
    "packages: write",
    "id-token: write",
):
    if forbidden in workflow:
        fail(f"Kale Sentinel workflow violates read-only contract: {forbidden}")

probe_required = (
    "CLOUDFLARE_SENTINEL_TOKEN",
    "cloudflare_api_json",
    'method="GET"',
    "ORDER_QUOTE_EXPIRY_STUCK",
    "ORDER_AUDIT_PENDING_STUCK",
    "STRIPE_EVENT_PROCESSING_STUCK",
    "FULFILLMENT_SAFETY_FLAG_VIOLATION",
    "AUTO_SECURITY_STALE",
    "write_report",
    "evidence_only_no_remediation_authority",
)
for marker in probe_required:
    if marker not in probe:
        fail(f"Kale Sentinel probe missing contract marker: {marker}")

for forbidden in (
    'method="POST"',
    'method="PUT"',
    'method="PATCH"',
    'method="DELETE"',
    "CLOUDFLARE_API_TOKEN",
    "ORDER_STATUS.put",
    "wrangler",
    "git push",
    "hooks.slack.com/services/",
):
    if forbidden in probe:
        fail(f"Kale Sentinel probe contains forbidden mutation/credential marker: {forbidden}")

# The report must use fingerprints for record-level evidence, not raw order IDs.
if "def fingerprint(" not in probe or "order_ref={ref}" not in probe:
    fail("Kale Sentinel probe must use redacted record fingerprints")

for marker in (
    "P3-4 Kale Sentinel deterministic rule tests passed.",
    "ORDER_QUOTE_EXPIRY_STUCK",
    "ORDER_PAYMENT_EVIDENCE_MISSING",
    "STRIPE_EVENT_PROCESSING_STUCK",
    "FULFILLMENT_SAFETY_FLAG_VIOLATION",
):
    if marker not in tests:
        fail(f"P3-4 deterministic rule test coverage missing marker: {marker}")

for marker in (
    "Kale Sentinel — Operational Monitoring Foundation",
    "CLOUDFLARE_SENTINEL_TOKEN",
    "Workers KV Storage → Read",
    "must not",
    "Live payments: OFF",
    "schedule is enabled only after the manual live run succeeds",
):
    if marker not in doc:
        fail(f"Kale Sentinel governance document missing marker: {marker}")

if "- Kale Sentinel operational check" not in notifier:
    fail("Existing Slack failure notifier does not monitor Kale Sentinel")

for marker in (
    "python scripts/validate_p3_sentinel.py",
    "python scripts/test_p3_sentinel_rules.py",
):
    if marker not in pr_checks:
        fail(f"PR checks do not enforce P3-4 contract: {marker}")

write_permission = re.compile(
    r"^\s*(contents|actions|pull-requests|id-token|checks|deployments|packages|statuses):\s*write\s*$",
    re.MULTILINE,
)
if write_permission.search(workflow):
    fail("Kale Sentinel workflow contains a write-capable GitHub permission")

if errors:
    print("P3-4 Kale Sentinel validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("P3-4 Kale Sentinel read-only contract validation passed.")
