#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from sales_storage_policy import LOCAL_STORE, BOOTSTRAP_TEMPLATE, validate_local_workspace

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "docs" / "operations" / "agent-runtime-governance.json"
HISTORICAL_PATH = ROOT / "docs" / "operations" / "p3-agent-governance.json"
CURRENT_DOC = ROOT / "docs" / "operations" / "AGENT_RUNTIME_OPERATING_MODEL.md"
SALES_MODEL = ROOT / "docs" / "operations" / "sales-operations-governance.json"

HARD_GATES = {
    "livePayments", "productionFulfillment", "realInstallerCustomerDistribution",
    "automaticCustomerFulfillmentMail", "agentAutoMerge", "agentAutoRelease",
    "unapprovedPublicPosting", "unapprovedInboundCustomerSend", "unapprovedOutboundCustomerSend",
    "autonomousBulkSalesSend", "unapprovedCrmMutation", "automaticRemediationWithProductionMutation",
}
ADMIN_GATES = {
    "material product scope", "material architecture", "pricing / commercial policy", "merge", "release",
    "production deployment / activation", "customer installer distribution", "public publish",
    "inbound customer send", "outbound sales send", "live payments", "production fulfillment",
}
OUTREACH_GATES = [
    "factsConfirmedPublished", "prospectSourceApproved", "countryComplianceApproved",
    "complianceEvidenceRef", "administratorApproval", "approvalScopeId", "approved sender/channel",
    "noMaterialClaimChanged",
]
CODEX_PROFILES = {"Codex / Mirror Engineering Mode", "Codex / Kale Outreach Sales Mode"}
WORK_TARGET_ROLES = {"Kale Desk", "Kale’s Office", "Kale Compliance"}


