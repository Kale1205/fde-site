#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "docs" / "operations" / "sales-operations-governance.json"
ARCH_DOC = ROOT / "docs" / "operations" / "SALES_OPERATIONS_ARCHITECTURE.md"
RUNTIME_DOC = ROOT / "docs" / "operations" / "KALE_OUTREACH_CODEX_RUNTIME.md"
RULES = ROOT / "scripts" / "sales_operations_rules.py"
TESTS = ROOT / "scripts" / "test_sales_operations_rules.py"
EXEC_RULES = ROOT / "scripts" / "kale_outreach_sales_rules.py"
EXEC_TESTS = ROOT / "scripts" / "test_p5_outreach_sales_rules.py"
WORKFLOW = ROOT / ".github" / "workflows" / "kale-outreach-sales.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
WRANGLER = ROOT / "worker" / "wrangler.toml"

REQUIRED_SHEETS = {"Prospects", "Activities", "Campaigns", "Metrics", "Dashboard"}
REQUIRED_PROSPECT_COLUMNS = {
    "Prospect ID", "Company", "Country", "Industry", "Website", "Company size signal",
    "Fit Score", "Fit rationale", "Source URL", "Source system", "Source checked date",
    "Evidence", "Confidence", "Contact route", "Contact person", "Business email",
    "Current status", "Campaign ID", "Last contact", "Next follow-up", "Reply status",
    "Meeting status", "Conversion status", "Notes",
}
REQUIRED_SOURCE_FIELDS = {"Source URL", "Source system", "Source checked date", "Evidence", "Confidence"}
REQUIRED_DETERMINISTIC = {
    "schema validation", "ID assignment", "duplicate detection", "status validation",
    "approval-protected transition validation", "activity history integrity", "KPI calculation",
    "dashboard aggregation", "data-quality checks",
}
REQUIRED_SEND_GATES = [
    "factsConfirmedPublished", "prospectSourceApproved", "countryComplianceApproved",
    "complianceEvidenceRef", "administratorApproval", "approvalScopeId",
    "approved sender/channel", "noMaterialClaimChanged",
]
REQUIRED_PROHIBITED = {
    "autonomous unrestricted bulk send", "mass scraping / harvesting",
    "purchased unreviewed recipient lists", "sensitive personal data collection",
    "self-approval", "approval reuse outside scope", "unrestricted CRM mutation",
    "unapproved sales send", "unapproved discount", "unsupported product claim",
    "commercial promise without source",
    "marketing reuse of existing Cloudflare/Brevo customer-order mail path",
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def validate_model(model: dict) -> list[str]:
    errors: list[str] = []
    fail = errors.append
    if model.get("schemaVersion") != 1:
        fail("Sales Operations schemaVersion must be 1")
    if model.get("status") != "TARGET_PENDING_RUNTIME_CONNECTION":
        fail("Sales Operations connection must remain target/pending")
    if model.get("ownerRole") != "Kale Outreach":
        fail("Kale Outreach must own the Sales Operations role")
    if model.get("executionProfile") != "Codex / Kale Outreach Sales Mode":
        fail("Sales Operations execution profile must be Codex / Kale Outreach Sales Mode")
    if model.get("finalAuthority") != "Administrator Kale":
        fail("Administrator Kale must remain final authority")

    store = model.get("persistentDataLayer", {})
    if store.get("target") != "Baked Kale shared Google Drive / Google Sheets":
        fail("Google Drive / Google Sheets target data layer changed")
    for key in ("connectionImplemented", "credentialsVerified", "fileOrFolderIdsConfigured", "writePermissionVerified", "publicSharingAllowed"):
        if store.get(key) is not False:
            fail(f"Sales data runtime connection property must remain false in this foundation: {key}")

    boundary = model.get("storageBoundary", {})
    allowed = set(boundary.get("realSalesDataAllowedStores", []))
    if allowed != {"Administrator-approved Baked Kale shared Google Drive / Google Sheets"}:
        fail("real sales-data allowlist must contain only the approved external Sales Master target")
    forbidden = set(boundary.get("realSalesDataForbiddenStores", []))
    for required in ("GitHub source", "repository fixtures", "GitHub Actions artifacts", "public Slack channels", "synthetic test datasets"):
        if required not in forbidden:
            fail(f"real sales-data forbidden store missing: {required}")
    if boundary.get("sensitivePersonalDataAllowed") is not False:
        fail("sensitive personal data must remain prohibited")
    if boundary.get("businessPurposeMinimumNecessary") is not True:
        fail("business-purpose minimum-necessary rule must remain enabled")

    sheets = model.get("sheets", {})
    if set(sheets) != REQUIRED_SHEETS:
        fail("Sales Master logical sheet set changed")
    if not REQUIRED_PROSPECT_COLUMNS.issubset(set(sheets.get("Prospects", []))):
        fail("Prospects schema is incomplete")

    provenance = model.get("sourceProvenance", {})
    if set(provenance.get("requiredFields", [])) != REQUIRED_SOURCE_FIELDS:
        fail("source provenance field set is incomplete")
    if provenance.get("unverifiedFactsMayBecomeConfirmed") is not False:
        fail("unverified facts must not become confirmed Sales Master facts")

    deterministic = model.get("deterministicLayer", {})
    if not REQUIRED_DETERMINISTIC.issubset(set(deterministic.get("responsibilities", []))):
        fail("deterministic Sales Operations responsibilities are incomplete")
    if deterministic.get("llmMayBypassApprovalChecks") is not False:
        fail("LLM must not bypass deterministic approval checks")
    if deterministic.get("duplicatePrimaryKey") != "normalized company website hostname/domain":
        fail("domain-based primary duplicate key changed")
    if "human review" not in deterministic.get("duplicateFallback", ""):
        fail("company-name duplicate fallback must require human review")

    lifecycle = model.get("lifecycle", {})
    states = set(lifecycle.get("states", []))
    expected_states = {
        "RESEARCHED", "QUALIFIED", "DISQUALIFIED", "ADMIN_APPROVED", "READY_FOR_OUTREACH",
        "SENT", "REPLIED", "POSITIVE_REPLY", "NEGATIVE_REPLY", "MEETING", "WON", "LOST",
    }
    if states != expected_states:
        fail("prospect lifecycle state set changed")
    if set(lifecycle.get("terminalStates", [])) != {"DISQUALIFIED", "WON", "LOST"}:
        fail("terminal lifecycle state set changed")
    if set(lifecycle.get("approvalProtectedStates", [])) != {"ADMIN_APPROVED", "READY_FOR_OUTREACH", "SENT"}:
        fail("approval-protected lifecycle state set changed")
    transitions = lifecycle.get("transitions", {})
    if transitions.get("QUALIFIED") != ["ADMIN_APPROVED", "DISQUALIFIED"]:
        fail("QUALIFIED transition contract changed")
    if transitions.get("ADMIN_APPROVED") != ["READY_FOR_OUTREACH"]:
        fail("ADMIN_APPROVED transition contract changed")
    if transitions.get("READY_FOR_OUTREACH") != ["SENT"]:
        fail("READY_FOR_OUTREACH transition contract changed")

    if model.get("sendGates") != REQUIRED_SEND_GATES:
        fail("Sales Operations send-gate set changed")

    execution = model.get("executionModes", {})
    if execution.get("oneShot") != "AVAILABLE_AS_ADMINISTRATOR_DIRECTED_MODE":
        fail("one-shot Administrator-directed Sales Mode is missing")
    for key in ("scheduled", "eventDriven"):
        if execution.get(key) != "TARGET_ONLY_NOT_ACTIVE":
            fail(f"Sales execution mode must remain target-only: {key}")

    commercial = model.get("commercialState", {})
    if commercial.get("productionCommerceEnabled") is not False:
        fail("production commerce must remain false")
    if set(commercial.get("allowedPreReleaseCtas", [])) != {"learn more", "Demo", "Contact", "discovery conversation"}:
        fail("pre-release CTA allowlist changed")

    if not REQUIRED_PROHIBITED.issubset(set(model.get("prohibited", []))):
        fail("Sales Operations prohibited-action set is incomplete")
    return errors


def validate_repository() -> list[str]:
    errors: list[str] = []
    fail = errors.append
    required_files = (MODEL_PATH, ARCH_DOC, RUNTIME_DOC, RULES, TESTS, EXEC_RULES, EXEC_TESTS, WORKFLOW, PR_CHECKS, WRANGLER)
    for path in required_files:
        if not path.is_file():
            fail(f"required Sales Operations file missing: {path.relative_to(ROOT)}")
    if errors:
        return errors

    arch = read(ARCH_DOC)
    for marker in (
        "TARGET / PENDING RUNTIME CONNECTION",
        "Baked Kale shared Google Drive / Google Sheets",
        "Real prospect and recipient data",
        "Deterministic Sales Operations layer",
        "Approval-protected transitions",
        "registrable-looking domain / hostname",
        "PRODUCTION_COMMERCE_ENABLED = \"false\"",
    ):
        if marker not in arch:
            fail(f"Sales Operations architecture missing marker: {marker}")

    runtime = read(RUNTIME_DOC)
    for marker in (
        "Codex / Kale Outreach Sales Mode",
        "Kale Outreach Role ≠ Codex itself",
        "Codex Engineering Mode → code",
        "Codex / Kale Outreach Sales Mode → sales operations",
        "No schedule is enabled by this architecture change.",
        "Real prospect / recipient information must not be stored in",
    ):
        if marker not in runtime:
            fail(f"Kale Outreach Codex runtime document missing marker: {marker}")

    rules = read(RULES)
    for marker in (
        "detect_duplicate_prospects",
        "assign_id",
        "validate_prospect",
        "missing_send_gates",
        "validate_transition",
        "calculate_metrics",
    ):
        if marker not in rules:
            fail(f"deterministic Sales Operations rules missing marker: {marker}")

    tests = read(TESTS)
    if "Sales Operations deterministic rule tests passed." not in tests:
        fail("Sales Operations deterministic test success marker missing")

    execution_rules = read(EXEC_RULES)
    execution_tests = read(EXEC_TESTS)
    for marker in ("noMaterialClaimChanged", "SALES_EXECUTION_BLOCKED", "APPROVED_FOR_BOUNDED_SALES_EXECUTION"):
        if marker not in execution_rules:
            fail(f"bounded sales execution rules missing required gate marker: {marker}")
        if marker not in execution_tests:
            fail(f"bounded sales execution tests missing required gate coverage marker: {marker}")

    workflow = read(WORKFLOW)
    pr_checks = read(PR_CHECKS)
    for text, label in ((workflow, "Kale Outreach sales workflow"), (pr_checks, "PR checks")):
        for marker in ("python scripts/validate_sales_operations.py", "python scripts/test_sales_operations_rules.py"):
            if marker not in text:
                fail(f"{label} does not enforce Sales Operations foundation: {marker}")

    for forbidden in ("schedule:", "cron:", "contents: write", "pull-requests: write", "secrets.", "wrangler deploy"):
        if forbidden.casefold() in workflow.casefold():
            fail(f"Kale Outreach sales governance workflow must remain read-only/manual-only: {forbidden}")

    wrangler = read(WRANGLER)
    if 'PRODUCTION_COMMERCE_ENABLED = "false"' not in wrangler:
        fail("production commerce must remain disabled")
    return errors


def main() -> int:
    try:
        model = json.loads(read(MODEL_PATH))
    except Exception as exc:
        print(f"Sales Operations governance validation failed: {exc}")
        return 1
    errors = validate_model(model)
    errors.extend(validate_repository())
    if errors:
        print("Sales Operations governance validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Sales Operations governance validation passed.")
    print("Persistent-data boundary, deterministic integrity, lifecycle approval gates, and pre-release safety are consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
