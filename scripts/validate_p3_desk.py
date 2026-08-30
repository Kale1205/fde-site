#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "kale-desk.yml"
RULES = ROOT / "scripts" / "kale_desk_rules.py"
DRY_RUN = ROOT / "scripts" / "kale_desk_dry_run.py"
TESTS = ROOT / "scripts" / "test_p3_desk_rules.py"
DOC = ROOT / "docs" / "operations" / "KALE_DESK.md"
AGENT_INSTRUCTIONS = ROOT / "docs" / "operations" / "KALE_DESK_AGENT_INSTRUCTIONS.md"
NOTIFIER = ROOT / ".github" / "workflows" / "notify-slack-on-failure.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
CONTACT_DIRECT = ROOT / "contact-direct.js"
CONTACT_CONFIG = ROOT / "contact-config.js"
WORKER_CONFIG = ROOT / "worker" / "wrangler.toml"
WORKER_ENTRY = ROOT / "worker" / "src" / "index-v14.js"
errors = []


def fail(message):
    errors.append(message)


def read(path):
    if not path.exists():
        fail(f"Required P3-5 file is missing: {path.relative_to(ROOT)}")
        return ""
    return path.read_text(encoding="utf-8")


workflow = read(WORKFLOW)
rules = read(RULES)
dry_run = read(DRY_RUN)
tests = read(TESTS)
doc = read(DOC)
agent_instructions = read(AGENT_INSTRUCTIONS)
notifier = read(NOTIFIER)
pr_checks = read(PR_CHECKS)
contact_direct = read(CONTACT_DIRECT)
contact_config = read(CONTACT_CONFIG)
worker_config = read(WORKER_CONFIG)
worker_entry = read(WORKER_ENTRY)

for marker in (
    "name: Kale Desk foundation check",
    "workflow_dispatch:",
    "permissions:",
    "contents: read",
    "python scripts/validate_p3_desk.py",
    "python scripts/test_p3_desk_rules.py",
    "python scripts/kale_desk_dry_run.py --output desk-report",
    "actions/upload-artifact@v4",
    "retention-days: 14",
):
    if marker not in workflow:
        fail(f"Kale Desk workflow missing marker: {marker}")

for forbidden in (
    "schedule:",
    "cron:",
    "secrets.",
    "BREVO_API_KEY",
    "SLACK_WEBHOOK",
    "CLOUDFLARE_",
    "wrangler deploy",
    "git push",
    "gh pr merge",
    "contents: write",
    "actions: write",
    "pull-requests: write",
    "deployments: write",
    "id-token: write",
):
    if forbidden in workflow:
        fail(f"Kale Desk workflow violates foundation/no-send contract: {forbidden}")

for marker in (
    "KALE_DESK_INBOUND_ONLY",
    "FOUNDATION_DRY_RUN_REQUIRES_SYNTHETIC_INPUT",
    '"customerSend": False',
    '"outboundSales": False',
    '"orderMutation": False',
    '"paymentOperation": False',
    '"fulfillmentOperation": False',
    '"cloudflareDeploy": False',
    '"cloudflareKvWrite": False',
    '"gitMerge": False',
    '"publicPost": False',
    "DRAFT_REQUIRES_ADMIN_APPROVAL",
    "CANDIDATE_ONLY_NOT_PUBLISHED",
    "unsupportedClaimsMustBeEscalated",
    "source_fingerprints",
):
    if marker not in rules:
        fail(f"Kale Desk rules missing contract marker: {marker}")

for forbidden in (
    "requests.",
    "urllib.",
    "http.client",
    "smtplib",
    "sendgrid",
    "brevo",
    "hooks.slack.com",
    "api.cloudflare.com",
    "subprocess",
):
    if forbidden.casefold() in rules.casefold() or forbidden.casefold() in dry_run.casefold():
        fail(f"Kale Desk deterministic foundation contains external/send capability marker: {forbidden}")

for marker in (
    "P3-5 Kale Desk deterministic rule tests passed.",
    "INBOUND_ONLY",
    "customerSend",
    "orderMutation",
    "DRAFT_REQUIRES_ADMIN_APPROVAL",
    "CANDIDATE_ONLY_NOT_PUBLISHED",
):
    if marker not in tests:
        fail(f"P3-5 deterministic rule test coverage missing marker: {marker}")

for marker in (
    "Kale Desk — Inbound Customer Support Foundation",
    "Customer → Kale Desk → Administrator approval → Reply",
    "does not alter or replace the existing Contact intake path",
    "must not send",
    "Outbound sales",
    "FAQ candidate",
    "Live payments: OFF",
    "Production fulfillment: OFF",
    "Real installer customer distribution: OFF",
    "Automatic customer fulfillment mail: OFF",
    "Agent auto-merge: OFF",
    "Agent auto-release: OFF",
    "Unapproved public posting: OFF",
    "Unapproved inbound / outbound customer send: OFF",
):
    if marker not in doc:
        fail(f"Kale Desk governance document missing marker: {marker}")

for marker in (
    "Administrator explicit approval",
    "Use connected current state before historical chat",
    "source-backed reply draft",
    "Do not send",
    "Do not invent",
    "FAQ candidate only",
):
    if marker not in agent_instructions:
        fail(f"Kale Desk agent instructions missing marker: {marker}")

if "- Kale Desk foundation check" not in notifier:
    fail("Existing Slack failure notifier does not monitor Kale Desk foundation failures")

for marker in (
    "python scripts/validate_p3_desk.py",
    "python scripts/test_p3_desk_rules.py",
):
    if marker not in pr_checks:
        fail(f"PR checks do not enforce P3-5 contract: {marker}")

# Protect the existing public Contact boundary from accidental duplicate intake work.
for marker in (
    "type:'inquiry'",
    "FDE_CONTACT_API",
    "ensureTurnstileRuntime",
):
    if marker not in contact_direct:
        fail(f"Existing Contact intake marker missing unexpectedly: {marker}")
if "kales-fde-contact.reyouinjune.workers.dev" not in contact_config:
    fail("Existing production Contact endpoint marker missing unexpectedly")
if 'main = "src/index-v14.js"' not in worker_config:
    fail("Cloudflare production Worker entry changed unexpectedly during P3-5 foundation")
if "admin_faq_enrich" not in worker_entry or "admin_translate_fields" not in worker_entry:
    fail("Current Worker v14 CMS AI boundary changed unexpectedly during P3-5 foundation")

write_permission = re.compile(
    r"^\s*(contents|actions|pull-requests|id-token|checks|deployments|packages|statuses):\s*write\s*$",
    re.MULTILINE,
)
if write_permission.search(workflow):
    fail("Kale Desk workflow contains a write-capable GitHub permission")

if errors:
    print("P3-5 Kale Desk validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("P3-5 Kale Desk inbound-only/no-send foundation validation passed.")
