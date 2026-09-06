#!/usr/bin/env python3
from __future__ import annotations

from sales_operations_rules import (
    assign_id,
    calculate_metrics,
    detect_duplicate_prospects,
    missing_send_gates,
    prospect_dedupe_key,
    validate_prospect,
    validate_transition,
)


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def complete_send_context() -> dict:
    return {
        "factsConfirmedPublished": True,
        "prospectSourceApproved": True,
        "countryComplianceApproved": True,
        "complianceEvidenceRef": "SYNTHETIC-COMP-001",
        "administratorApproval": True,
        "approvalScopeId": "SYNTHETIC-SCOPE-001",
        "approvedSenderChannel": "synthetic-approved-email",
        "noMaterialClaimChanged": True,
    }


def prospect(**updates) -> dict:
    value = {
        "Prospect ID": "PROS-000001",
        "Company": "Synthetic Example Co",
        "Country": "Exampleland",
        "Industry": "Synthetic logistics",
        "Website": "https://example.invalid",
        "Company size signal": "synthetic",
        "Fit Score": 80,
        "Fit rationale": "Synthetic fit rationale only",
        "Source URL": "https://source.example.invalid/company",
        "Source system": "synthetic_test",
        "Source checked date": "2026-09-06",
        "Evidence": "Synthetic evidence only",
        "Confidence": "HIGH_SYNTHETIC",
        "Contact route": "synthetic business route",
        "Contact person": "",
        "Business email": "",
        "Current status": "RESEARCHED",
        "Campaign ID": "CAMP-000001",
        "Last contact": "",
        "Next follow-up": "",
        "Reply status": "",
        "Meeting status": "",
        "Conversion status": "",
        "Notes": "SYNTHETIC TEST DATA ONLY",
    }
    value.update(updates)
    return value


def main() -> int:
    expect(assign_id("prospect", 7) == "PROS-000007", "prospect ID assignment failed")
    expect(assign_id("activity", 12) == "ACT-000012", "activity ID assignment failed")
    expect(assign_id("campaign", 2) == "CAMP-000002", "campaign ID assignment failed")
    try:
        assign_id("prospect", 0)
    except ValueError:
        pass
    else:
        raise AssertionError("non-positive ID sequence must fail")

    key = prospect_dedupe_key("Synthetic Example Co", "HTTPS://WWW.Example.INVALID/path")
    expect(key == "domain:example.invalid", "website duplicate key normalization failed")
    fallback = prospect_dedupe_key(" Synthetic   Example, Co. ", "")
    expect(fallback == "company:synthetic example co", "company duplicate fallback normalization failed")

    duplicates = detect_duplicate_prospects([
        prospect(**{"Prospect ID": "PROS-000001", "Website": "https://example.invalid/a"}),
        prospect(**{"Prospect ID": "PROS-000002", "Website": "https://www.example.invalid/b"}),
    ])
    expect(len(duplicates) == 1 and duplicates[0][2] == "domain:example.invalid", "same-domain duplicate was not detected")

    expect(validate_prospect(prospect()) == [], "valid synthetic prospect should pass")
    invalid = prospect(**{"Source URL": "", "Fit Score": 101})
    errors = validate_prospect(invalid)
    expect(any("Source URL" in error for error in errors), "missing source provenance must fail")
    expect(any("Fit Score" in error for error in errors), "out-of-range Fit Score must fail")
    sensitive = prospect(**{"personal phone": "+00-0000-0000"})
    expect(any("sensitive personal-data" in error for error in validate_prospect(sensitive)), "sensitive personal-data field must fail")

    expect(validate_transition("RESEARCHED", "QUALIFIED", {}) == [], "normal research qualification transition failed")
    expect(validate_transition("RESEARCHED", "SENT", {}), "invalid state jump must fail")
    admin_errors = validate_transition("QUALIFIED", "ADMIN_APPROVED", {})
    expect(any("explicit Administrator approval" in error for error in admin_errors), "Administrator approval must protect ADMIN_APPROVED")
    expect(any("approvalScopeId" in error for error in admin_errors), "bounded approvalScopeId must protect ADMIN_APPROVED")
    expect(validate_transition("QUALIFIED", "ADMIN_APPROVED", {"administratorApproval": True, "approvalScopeId": "SYNTHETIC-SCOPE"}) == [], "bounded Administrator approval should permit ADMIN_APPROVED")

    missing = complete_send_context()
    missing["countryComplianceApproved"] = False
    ready_errors = validate_transition("ADMIN_APPROVED", "READY_FOR_OUTREACH", missing)
    expect(any("countryComplianceApproved" in error for error in ready_errors), "missing compliance gate must block READY_FOR_OUTREACH")

    changed = complete_send_context()
    changed["noMaterialClaimChanged"] = False
    send_errors = validate_transition("READY_FOR_OUTREACH", "SENT", changed)
    expect(any("noMaterialClaimChanged" in error for error in send_errors), "material claim change must block SENT")
    expect(validate_transition("READY_FOR_OUTREACH", "SENT", complete_send_context()) == [], "complete bounded send gates should permit SENT transition")

    gate_context = complete_send_context()
    gate_context.pop("administratorApproval")
    expect("administratorApproval" in missing_send_gates(gate_context), "missing Administrator gate not detected")

    prospects = [
        prospect(**{"Prospect ID": "PROS-000001", "Current status": "WON"}),
        prospect(**{"Prospect ID": "PROS-000002", "Company": "Synthetic Two", "Website": "https://two.invalid", "Current status": "LOST"}),
        prospect(**{"Prospect ID": "PROS-000003", "Company": "Synthetic Three", "Website": "https://three.invalid", "Current status": "QUALIFIED"}),
    ]
    activities = [
        {"Action": "send", "Reply category": ""},
        {"Action": "send", "Reply category": ""},
        {"Action": "reply_received", "Reply category": "positive"},
        {"Action": "meeting_booked", "Reply category": ""},
    ]
    metrics = calculate_metrics(prospects, activities)
    expect(metrics["researched prospects"] == 3, "researched prospect KPI failed")
    expect(metrics["approved prospects"] == 2, "approved prospect KPI failed")
    expect(metrics["messages sent"] == 2, "messages sent KPI failed")
    expect(metrics["replies"] == 1 and metrics["positive replies"] == 1, "reply KPI failed")
    expect(metrics["meetings"] == 1 and metrics["wins"] == 1 and metrics["losses"] == 1, "funnel outcome KPI failed")
    expect(metrics["reply rate"] == 0.5 and metrics["conversion rate"] == 0.5, "rate KPI failed")
    zero = calculate_metrics([], [])
    expect(zero["reply rate"] == 0.0 and zero["conversion rate"] == 0.0, "zero-denominator KPI must be safe")

    print("Sales Operations deterministic rule tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
