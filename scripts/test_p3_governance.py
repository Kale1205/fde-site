#!/usr/bin/env python3
from __future__ import annotations

import copy
import sys

from validate_p3_governance import load_matrix, validate_model


def mutate_agent(model: dict, name: str, capability: str, value: bool) -> dict:
    candidate = copy.deepcopy(model)
    for agent in candidate["agents"]:
        if agent["name"] == name:
            agent["capabilities"][capability] = value
            return candidate
    raise KeyError(name)


def require_failure(label: str, candidate: dict, expected_fragment: str) -> None:
    errors = validate_model(candidate)
    if not errors:
        raise AssertionError(f"{label}: expected governance failure, got success")
    if not any(expected_fragment in error for error in errors):
        raise AssertionError(f"{label}: expected error containing {expected_fragment!r}; got {errors}")


def main() -> int:
    baseline = load_matrix()
    baseline_errors = validate_model(baseline)
    if baseline_errors:
        print("Baseline governance model is invalid:")
        for error in baseline_errors: print(f"- {error}")
        return 1

    require_failure("Mirror self-QA", mutate_agent(baseline, "Mirror Kale", "qaVerdict", True), "cannot implement and issue final QA verdicts")

    candidate = copy.deepcopy(baseline)
    for agent in candidate["agents"]:
        if agent["name"] == "Kale Review": agent["maySelfAcceptMateriallyAuthoredChange"] = True
    require_failure("Review self-accept", candidate, "must not self-ACCEPT a materially authored change")

    require_failure("Sentinel mutation", mutate_agent(baseline, "Kale Sentinel", "operationalMutation", True), "cannot both observe and mutate operations")
    require_failure("Desk self-send", mutate_agent(baseline, "Kale Desk", "customerSend", True), "cannot draft inbound support and self-send it")
    require_failure("Office self-publish", mutate_agent(baseline, "Kale’s Office", "publicPublish", True), "cannot draft public editorial and self-publish it")
    require_failure("Outreach self-send", mutate_agent(baseline, "Kale Outreach", "outboundSend", True), "cannot draft outbound growth and self-send it")
    require_failure("Outreach recipient harvesting", mutate_agent(baseline, "Kale Outreach", "recipientHarvest", True), "Kale Outreach must not hold recipientHarvest")
    require_failure("Guard merge authority", mutate_agent(baseline, "Kale Guard", "merge", True), "must not hold merge authority")

    candidate = copy.deepcopy(baseline)
    candidate["hardSafetyGates"]["livePayments"] = True
    require_failure("Live payment gate", candidate, "hard safety gate must remain OFF: livePayments")

    candidate = copy.deepcopy(baseline)
    candidate["handoffs"]["productRelease"] = ["Mirror Kale", "Kale Guard", "Kale Review", "Administrator approval", "Release"]
    require_failure("Product handoff reordering", candidate, "cross-agent handoff graph does not match")

    print("P3-8 deterministic Agent Governance rule tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
