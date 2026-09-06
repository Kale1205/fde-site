#!/usr/bin/env python3
from __future__ import annotations

import copy
import sys
from validate_agent_runtime import load, validate_model

def require_failure(label: str, candidate: dict, fragment: str) -> None:
    errors = validate_model(candidate)
    if not errors: raise AssertionError(f"{label}: expected failure, got success")
    if not any(fragment in error for error in errors): raise AssertionError(f"{label}: expected {fragment!r}; got {errors}")

def main() -> int:
    baseline = load()
    errors = validate_model(baseline)
    if errors:
        print("Baseline current-runtime model invalid:")
        for error in errors: print(f"- {error}")
        return 1
    candidate = copy.deepcopy(baseline); candidate["governance"]["runtimeIsNotGovernance"] = False
    require_failure("Runtime replaces governance", candidate, "Runtime must not replace Governance")
    candidate = copy.deepcopy(baseline); candidate["engineering"]["standaloneMirrorRuntimeRequired"] = True
    require_failure("Standalone Mirror restored", candidate, "Standalone Mirror runtime must not be required")
    candidate = copy.deepcopy(baseline); candidate["engineering"]["forbiddenAuthorities"].remove("merge")
    require_failure("Codex merge authority", candidate, "Codex forbidden-authority boundary is incomplete")
    candidate = copy.deepcopy(baseline); candidate["review"]["maySelfAcceptMateriallyAuthoredChange"] = True
    require_failure("Review self-accept", candidate, "material author must not self-ACCEPT final QA")
    candidate = copy.deepcopy(baseline); candidate["guard"]["current"]["automaticFix"] = True
    require_failure("Guard automatic fix", candidate, "current Guard property must remain OFF: automaticFix")
    candidate = copy.deepcopy(baseline); candidate["guard"]["target"]["immediateSlackEscalation"] = ["Critical", "High", "Medium"]
    require_failure("Guard alert fatigue regression", candidate, "Immediate Slack escalation must default to Critical / High")
    candidate = copy.deepcopy(baseline); candidate["guard"]["target"]["aiSemanticForbidden"].remove("production mutation")
    require_failure("Semantic Guard production mutation", candidate, "AI Semantic Guard forbidden-authority boundary is incomplete")
    candidate = copy.deepcopy(baseline); candidate["sentinel"]["hourlyScheduleEnabled"] = True
    require_failure("Sentinel schedule activation", candidate, "Sentinel hourly schedule must remain OFF")
    candidate = copy.deepcopy(baseline); candidate["businessAgents"]["Kale Outreach"]["autonomousBulkSend"] = True
    require_failure("Autonomous bulk sales", candidate, "Autonomous bulk sales send must remain prohibited")
    candidate = copy.deepcopy(baseline); candidate["businessAgents"]["Kale Compliance"]["foundationState"] = "COMPLETE"
    require_failure("Premature Compliance foundation", candidate, "Kale Compliance must remain P5 pending")
    candidate = copy.deepcopy(baseline); candidate["hardSafetyGates"]["livePayments"] = True
    require_failure("Live payments", candidate, "hard safety gate must remain OFF: livePayments")
    candidate = copy.deepcopy(baseline); candidate["unsupportedRuntimeWiring"]["aiSemanticGuardRuntime"] = True
    require_failure("Premature semantic Guard runtime", candidate, "unsupported runtime wiring must remain inactive: aiSemanticGuardRuntime")
    print("Current Agent Runtime deterministic negative tests passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
