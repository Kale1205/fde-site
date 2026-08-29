#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "docs" / "operations" / "p3-agent-governance.json"

EXPECTED_AGENTS = {
    "Kale Guard",
    "Mirror Kale",
    "Kale Review",
    "Kale Sentinel",
    "Kale Desk",
    "Kale’s Office",
    "Kale Outreach",
}

EXPECTED_HANDOFFS = {
    "productRelease": ["Mirror Kale", "Kale Review", "Kale Guard", "Administrator approval", "Release"],
    "publicEditorialGrowth": ["Mirror/Guard", "Kale’s Office", "Administrator approval", "Publish", "Kale Outreach", "Administrator approval", "Send"],
    "inboundCustomer": ["Customer", "Kale Desk", "Administrator approval", "Reply"],
    "operations": ["GitHub / Cloudflare / Stripe", "Kale Sentinel", "Administrator"],
}

CAPABILITY_KEYS = {
    "productImplementation", "qaVerdict", "securityGateAuthority", "operationalObservation",
    "operationalMutation", "inboundDraft", "publicDraft", "outboundDraft", "customerSend",
    "publicPublish", "outboundSend", "recipientHarvest", "crmWrite", "merge", "release",
    "productionActivation",
}


def load_matrix(path: Path = MATRIX_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _agent_map(model: dict) -> dict[str, dict]:
    agents = model.get("agents")
    if not isinstance(agents, list):
        return {}
    return {agent.get("name"): agent for agent in agents if isinstance(agent, dict) and isinstance(agent.get("name"), str)}


def validate_model(model: dict) -> list[str]:
    errors: list[str] = []
    fail = errors.append

    if model.get("schemaVersion") != 1:
        fail("schemaVersion must be 1")
    if model.get("phase") != "P3-8":
        fail("phase must be P3-8")
    if model.get("title") != "Agent Governance Acceptance":
        fail("title must be Agent Governance Acceptance")

    baseline = model.get("baseline", {})
    for key in ("fdeSiteMain", "fdeImsMain"):
        value = baseline.get(key)
        if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{40}", value):
            fail(f"baseline.{key} must be a pinned 40-character commit SHA")
    if baseline.get("productionCommerceEnabled") is not False:
        fail("baseline.productionCommerceEnabled must remain false")
    if baseline.get("sentinelHourlyScheduleEnabled") is not False:
        fail("baseline.sentinelHourlyScheduleEnabled must remain false")
    if baseline.get("outreachExecutionState") != "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL":
        fail("Outreach execution must remain blocked until P5-3 and Administrator approval")

    administrator = model.get("administrator", {})
    if administrator.get("finalApprovalAuthority") is not True:
        fail("Administrator must retain final approval authority")
    required_admin_gates = {
        "material_product_scope_or_architecture", "merge", "release", "cms_or_public_publish",
        "customer_reply_send", "outbound_campaign_send", "live_payment_activation",
        "production_fulfillment_activation", "installer_customer_distribution",
    }
    if not required_admin_gates.issubset(set(administrator.get("approvalGates", []))):
        fail("Administrator approval-gate set is incomplete")

    hard_gates = model.get("hardSafetyGates", {})
    expected_hard_gates = {
        "livePayments", "productionFulfillment", "realInstallerCustomerDistribution",
        "automaticCustomerFulfillmentMail", "agentAutoMerge", "agentAutoRelease",
        "unapprovedPublicPosting", "unapprovedInboundCustomerSend", "unapprovedOutboundCustomerSend",
    }
    if set(hard_gates) != expected_hard_gates:
        fail("hardSafetyGates must contain the complete P3-8 gate set")
    for gate, enabled in hard_gates.items():
        if enabled is not False:
            fail(f"hard safety gate must remain OFF: {gate}")

    agents = _agent_map(model)
    if set(agents) != EXPECTED_AGENTS:
        fail(f"agent set mismatch: expected {sorted(EXPECTED_AGENTS)}")
        return errors

    for name, agent in agents.items():
        caps = agent.get("capabilities", {})
        if set(caps) != CAPABILITY_KEYS:
            fail(f"{name} capability set is incomplete")
            continue
        if any(not isinstance(value, bool) for value in caps.values()):
            fail(f"{name} capabilities must be boolean")
        for forbidden in ("merge", "release", "productionActivation"):
            if caps.get(forbidden):
                fail(f"{name} must not hold {forbidden} authority")
        if caps.get("productImplementation") and caps.get("qaVerdict"):
            fail(f"{name} cannot implement and issue final QA verdicts")
        if caps.get("productImplementation") and caps.get("securityGateAuthority"):
            fail(f"{name} cannot implement and self-certify security")
        if caps.get("operationalObservation") and caps.get("operationalMutation"):
            fail(f"{name} cannot both observe and mutate operations")
        if caps.get("inboundDraft") and caps.get("customerSend"):
            fail(f"{name} cannot draft inbound support and self-send it")
        if caps.get("publicDraft") and caps.get("publicPublish"):
            fail(f"{name} cannot draft public editorial and self-publish it")
        if caps.get("outboundDraft") and caps.get("outboundSend"):
            fail(f"{name} cannot draft outbound growth and self-send it")

    guard = agents["Kale Guard"]["capabilities"]
    if guard.get("securityGateAuthority") is not True:
        fail("Kale Guard must own security-gate assurance")
    for key in ("productImplementation", "qaVerdict", "operationalMutation", "customerSend", "publicPublish", "outboundSend"):
        if guard.get(key): fail(f"Kale Guard must not hold {key}")

    mirror = agents["Mirror Kale"]["capabilities"]
    if mirror.get("productImplementation") is not True:
        fail("Mirror Kale must own product implementation")
    for key in ("qaVerdict", "securityGateAuthority", "customerSend", "publicPublish", "outboundSend"):
        if mirror.get(key): fail(f"Mirror Kale must not hold {key}")

    review_agent = agents["Kale Review"]
    review = review_agent["capabilities"]
    if review.get("qaVerdict") is not True:
        fail("Kale Review must own the independent QA verdict")
    if review_agent.get("maySelfAcceptMateriallyAuthoredChange") is not False:
        fail("Kale Review must not self-ACCEPT a materially authored change")
    for key in ("productImplementation", "securityGateAuthority", "merge", "release"):
        if review.get(key): fail(f"Kale Review must not hold {key}")

    sentinel = agents["Kale Sentinel"]["capabilities"]
    if sentinel.get("operationalObservation") is not True:
        fail("Kale Sentinel must retain read-only operational observation")
    if sentinel.get("operationalMutation") is not False:
        fail("Kale Sentinel must not mutate operational state")

    desk = agents["Kale Desk"]["capabilities"]
    if desk.get("inboundDraft") is not True:
        fail("Kale Desk must be inbound-draft only")
    for key in ("customerSend", "outboundDraft", "outboundSend"):
        if desk.get(key): fail(f"Kale Desk must not hold {key}")

    office = agents["Kale’s Office"]["capabilities"]
    if office.get("publicDraft") is not True:
        fail("Kale’s Office must own public editorial drafting")
    for key in ("publicPublish", "outboundDraft", "outboundSend"):
        if office.get(key): fail(f"Kale’s Office must not hold {key}")

    outreach = agents["Kale Outreach"]["capabilities"]
    if outreach.get("outboundDraft") is not True:
        fail("Kale Outreach must own outbound growth drafting")
    for key in ("outboundSend", "customerSend", "recipientHarvest", "crmWrite", "publicPublish"):
        if outreach.get(key): fail(f"Kale Outreach must not hold {key}")

    for name, agent in agents.items():
        caps = agent["capabilities"]
        if caps.get("recipientHarvest"): fail(f"{name} must not harvest real recipients in P3")
        if caps.get("crmWrite"): fail(f"{name} must not write CRM/recipient databases in P3")

    if model.get("handoffs") != EXPECTED_HANDOFFS:
        fail("cross-agent handoff graph does not match the approved P3 governance model")

    failure = model.get("failureHandling", {})
    if failure.get("agentSelfRemediationBeyondAuthority") is not False:
        fail("agents must not self-remediate beyond their authority")
    if failure.get("escalateImpactEvidenceRecommendedAction") is not True:
        fail("failure handling must escalate impact, evidence, and recommended action")
    if failure.get("deterministicRecoveryOnlyIfPreApproved") is not True:
        fail("automatic recovery must be deterministic and pre-approved")

    evidence = model.get("evidence", {})
    if evidence.get("mode") != "synthetic_cross_agent_governance_only":
        fail("P3-8 evidence must remain synthetic cross-agent governance evidence")
    expected_false_evidence = (
        "containsRealCustomerData", "containsRealRecipientData", "externalNetworkUsed", "secretsUsed",
        "cloudflareWritePerformed", "gitWritePerformedByWorkflow", "publicPublishPerformed",
        "customerSendPerformed", "outboundSendPerformed", "crmWritePerformed", "recipientHarvestPerformed",
        "mergePerformed", "releasePerformed", "productionActivationPerformed",
    )
    for key in expected_false_evidence:
        if evidence.get(key) is not False:
            fail(f"evidence boundary must remain false: {key}")
    if evidence.get("artifactRetentionDays") != 14:
        fail("P3-8 evidence retention must remain 14 days")

    return errors


def validate_repository(root: Path = ROOT, model: dict | None = None) -> list[str]:
    errors: list[str] = []
    fail = errors.append

    def read(relative: str) -> str:
        path = root / relative
        if not path.exists():
            fail(f"required P3-8 file is missing: {relative}")
            return ""
        return path.read_text(encoding="utf-8")

    model = model or load_matrix(root / "docs" / "operations" / "p3-agent-governance.json")
    doc = read("docs/operations/P3_AGENT_GOVERNANCE_ACCEPTANCE.md")
    p3_1_doc = read("docs/architecture/p3-1-auto-security-audit.md")
    sentinel_doc = read("docs/operations/KALE_SENTINEL.md")
    desk_doc = read("docs/operations/KALE_DESK.md")
    office_doc = read("docs/operations/KALES_OFFICE.md")
    outreach_doc = read("docs/operations/KALE_OUTREACH.md")
    guard_workflow = read(".github/workflows/auto-security-audit.yml")
    sentinel_workflow = read(".github/workflows/kale-sentinel.yml")
    desk_workflow = read(".github/workflows/kale-desk.yml")
    office_workflow = read(".github/workflows/kales-office.yml")
    outreach_workflow = read(".github/workflows/kale-outreach.yml")
    governance_workflow = read(".github/workflows/p3-agent-governance.yml")
    pr_checks = read(".github/workflows/pr-checks.yml")
    notifier = read(".github/workflows/notify-slack-on-failure.yml")
    wrangler = read("worker/wrangler.toml")

    for marker in (
        "# P3-8 Agent Governance Acceptance",
        "Mirror Kale → Kale Review → Kale Guard → Administrator approval → Release",
        "Mirror/Guard → Kale’s Office → Administrator approval → Publish → Kale Outreach → Administrator approval → Send",
        "Customer → Kale Desk → Administrator approval → Reply",
        "GitHub / Cloudflare / Stripe → Kale Sentinel → Administrator",
        "P3-8 does not activate production commerce",
        "Administrator explicit approval",
        "point-in-time acceptance",
    ):
        if marker not in doc: fail(f"P3-8 governance document missing marker: {marker}")

    if "- Status: complete" not in p3_1_doc: fail("P3-1 document must reflect the already-completed foundation")
    if "- Status: implementation candidate" in p3_1_doc: fail("P3-1 document still contains stale implementation-candidate status")

    for marker in ("hourly schedule remains **OFF**", "separate reviewed change", "P3-4 foundation is complete"):
        if marker not in sentinel_doc: fail(f"Sentinel governance reconciliation missing marker: {marker}")
    if "not considered fully active until" in sentinel_doc: fail("Sentinel document still implies hourly scheduling is required for P3-4 completion")

    if "Customer → Kale Desk → Administrator approval → Reply" not in desk_doc: fail("Kale Desk handoff is not preserved")
    if "Mirror/Guard → Kale’s Office → Administrator approval → Publish" not in office_doc: fail("Kale’s Office handoff is not preserved")
    if "Mirror/Guard → Kale’s Office → Administrator approval → Publish → Kale Outreach → Administrator approval → Send" not in outreach_doc: fail("Kale Outreach handoff is not preserved")
    if "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL" not in outreach_doc: fail("Kale Outreach P5-3 execution hold is missing")

    if not re.search(r'^PRODUCTION_COMMERCE_ENABLED\s*=\s*["\']false["\']\s*$', wrangler, re.MULTILINE):
        fail("production commerce must remain explicitly false in worker/wrangler.toml")

    for marker in ("schedule:", "cron: '0 0 * * *'", "contents: read"):
        if marker not in guard_workflow: fail(f"Kale Guard workflow missing read-only scheduled-audit marker: {marker}")
    for forbidden in ("contents: write", "pull-requests: write", "wrangler", "git push", "secrets."):
        if forbidden in guard_workflow: fail(f"Kale Guard workflow violates read-only boundary: {forbidden}")

    for marker in ("workflow_dispatch:", "contents: read", "actions: read", "CLOUDFLARE_SENTINEL_TOKEN"):
        if marker not in sentinel_workflow: fail(f"Kale Sentinel workflow missing marker: {marker}")
    for forbidden in ("schedule:", "cron:", "CLOUDFLARE_API_TOKEN", "contents: write", "actions: write", "pull-requests: write", "wrangler deploy", "git push"):
        if forbidden in sentinel_workflow: fail(f"Kale Sentinel workflow violates manual read-only boundary: {forbidden}")

    manual_workflows = {"Kale Desk": desk_workflow, "Kale’s Office": office_workflow, "Kale Outreach": outreach_workflow, "P3 Agent Governance": governance_workflow}
    for label, workflow in manual_workflows.items():
        for marker in ("workflow_dispatch:", "contents: read"):
            if marker not in workflow: fail(f"{label} workflow missing marker: {marker}")
        for forbidden in ("schedule:", "cron:", "contents: write", "pull-requests: write", "deployments: write", "CLOUDFLARE_API_TOKEN", "wrangler deploy", "git push", "gh pr merge"):
            if forbidden in workflow: fail(f"{label} workflow violates draft/evidence boundary: {forbidden}")

    for marker in (
        "name: P3 Agent Governance acceptance check", "cross-agent-governance-acceptance",
        "python scripts/validate_p3_governance.py", "python scripts/test_p3_governance.py",
        "python scripts/p3_governance_dry_run.py --output governance-report",
        "name: p3-agent-governance-acceptance-report", "retention-days: 14",
    ):
        if marker not in governance_workflow: fail(f"P3-8 workflow missing marker: {marker}")

    for marker in (
        "python scripts/validate_p3_governance.py", "python scripts/test_p3_governance.py",
        "python scripts/validate_p3_outreach.py", "python scripts/validate_p3_office.py",
        "python scripts/validate_p3_desk.py", "python scripts/validate_p3_sentinel.py",
        "python scripts/validate_p3_security.py",
    ):
        if marker not in pr_checks: fail(f"PR checks do not enforce full P3 governance stack: {marker}")

    if "- P3 Agent Governance acceptance check" not in notifier:
        fail("Slack failure notifier does not monitor P3 Agent Governance acceptance check")

    baseline = model.get("baseline", {})
    if baseline.get("fdeSiteMain") != "cac523901574910b07b21dff715a2a1589364a24": fail("P3-8 baseline must be pinned to the verified P3-7 fde-site main")
    if baseline.get("fdeImsMain") != "3923cd8da13cea10a62995143a933a4d068f8fcc": fail("P3-8 baseline must be pinned to the verified P3-3 fde-ims main")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--matrix", default=str(MATRIX_PATH), help="Path to the P3 governance matrix JSON")
    args = parser.parse_args()
    model = load_matrix(Path(args.matrix))
    errors = validate_model(model)
    if Path(args.matrix).resolve() == MATRIX_PATH.resolve():
        errors.extend(validate_repository(ROOT, model))
    if errors:
        print("P3-8 Agent Governance Acceptance validation failed:\n")
        for error in errors: print(f"- {error}")
        return 1
    print("P3-8 Agent Governance Acceptance validation passed.")
    print("Seven-agent authority separation, handoffs, escalation, and hard safety gates are consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