def load(path: Path = MODEL_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_model(model: dict) -> list[str]:
    errors: list[str] = []
    fail = errors.append
    if model.get("schemaVersion") != 2:
        fail("schemaVersion must be 2")
    if model.get("status") != "CURRENT_TARGET_OPERATING_MODEL":
        fail("status must be CURRENT_TARGET_OPERATING_MODEL")
    governance = model.get("governance", {})
    if governance.get("sourceOfTruth") != "GitHub":
        fail("GitHub must remain Agent Governance Source of Truth")
    if governance.get("runtimeIsNotGovernance") is not True:
        fail("Runtime must not replace Governance")
    if governance.get("historicalP3EvidencePreserved") is not True:
        fail("historical P3 acceptance evidence must be preserved")
    if governance.get("historicalP3Matrix") != "docs/operations/p3-agent-governance.json":
        fail("historical P3 matrix reference changed")
    planes = model.get("runtimePlanes", {})
    if set(planes.get("codexProfiles", [])) != CODEX_PROFILES:
        fail("Codex runtime profiles must keep Engineering and Kale Outreach Sales Modes separated")
    if set(planes.get("workTargetRoles", [])) != WORK_TARGET_ROLES:
        fail("Work target roles must remain Desk / Office / Compliance only")
    if planes.get("salesData") != LOCAL_STORE + " — TARGET_PENDING_RUNTIME_CONNECTION":
        fail("Sales data plane must remain the pending local MacBook target")
    if planes.get("finalAuthority") != "Administrator Kale":
        fail("Administrator Kale must remain final authority")
    engineering = model.get("engineering", {})
    if engineering.get("runtime") != "Codex":
        fail("Codex must own engineering runtime")
    if engineering.get("mode") != "Codex / Mirror Engineering Mode":
        fail("Mirror engineering semantics must be represented inside Codex")
    if engineering.get("standaloneMirrorRuntimeRequired") is not False:
        fail("Standalone Mirror runtime must not be required")
    if engineering.get("initialImsV1BuildOwner") != "Codex":
        fail("Initial IMS v1.0 build owner must remain Codex")
    required_responsibilities = {
        "feature implementation", "bug fix", "tests", "DB migration", "dependencies", "UI",
        "product-source changes", "documentation", "non-main branch implementation",
    }
    if not required_responsibilities.issubset(set(engineering.get("inheritedMirrorResponsibilities", []))):
        fail("Codex did not inherit the complete Mirror engineering responsibility set")
    expected_flow = ["Administrator", "Codex Engineering", "independent checks", "Kale Review", "Kale Guard", "Codex summary", "Administrator"]
    if engineering.get("postV1Flow") != expected_flow:
        fail("post-v1 engineering handoff is not the approved simplified flow")
    if engineering.get("salesSendAuthority") is not False:
        fail("Codex Engineering Mode must not receive sales-send authority")
    forbidden = set(engineering.get("forbiddenAuthorities", []))
    if not {"self-approval", "final QA ACCEPT", "final security ACCEPT", "merge", "release", "production activation", "customer distribution", "outbound sales send"}.issubset(forbidden):
        fail("Codex Engineering forbidden-authority boundary is incomplete")
    sales = model.get("outreachSales", {})
    if sales.get("role") != "Kale Outreach":
        fail("Kale Outreach role identity must be preserved")
    if sales.get("runtime") != "Codex":
        fail("Kale Outreach execution runtime must be Codex")
    if sales.get("mode") != "Codex / Kale Outreach Sales Mode":
        fail("Kale Outreach must use the dedicated Codex Sales Mode")
    if sales.get("roleIsRuntime") is not False:
        fail("Kale Outreach Role must remain distinct from Codex runtime")
    for key in ("githubImplementationAuthority", "productSourceMutationAuthority", "mergeAuthority", "releaseAuthority", "publicPublishAuthority", "selfApprovalAuthority"):
        if sales.get(key) is not False:
            fail(f"Codex Kale Outreach Sales Mode forbidden authority must remain false: {key}")
    if sales.get("targetDataLayer") != LOCAL_STORE:
        fail("Kale Outreach target Sales data layer changed")
    if sales.get("persistentDataConnectionState") != "TARGET_PENDING_RUNTIME_CONNECTION":
        fail("Kale Outreach persistent-data connection must remain target/pending")
    if sales.get("salesOperationsModel") != "docs/operations/sales-operations-governance.json":
        fail("Sales Operations model reference changed")
    modes = sales.get("executionModes", {})
    if modes.get("oneShot") != "ADMINISTRATOR_DIRECTED":
        fail("Kale Outreach one-shot mode must remain Administrator-directed")
    for key in ("scheduled", "eventDriven"):
        if modes.get(key) != "TARGET_ONLY_NOT_ACTIVE":
            fail(f"Kale Outreach execution mode must remain inactive target: {key}")
    errors.extend(validate_local_workspace(model.get("localWorkspaceSetup")))
    review = model.get("review", {})
    if review.get("role") != "Kale Review":
        fail("Kale Review role missing")
    if review.get("runtimeBoundary") != "independent execution/context":
        fail("Kale Review must remain an independent execution/context")
    if review.get("maySelfAcceptMateriallyAuthoredChange") is not False:
        fail("material author must not self-ACCEPT final QA")
    if review.get("futurePrTriggeredExecution") != "TARGET_ONLY_NOT_ACTIVE":
        fail("PR-triggered Review must remain target-only in this change")
    guard = model.get("guard", {})
    current = guard.get("current", {})
    if current.get("workflow") != ".github/workflows/auto-security-audit.yml":
        fail("current Guard deterministic workflow changed")
    if current.get("scheduleDescription") != "daily GitHub Actions scheduled audit":
        fail("Guard schedule must be described without exact-time guarantee")
    if current.get("exactStartTimeGuaranteed") is not False:
        fail("GitHub schedule must not claim exact-time execution")
    for key in ("readOnly", "criticalFindingGate", "slackFailureNotification"):
        if current.get(key) is not True:
            fail(f"current Guard property must remain enabled: {key}")
    for key in ("automaticFix", "automaticPr", "autoMerge", "productionWrite"):
        if current.get(key) is not False:
            fail(f"current Guard property must remain OFF: {key}")
    target = guard.get("target", {})
    if target.get("activationState") != "TARGET_ONLY_NOT_ACTIVE":
        fail("AI semantic Guard layer must remain target-only")
    if target.get("flow") != ["Deterministic Security Scan", "AI Semantic Guard Review", "Severity Classification", "Escalation"]:
        fail("Guard target flow mismatch")
    if target.get("severityLevels") != ["Critical", "High", "Medium", "Low", "Informational"]:
        fail("Guard severity taxonomy mismatch")
    if target.get("immediateSlackEscalation") != ["Critical", "High"]:
        fail("Immediate Slack escalation must default to Critical / High")
    if "no per-finding Slack alert by default" not in target.get("lowerSeverityDisposition", ""):
        fail("Medium-and-below alert-fatigue policy missing")
    if not {"automatic remediation", "production mutation", "self-approval", "merge", "release", "production activation"}.issubset(set(target.get("aiSemanticForbidden", []))):
        fail("AI Semantic Guard forbidden-authority boundary is incomplete")
    sentinel = model.get("sentinel", {})
    if sentinel.get("role") != "read-only Operations Monitor":
        fail("Sentinel role must remain read-only Operations Monitor")
    if sentinel.get("hourlyScheduleEnabled") is not False:
        fail("Sentinel hourly schedule must remain OFF")
    if sentinel.get("stateMutation") is not False:
        fail("Sentinel state mutation must remain prohibited")
    if sentinel.get("automaticRemediation") is not False:
        fail("Sentinel automatic remediation must remain prohibited")
    if sentinel.get("scheduleActivationRequiresAdministratorApproval") is not True:
        fail("Sentinel schedule activation must remain an Administrator gate")
    business = model.get("businessAgents", {})
    outreach = business.get("Kale Outreach", {})
    if outreach.get("targetRuntime") != "Codex":
        fail("Kale Outreach target runtime must be Codex")
    if outreach.get("runtimeMode") != "Codex / Kale Outreach Sales Mode":
        fail("Kale Outreach runtime mode separation is missing")
    if outreach.get("rolePreserved") is not True:
        fail("Kale Outreach Role must be preserved")
    if outreach.get("scheduledExecutionActive") is not False or outreach.get("eventDrivenExecutionActive") is not False:
        fail("Kale Outreach schedule/event execution must remain inactive")
    if outreach.get("persistentDataConnectionState") != "TARGET_PENDING_RUNTIME_CONNECTION":
        fail("Kale Outreach persistent data connection must remain pending")
    if outreach.get("realSendGates") != OUTREACH_GATES:
        fail("Kale Outreach real-send gate set changed")
    if outreach.get("autonomousBulkSend") is not False:
        fail("Autonomous bulk sales send must remain prohibited")
    if outreach.get("unrestrictedCrmMutation") is not False:
        fail("Unrestricted CRM mutation must remain prohibited")
    for name in ("Kale Desk", "Kale’s Office", "Kale Compliance"):
        if business.get(name, {}).get("targetRuntime") != "ChatGPT Work":
            fail(f"{name} target runtime must remain ChatGPT Work")
        if business.get(name, {}).get("runtimeWiringState") != "TARGET_ONLY_NOT_ACTIVE":
            fail(f"{name} runtime wiring must remain target-only")
    if business.get("Kale Desk", {}).get("unapprovedCustomerSend") is not False:
        fail("Kale Desk unapproved send must remain prohibited")
    if business.get("Kale’s Office", {}).get("publicPublishAuthority") is not False:
        fail("Kale’s Office must not receive publish authority")
    compliance = business.get("Kale Compliance", {})
    if compliance.get("foundationState") != "P5_PENDING":
        fail("Kale Compliance must remain P5 pending")
    if compliance.get("newLegalAutomationAuthority") is not False:
        fail("Kale Compliance must not gain unbuilt legal automation authority")
    data = model.get("salesDataBoundary", {})
    for key in ("realProspectDataInGitHub", "realProspectDataInActionsArtifacts", "realProspectDataInPublicSlack", "realProspectDataInSyntheticTests", "targetExternalStoreConnected", "sensitivePersonalData"):
        if data.get(key) is not False:
            fail(f"Sales data boundary must remain false: {key}")
    if data.get("targetExternalStore") != LOCAL_STORE:
        fail("Sales data external-store target changed")
    if data.get("sourceProvenanceRequired") is not True:
        fail("real prospect source provenance must be required")
    if data.get("minimumNecessaryBusinessPurposeData") is not True:
        fail("minimum-necessary business-purpose data boundary must be enabled")
    deterministic_sales = model.get("deterministicSalesOperations", {})
    if deterministic_sales.get("model") != "docs/operations/sales-operations-governance.json":
        fail("deterministic Sales Operations model reference changed")
    required_sales_responsibilities = {"schema validation", "ID assignment", "duplicate detection", "status validation", "approval-protected transition validation", "activity history integrity", "KPI calculation", "dashboard aggregation", "data-quality checks"}
    if not required_sales_responsibilities.issubset(set(deterministic_sales.get("responsibilities", []))):
        fail("deterministic Sales Operations responsibility set is incomplete")
    if deterministic_sales.get("llmMayOverrideApprovalState") is not False:
        fail("LLM must not override Sales Operations approval state")
    if model.get("deterministicExecutionPlane", {}).get("aiFreeBusinessStateMutation") is not False:
        fail("AI Agents must not freely mutate deterministic business state")
    administrator = model.get("administrator", {})
    if administrator.get("finalAuthority") is not True:
        fail("Administrator final authority must remain true")
    if set(administrator.get("explicitApprovalGates", [])) != ADMIN_GATES:
        fail("Administrator explicit-approval gate set changed")
    hard = model.get("hardSafetyGates", {})
    if set(hard) != HARD_GATES:
        fail("hard-safety gate set is incomplete")
    for gate, state in hard.items():
        if state is not False:
            fail(f"hard safety gate must remain OFF: {gate}")
    wiring = model.get("unsupportedRuntimeWiring", {})
    if not wiring:
        fail("unsupported runtime-wiring boundary is missing")
    for integration, enabled in wiring.items():
        if enabled is not False:
            fail(f"unsupported runtime wiring must remain inactive: {integration}")
    return errors


def validate_repository(root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    fail = errors.append
    historical_path = root / "docs/operations/p3-agent-governance.json"
    sales_model_path = root / "docs/operations/sales-operations-governance.json"
    current_doc_path = root / "docs/operations/AGENT_RUNTIME_OPERATING_MODEL.md"
    if not historical_path.is_file():
        fail("historical P3 matrix is missing")
    else:
        historical = json.loads(historical_path.read_text(encoding="utf-8"))
        if historical.get("phase") != "P3-8":
            fail("historical P3 matrix phase changed")
        if historical.get("baseline", {}).get("fdeSiteMain") != "cac523901574910b07b21dff715a2a1589364a24":
            fail("historical P3 fde-site baseline changed")
        if historical.get("baseline", {}).get("fdeImsMain") != "3923cd8da13cea10a62995143a933a4d068f8fcc":
            fail("historical P3 fde-ims baseline changed")
    if not sales_model_path.is_file():
        fail("current Sales Operations machine-readable governance is missing")
    if not (root / BOOTSTRAP_TEMPLATE).is_file():
        fail("local Sales Mode bootstrap template is missing")
    if not current_doc_path.is_file():
        fail("current Agent Runtime Operating Model document is missing")
    else:
        doc = current_doc_path.read_text(encoding="utf-8")
        markers = (
            "Runtime ≠ Governance", "Codex / Mirror Engineering Mode", "Codex / Kale Outreach Sales Mode",
            "Kale Outreach Role ≠ Codex itself", "material author and the final QA `ACCEPT` execution/context",
            "daily GitHub Actions scheduled audit",
            "Deterministic Security Scan → AI Semantic Guard Review → Severity Classification → Escalation",
            "Critical` / `High", "hourly schedule: **OFF**", "Target runtime: **Codex / Kale Outreach Sales Mode**",
            "Target runtime: Work", "P5 is still pending", "Sales Operations", LOCAL_STORE,
            "Automatic remediation with production mutation", "TARGET / PENDING LOCAL WORKSPACE SETUP",
        )
        for marker in markers:
            if marker not in doc:
                fail(f"current runtime document missing marker: {marker}")
    guard_workflow = root / ".github/workflows/auto-security-audit.yml"
    if not guard_workflow.is_file():
        fail("Auto Security workflow is missing")
    else:
        text = guard_workflow.read_text(encoding="utf-8")
        for marker in ("schedule:", "cron: '0 0 * * *'", "contents: read", "Enforce critical finding gate"):
            if marker not in text:
                fail(f"current Guard workflow marker missing: {marker}")
        for forbidden in ("contents: write", "pull-requests: write", "git push", "wrangler deploy"):
            if forbidden in text:
                fail(f"current Guard workflow must remain read-only: {forbidden}")
    sentinel_workflow = root / ".github/workflows/kale-sentinel.yml"
    if not sentinel_workflow.is_file():
        fail("Kale Sentinel workflow is missing")
    else:
        text = sentinel_workflow.read_text(encoding="utf-8")
        if "workflow_dispatch:" not in text:
            fail("Sentinel manual execution marker missing")
        if "schedule:" in text or "cron:" in text:
            fail("Sentinel schedule must not be activated by this change")
        for marker in ("contents: read", "actions: read"):
            if marker not in text:
                fail(f"Sentinel read-only marker missing: {marker}")
    return errors


def main() -> int:
    errors = validate_model(load())
    errors.extend(validate_repository())
    if errors:
        print("Current Agent Runtime Governance validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Current Agent Runtime Governance validation passed.")
    print("Governed Engineering/Sales separation and pending local setup contract verified; no MacBook runtime isolation is claimed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
