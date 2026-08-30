#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "operations" / "KALE_OUTREACH_SALES_EXECUTION.md"
AGENT = ROOT / "docs" / "operations" / "KALE_OUTREACH_SALES_AGENT_INSTRUCTIONS.md"
RULES = ROOT / "scripts" / "kale_outreach_sales_rules.py"
TESTS = ROOT / "scripts" / "test_p5_outreach_sales_rules.py"
WORKFLOW = ROOT / ".github" / "workflows" / "kale-outreach-sales.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
P3_DOC = ROOT / "docs" / "operations" / "KALE_OUTREACH.md"
P3_AGENT = ROOT / "docs" / "operations" / "KALE_OUTREACH_AGENT_INSTRUCTIONS.md"
WORKER_CONFIG = ROOT / "worker" / "wrangler.toml"
WORKER_ENTRY = ROOT / "worker" / "src" / "index-v14.js"

errors = []


def fail(message):
    errors.append(message)


def read(path):
    if not path.exists():
        fail(f"required sales-governance file missing: {path.relative_to(ROOT)}")
        return ""
    return path.read_text(encoding="utf-8")


doc = read(DOC)
agent = read(AGENT)
rules = read(RULES)
tests = read(TESTS)
workflow = read(WORKFLOW)
pr_checks = read(PR_CHECKS)
p3_doc = read(P3_DOC)
p3_agent = read(P3_AGENT)
wrangler = read(WORKER_CONFIG)
worker = read(WORKER_ENTRY)

for marker in (
    "world-market GTM and outbound sales agent",
    "Real prospect research boundary",
    "countryComplianceApproved=true",
    "administratorApproval=true",
    "APPROVED_FOR_BOUNDED_SALES_EXECUTION" if "APPROVED_FOR_BOUNDED_SALES_EXECUTION" in doc else "bounded send",
    "Do not repurpose the existing Cloudflare Worker / Brevo",
    "Unapproved outbound customer send: OFF",
):
    if marker not in doc:
        fail(f"sales governance document missing marker: {marker}")

for marker in (
    "world-market GTM and outbound sales agent",
    "research real B2B prospects",
    "countryComplianceApproved = true",
    "administratorApproval = true",
    "SALES_EXECUTION_BLOCKED",
    "Do not:\n\n- perform autonomous bulk sends",
):
    if marker not in agent:
        fail(f"sales agent instructions missing marker: {marker}")

for marker in (
    "ALLOWED_CHANNELS",
    "BLOCKED_PROSPECT_SOURCES",
    "SALES_REQUIRES_CONFIRMED_PUBLISHED_FACTS",
    "PROSPECT_SOURCE_APPROVAL_REQUIRED",
    "B2B_BUSINESS_PURPOSE_REQUIRED",
    "SENSITIVE_PROSPECT_DATA_BLOCKED",
    "BULK_SCRAPING_BLOCKED",
    "PRE_RELEASE_TRANSACTIONAL_CTA_BLOCKED",
    "AUTONOMOUS_BULK_SEND_BLOCKED",
    "CUSTOMER_EMAIL_PATH_REPURPOSE_BLOCKED",
    "CRM_WRITE_NOT_YET_APPROVED",
    "APPROVED_FOR_BOUNDED_SALES_EXECUTION",
    "SALES_EXECUTION_BLOCKED",
):
    if marker not in rules:
        fail(f"sales rules missing marker: {marker}")

for marker in (
    "Kale Outreach sales execution deterministic rule tests passed.",
    "APPROVED_FOR_BOUNDED_SALES_EXECUTION",
    "SALES_EXECUTION_BLOCKED",
    "AUTONOMOUS_BULK_SEND_BLOCKED",
    "CUSTOMER_EMAIL_PATH_REPURPOSE_BLOCKED",
):
    if marker not in tests:
        fail(f"sales deterministic tests missing marker: {marker}")

for marker in (
    "name: Kale Outreach sales governance check",
    "workflow_dispatch:",
    "permissions:",
    "contents: read",
    "python scripts/validate_p5_outreach_sales.py",
    "python scripts/test_p5_outreach_sales_rules.py",
):
    if marker not in workflow:
        fail(f"sales governance workflow missing marker: {marker}")

for forbidden in (
    "schedule:", "cron:", "contents: write", "pull-requests: write", "deployments: write",
    "secrets.", "BREVO_API_KEY", "GMAIL", "LINKEDIN", "CLOUDFLARE_", "wrangler deploy",
    "git push", "gh pr merge",
):
    if forbidden.casefold() in workflow.casefold():
        fail(f"sales governance workflow must remain read-only/no-send: {forbidden}")

for marker in (
    "python scripts/validate_p5_outreach_sales.py",
    "python scripts/test_p5_outreach_sales_rules.py",
):
    if marker not in pr_checks:
        fail(f"PR checks do not enforce sales governance extension: {marker}")

# Preserve the accepted P3 historical baseline instead of silently rewriting it.
if "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL" not in p3_doc:
    fail("historical P3 Outreach execution hold was removed unexpectedly")
if "Draft outbound growth material. Do not send it." not in p3_agent:
    fail("historical P3 Outreach draft-only instruction was removed unexpectedly")

if not re.search(r'^PRODUCTION_COMMERCE_ENABLED\s*=\s*["\']false["\']\s*$', wrangler, re.MULTILINE):
    fail("production commerce must remain explicitly disabled")
for forbidden in ("type==='outreach'", 'type === "outreach"', "type:'outreach'", "sales-send", "marketing-send"):
    if forbidden in worker:
        fail("sales extension must not add an outbound marketing route to the production Worker")

if errors:
    print("Kale Outreach sales governance validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("Kale Outreach gated sales execution governance validation passed.")
