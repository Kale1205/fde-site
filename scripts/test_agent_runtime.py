#!/usr/bin/env python3
from __future__ import annotations

import copy
import sys
from validate_agent_runtime import load, validate_model


def require_failure(label: str, candidate: dict, fragment: str) -> None:
    errors = validate_model(candidate)
    if not errors:
        raise AssertionError(f"{label}: expected failure, got success")
    if not any(fragment in error for error in errors):
        raise AssertionError(f"{label}: expected {fragment!r}; got {errors}")


def main() -> int:
    baseline = load()
    errors = validate_model(baseline)
    if errors:
        print("Baseline current-runtime model invalid:")
        for error in errors:
            print(f"- {error}")
        return 1

    candidate = copy.deepcopy(baseline)
    candidate["governance"]["runtimeIsNotGovernance"] = False
    require_failure("Runtime replaces governance", candidate, "Runtime must not replace Governance")

    candidate = copy.deepcopy(baseline)
    candidate["runtimePlanes"]["codexProfiles"].remove("Codex / Kale Outreach Sales Mode")
    require_failure("Sales profile removed", candidate, "Codex runtime profiles must keep Engineering and Kale Outreach Sales Modes separated")

    candidate = copy.deepcopy(baseline)
    candidate["runtimePlanes"]["workTargetRoles"].append("Kale Outreach")
    require_failure("Outreach restored to Work target", candidate, "Work target roles must remain Desk / Office / Compliance only")

    candidate = copy.deepcopy(baseline)
    candidate["engineering"]["standaloneMirrorRuntimeRequired"] = True
    require_failure("Standalone Mirror restored", candidate, "Standalone Mirror runtime must not be required")

    candidate = copy.deepcopy(baseline)
    candidate["engineering"]["salesSendAuthority"] = True
    require_failure("Engineering gains sales send", candidate, "Codex Engineering Mode must not receive sales-send authority")

    candidate = copy.deepcopy(baseline)
    candidate["engineering"]["forbiddenAuthorities"].remove("merge")
    require_failure("Codex engineering merge authority", candidate, "Codex Engineering forbidden-authority boundary is incomplete")

    candidate = copy.deepcopy(baseline)
    candidate["outreachSales"]["runtime"] = "ChatGPT Work"
    require_failure("Outreach runtime regresses to Work", candidate, "Kale Outreach execution runtime must be Codex")

    candidate = copy.deepcopy(baseline)
    candidate["outreachSales"]["roleIsRuntime"] = True
    require_failure("Kale Outreach role absorbed by Codex", candidate, "Kale Outreach Role must remain distinct from Codex runtime")

    candidate = copy.deepcopy(baseline)
    candidate["outreachSales"]["githubImplementationAuthority"] = True
    require_failure("Sales mode gains GitHub implementation", candidate, "Codex Kale Outreach Sales Mode forbidden authority must remain false: githubImplementationAuthority")

    candidate = copy.deepcopy(baseline)
    candidate["outreachSales"]["persistentDataConnectionState"] = "IMPLEMENTED"
    require_failure("Unverified Sales data connection claimed", candidate, "Kale Outreach persistent-data connection must remain target/pending")

    candidate = copy.deepcopy(baseline)
    candidate["review"]["maySelfAcceptMateriallyAuthoredChange"] = True
    require_failure("Review self-accept", candidate, "material author must not self-ACCEPT final QA")

    candidate = copy.deepcopy(baseline)
    candidate["guard"]["current"]["automaticFix"] = True
    require_failure("Guard automatic fix", candidate, "current Guard property must remain OFF: automaticFix")

    candidate = copy.deepcopy(baseline)
    candidate["guard"]["target"]["immediateSlackEscalation"] = ["Critical", "High", "Medium"]
    require_failure("Guard alert fatigue regression", candidate, "Immediate Slack escalation must default to Critical / High")

    candidate = copy.deepcopy(baseline)
    candidate["guard"]["target"]["aiSemanticForbidden"].remove("production mutation")
    require_failure("Semantic Guard production mutation", candidate, "AI Semantic Guard forbidden-authority boundary is incomplete")

    candidate = copy.deepcopy(baseline)
    candidate["sentinel"]["hourlyScheduleEnabled"] = True
    require_failure("Sentinel schedule activation", candidate, "Sentinel hourly schedule must remain OFF")

    candidate = copy.deepcopy(baseline)
    candidate["businessAgents"]["Kale Outreach"]["targetRuntime"] = "ChatGPT Work"
    require_failure("Business model regresses Outreach to Work", candidate, "Kale Outreach target runtime must be Codex")

    candidate = copy.deepcopy(baseline)
    candidate["businessAgents"]["Kale Outreach"]["scheduledExecutionActive"] = True
    require_failure("Premature scheduled Outreach", candidate, "Kale Outreach schedule/event execution must remain inactive")

    candidate = copy.deepcopy(baseline)
    candidate["businessAgents"]["Kale Outreach"]["autonomousBulkSend"] = True
    require_failure("Autonomous bulk sales", candidate, "Autonomous bulk sales send must remain prohibited")

    candidate = copy.deepcopy(baseline)
    candidate["businessAgents"]["Kale Outreach"]["unrestrictedCrmMutation"] = True
    require_failure("Unrestricted CRM mutation", candidate, "Unrestricted CRM mutation must remain prohibited")

    candidate = copy.deepcopy(baseline)
    candidate["businessAgents"]["Kale Compliance"]["foundationState"] = "COMPLETE"
    require_failure("Premature Compliance foundation", candidate, "Kale Compliance must remain P5 pending")

    candidate = copy.deepcopy(baseline)
    candidate["salesDataBoundary"]["realProspectDataInGitHub"] = True
    require_failure("Real prospect data enters GitHub", candidate, "Sales data boundary must remain false: realProspectDataInGitHub")

    candidate = copy.deepcopy(baseline)
    candidate["salesDataBoundary"]["targetExternalStoreConnected"] = True
    require_failure("Unverified external store marked connected", candidate, "Sales data boundary must remain false: targetExternalStoreConnected")

    candidate = copy.deepcopy(baseline)
    candidate["deterministicSalesOperations"]["llmMayOverrideApprovalState"] = True
    require_failure("LLM mutates approval state", candidate, "LLM must not override Sales Operations approval state")

    candidate = copy.deepcopy(baseline)
    candidate["hardSafetyGates"]["livePayments"] = True
    require_failure("Live payments", candidate, "hard safety gate must remain OFF: livePayments")

    candidate = copy.deepcopy(baseline)
    candidate["hardSafetyGates"]["unapprovedCrmMutation"] = True
    require_failure("Unapproved CRM hard gate", candidate, "hard safety gate must remain OFF: unapprovedCrmMutation")

    candidate = copy.deepcopy(baseline)
    candidate["unsupportedRuntimeWiring"]["codexSalesSchedules"] = True
    require_failure("Premature Codex Sales schedule", candidate, "unsupported runtime wiring must remain inactive: codexSalesSchedules")

    candidate = copy.deepcopy(baseline)
    candidate["unsupportedRuntimeWiring"]["googleDriveSalesDataConnection"] = True
    require_failure("Premature Google Drive Sales connection", candidate, "unsupported runtime wiring must remain inactive: googleDriveSalesDataConnection")

    print("Current Agent Runtime deterministic negative tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
