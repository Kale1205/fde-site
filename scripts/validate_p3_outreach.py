#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "kale-outreach.yml"
RULES = ROOT / "scripts" / "kale_outreach_rules.py"
DRY_RUN = ROOT / "scripts" / "kale_outreach_dry_run.py"
TESTS = ROOT / "scripts" / "test_p3_outreach_rules.py"
DOC = ROOT / "docs" / "operations" / "KALE_OUTREACH.md"
AGENT = ROOT / "docs" / "operations" / "KALE_OUTREACH_AGENT_INSTRUCTIONS.md"
OFFICE_DOC = ROOT / "docs" / "operations" / "KALES_OFFICE.md"
NOTIFIER = ROOT / ".github" / "workflows" / "notify-slack-on-failure.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
WORKER_CONFIG = ROOT / "worker" / "wrangler.toml"
WORKER_ENTRY = ROOT / "worker" / "src" / "index-v14.js"
SITE_CONTENT = ROOT / "content" / "site-content.json"
errors = []


def fail(message):
    errors.append(message)


def read(path):
    if not path.exists():
        fail(f"Required P3-7 file is missing: {path.relative_to(ROOT)}")
        return ""
    return path.read_text(encoding="utf-8")


workflow = read(WORKFLOW)
rules = read(RULES)
dry_run = read(DRY_RUN)
tests = read(TESTS)
doc = read(DOC)
agent = read(AGENT)
office_doc = read(OFFICE_DOC)
notifier = read(NOTIFIER)
pr_checks = read(PR_CHECKS)
worker_config = read(WORKER_CONFIG)
worker_entry = read(WORKER_ENTRY)
site_content = read(SITE_CONTENT)

for marker in ("name: Kale Outreach foundation check", "workflow_dispatch:", "permissions:", "contents: read", "python scripts/validate_p3_outreach.py", "python scripts/test_p3_outreach_rules.py", "python scripts/kale_outreach_dry_run.py --output outreach-report", "actions/upload-artifact@v4", "retention-days: 14"):
    if marker not in workflow: fail(f"Kale Outreach workflow missing marker: {marker}")

for forbidden in ("schedule:", "cron:", "secrets.", "BREVO_API_KEY", "GMAIL", "LINKEDIN", "CLOUDFLARE_", "wrangler deploy", "git push", "gh pr merge", "contents: write", "actions: write", "pull-requests: write", "deployments: write", "id-token: write"):
    if forbidden in workflow: fail(f"Kale Outreach workflow violates draft-only/no-send contract: {forbidden}")

for marker in ("ALLOWED_PUBLIC_SOURCE_REFS", "KALE_OUTREACH_OUTBOUND_ONLY", "OUTREACH_REQUIRES_CONFIRMED_PUBLISHED_FACTS", "UNPUBLISHED_OFFICE_DRAFT_BLOCKED", "UNRELEASED_FEATURE_PROMOTION_BLOCKED", "FOUNDATION_REJECTS_REAL_RECIPIENT_DATA", "FOUNDATION_REJECTS_RECIPIENT_LISTS", "PRE_RELEASE_TRANSACTIONAL_CTA_BLOCKED", "DRAFT_REQUIRES_ADMIN_APPROVAL", "SEGMENT_PROPOSAL_ONLY_NO_REAL_RECIPIENTS", "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL", '"outboundSend": False', '"recipientHarvest": False', '"brevoSend": False', '"gmailSend": False', '"linkedinSend": False', '"crmWrite": False'):
    if marker not in rules: fail(f"Kale Outreach rules missing marker: {marker}")

for forbidden in ("requests.", "urllib.request", "http.client", "smtplib", "api.brevo.com", "hooks.slack.com", "api.linkedin.com", "googleapiclient", "subprocess"):
    if forbidden.casefold() in rules.casefold() or forbidden.casefold() in dry_run.casefold(): fail(f"Kale Outreach deterministic foundation contains external/send capability marker: {forbidden}")

for marker in ("P3-7 Kale Outreach deterministic rule tests passed.", "OUTREACH_REQUIRES_CONFIRMED_PUBLISHED_FACTS", "UNPUBLISHED_OFFICE_DRAFT_BLOCKED", "FOUNDATION_REJECTS_REAL_RECIPIENT_DATA", "PRE_RELEASE_TRANSACTIONAL_CTA_BLOCKED", "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL"):
    if marker not in tests: fail(f"P3-7 deterministic rule coverage missing marker: {marker}")

for marker in ("Kale Outreach — Outbound Growth Foundation", "Administrator approval → Send", "confirmed and already-published information only", "SEGMENT_PROPOSAL_ONLY_NO_REAL_RECIPIENTS", "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL", "P5-3", "does not replace or repurpose", "recipient", "Live payments: OFF", "Production fulfillment: OFF", "Real installer customer distribution: OFF", "Automatic customer fulfillment mail: OFF", "Agent auto-merge: OFF", "Agent auto-release: OFF", "Unapproved public posting: OFF", "Unapproved inbound / outbound customer send: OFF"):
    if marker not in doc: fail(f"Kale Outreach governance document missing marker: {marker}")

for marker in ("Use connected current state before historical chat", "Do not invent facts", "Do not send outbound messages", "P5-3", "Do not make the final legal/compliance decision yourself", "SEGMENT_PROPOSAL_ONLY_NO_REAL_RECIPIENTS", "DRAFT_REQUIRES_ADMIN_APPROVAL"):
    if marker not in agent: fail(f"Kale Outreach agent instructions missing marker: {marker}")

if "After publication, Kale Outreach may separately use approved public facts" not in office_doc: fail("Kale’s Office handoff to Outreach is missing unexpectedly")
if "- Kale Outreach foundation check" not in notifier: fail("Existing Slack failure notifier does not monitor Kale Outreach foundation failures")
for marker in ("python scripts/validate_p3_outreach.py", "python scripts/test_p3_outreach_rules.py", "node scripts/test_production_commerce_gate.mjs"):
    if marker not in pr_checks: fail(f"PR checks do not enforce required P3-7/current safety contract: {marker}")

if 'main = "src/index-v14.js"' not in worker_config: fail("Production Worker entry changed unexpectedly")
if 'PRODUCTION_COMMERCE_ENABLED = "false"' not in worker_config: fail("Production commerce fail-closed variable is missing")
for marker in ("PRE_RELEASE_COMMERCE_TYPES", "FDE_COMMERCE_DISABLED_PRE_RELEASE"):
    if marker not in worker_entry: fail(f"Production pre-release commerce gate missing marker: {marker}")
for forbidden in ("type==='outreach'", 'type === "outreach"', "type:'outreach'"):
    if forbidden in worker_entry: fail("P3-7 must not add an Outreach send route to the production Worker")
if '"news"' not in site_content: fail("Current public site-content News source is missing unexpectedly")

for ref in ("content/site-content.json", "index.html", "ja/index.html", "license.html", "ja/license.html", "news.html", "ja/news.html", "demo.html", "ja/demo.html", "why.html", "ja/why.html", "goals.html", "ja/goals.html"):
    if not (ROOT / ref).exists(): fail(f"Approved public grounding source missing: {ref}")

write_permission = re.compile(r"^\s*(contents|actions|pull-requests|id-token|checks|deployments|packages|statuses):\s*write\s*$", re.MULTILINE)
if write_permission.search(workflow): fail("Kale Outreach workflow contains a write-capable GitHub permission")

if errors:
    print("P3-7 Kale Outreach validation failed:\n")
    for item in errors: print(f"- {item}")
    sys.exit(1)

print("P3-7 Kale Outreach outbound-growth/draft-only foundation validation passed.")
