#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "kales-office.yml"
RULES = ROOT / "scripts" / "kales_office_rules.py"
DRY_RUN = ROOT / "scripts" / "kales_office_dry_run.py"
TESTS = ROOT / "scripts" / "test_p3_office_rules.py"
DOC = ROOT / "docs" / "operations" / "KALES_OFFICE.md"
AGENT_INSTRUCTIONS = ROOT / "docs" / "operations" / "KALES_OFFICE_AGENT_INSTRUCTIONS.md"
NOTIFIER = ROOT / ".github" / "workflows" / "notify-slack-on-failure.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
CMS_ADMIN = ROOT / "cms-admin.js"
NEWS_TRANSLATION = ROOT / "news-translation-hook.js"
WORKER_CONFIG = ROOT / "worker" / "wrangler.toml"
WORKER_ENTRY = ROOT / "worker" / "src" / "index-v14.js"
SITE_CONTENT = ROOT / "content" / "site-content.json"
errors = []


def fail(message):
    errors.append(message)


def read(path):
    if not path.exists():
        fail(f"Required P3-6 file is missing: {path.relative_to(ROOT)}")
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
cms_admin = read(CMS_ADMIN)
news_translation = read(NEWS_TRANSLATION)
worker_config = read(WORKER_CONFIG)
worker_entry = read(WORKER_ENTRY)
site_content = read(SITE_CONTENT)

for marker in (
    "name: Kale’s Office foundation check",
    "workflow_dispatch:",
    "permissions:",
    "contents: read",
    "python scripts/validate_p3_office.py",
    "python scripts/test_p3_office_rules.py",
    "python scripts/kales_office_dry_run.py --output office-report",
    "actions/upload-artifact@v4",
    "name: kales-office-foundation-report",
    "retention-days: 14",
):
    if marker not in workflow:
        fail(f"Kale’s Office workflow missing marker: {marker}")

for forbidden in (
    "schedule:",
    "cron:",
    "secrets.",
    "ADMIN_FULFILLMENT_KEY",
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
        fail(f"Kale’s Office workflow violates draft-only/no-publish contract: {forbidden}")

for marker in (
    "KALES_OFFICE_PUBLIC_EDITORIAL_ONLY",
    "FOUNDATION_DRY_RUN_REQUIRES_SYNTHETIC_INPUT",
    '"cmsPublish": False',
    '"publicPost": False',
    '"outboundCampaign": False',
    '"outboundSend": False',
    '"customerSend": False',
    '"gitWrite": False',
    '"cloudflareDeploy": False',
    "DRAFT_REQUIRES_ADMIN_APPROVAL",
    "EXISTING_CMS_SAVE_FLOW",
    "UNRELEASED_PRODUCT_NEWS_BLOCKED",
    "UNVERIFIED_GUARD_IMPROVEMENT_BLOCKED",
    "ADMIN_REQUEST_REQUIRED_FOR_SOCIAL",
    "unsupportedClaimsMustBeEscalated",
    "cms_boundary_fingerprints",
):
    if marker not in rules:
        fail(f"Kale’s Office rules missing contract marker: {marker}")

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
        fail(f"Kale’s Office deterministic foundation contains external/publish capability marker: {forbidden}")

for marker in (
    "P3-6 Kale’s Office deterministic rule tests passed.",
    "Product",
    "Development",
    "Social",
    "DRAFT_REQUIRES_ADMIN_APPROVAL",
    "EXISTING_CMS_SAVE_FLOW",
    "UNRELEASED_PRODUCT_NEWS_BLOCKED",
    "SENSITIVE_SECURITY_DETAIL_BLOCKED",
    "ADMIN_REQUEST_REQUIRED_FOR_SOCIAL",
):
    if marker not in tests:
        fail(f"P3-6 deterministic rule test coverage missing marker: {marker}")

for marker in (
    "Kale’s Office — Public Editorial Foundation",
    "Mirror/Guard → Kale’s Office → Administrator approval → Publish",
    "Mirror release → Product News",
    "Guard improvement → Development News",
    "Social content only when Administrator explicitly requests it",
    "does not alter or replace the existing CMS publication path",
    "must not publish",
    "sales campaign",
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
        fail(f"Kale’s Office governance document missing marker: {marker}")

for marker in (
    "Administrator explicit approval",
    "Use connected current state before historical chat",
    "Do not publish",
    "Do not invent",
    "Mirror release → Product News",
    "Guard improvement → Development News",
    "Social content only when Administrator explicitly requests it",
    "not a sales campaign",
):
    if marker not in agent_instructions:
        fail(f"Kale’s Office agent instructions missing marker: {marker}")

if "- Kale’s Office foundation check" not in notifier:
    fail("Existing Slack failure notifier does not monitor Kale’s Office foundation failures")

for marker in (
    "python scripts/validate_p3_office.py",
    "python scripts/test_p3_office_rules.py",
):
    if marker not in pr_checks:
        fail(f"PR checks do not enforce P3-6 contract: {marker}")

for marker in (
    "const OWNER='Kale1205',REPO='fde-site',BRANCH='main';",
    "async function saveCms",
    "async function createNews",
    "CMS: add bilingual News",
):
    if marker not in cms_admin:
        fail(f"Existing CMS publication boundary marker missing unexpectedly: {marker}")

for marker in (
    "admin_translate_fields",
    "prepareAndReplay",
    "英語版News",
):
    if marker not in news_translation:
        fail(f"Existing News translation boundary marker missing unexpectedly: {marker}")

if 'main = "src/index-v14.js"' not in worker_config:
    fail("Cloudflare production Worker entry changed unexpectedly during P3-6 foundation")
if "admin_translate_fields" not in worker_entry:
    fail("Current Worker CMS translation endpoint marker missing unexpectedly")
if '"news"' not in site_content or '"category"' not in site_content:
    fail("Current CMS News data structure marker missing unexpectedly")

write_permission = re.compile(
    r"^\s*(contents|actions|pull-requests|id-token|checks|deployments|packages|statuses):\s*write\s*$",
    re.MULTILINE,
)
if write_permission.search(workflow):
    fail("Kale’s Office workflow contains a write-capable GitHub permission")

if errors:
    print("P3-6 Kale’s Office validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("P3-6 Kale’s Office public-editorial/draft-only foundation validation passed.")
