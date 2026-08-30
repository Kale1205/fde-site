#!/usr/bin/env python3
from copy import deepcopy

from kale_outreach_sales_rules import evaluate_sales_execution, validate_sales_execution_packet


def source(**overrides):
    value = {
        "channel": "email",
        "factsConfirmedPublished": True,
        "containsUnsupportedClaim": False,
        "prospectSourceType": "public_company_website",
        "prospectSourceApproved": True,
        "businessPurposeConfirmed": True,
        "containsSensitivePersonalData": False,
        "bulkScrapingPerformed": False,
        "commercialLaunchReady": False,
        "ctaIntent": "discovery_call",
        "countryComplianceApproved": False,
        "complianceEvidenceRef": "",
        "administratorApproval": False,
        "approvalScopeId": "",
        "senderApproved": False,
        "autonomousBulkSend": False,
        "reuseCloudflareBrevoCustomerPath": False,
        "crmWriteRequested": False,
        "companyName": "Synthetic Warehouse Co.",
        "country": "SG",
        "sourceRef": "https://example.invalid/synthetic-business",
    }
    value.update(overrides)
    return value


blocked = evaluate_sales_execution(source())
assert blocked["execution"]["state"] == "SALES_EXECUTION_BLOCKED"
assert blocked["execution"]["authorized"] is False
assert set(blocked["execution"]["missingGates"]) == {
    "countryComplianceApproved",
    "complianceEvidenceRef",
    "administratorApproval",
    "approvalScopeId",
    "senderApproved",
}
assert validate_sales_execution_packet(blocked) is True

approved = evaluate_sales_execution(source(
    countryComplianceApproved=True,
    complianceEvidenceRef="synthetic-compliance-evidence-001",
    administratorApproval=True,
    approvalScopeId="synthetic-single-message-001",
    senderApproved=True,
))
assert approved["execution"]["state"] == "APPROVED_FOR_BOUNDED_SALES_EXECUTION"
assert approved["execution"]["authorized"] is True
assert approved["execution"]["missingGates"] == []
assert approved["execution"]["autonomousBulkSend"] is False
assert approved["execution"]["cloudflareBrevoCustomerPathReused"] is False
assert validate_sales_execution_packet(approved) is True

for bad, expected in (
    ({"factsConfirmedPublished": False}, "SALES_REQUIRES_CONFIRMED_PUBLISHED_FACTS"),
    ({"containsUnsupportedClaim": True}, "UNSUPPORTED_SALES_CLAIM_BLOCKED"),
    ({"prospectSourceType": "purchased_list"}, "UNAPPROVED_PROSPECT_SOURCE_BLOCKED"),
    ({"prospectSourceApproved": False}, "PROSPECT_SOURCE_APPROVAL_REQUIRED"),
    ({"businessPurposeConfirmed": False}, "B2B_BUSINESS_PURPOSE_REQUIRED"),
    ({"containsSensitivePersonalData": True}, "SENSITIVE_PROSPECT_DATA_BLOCKED"),
    ({"bulkScrapingPerformed": True}, "BULK_SCRAPING_BLOCKED"),
    ({"commercialLaunchReady": False, "ctaIntent": "buy_now"}, "PRE_RELEASE_TRANSACTIONAL_CTA_BLOCKED"),
    ({"autonomousBulkSend": True}, "AUTONOMOUS_BULK_SEND_BLOCKED"),
    ({"reuseCloudflareBrevoCustomerPath": True}, "CUSTOMER_EMAIL_PATH_REPURPOSE_BLOCKED"),
    ({"crmWriteRequested": True}, "CRM_WRITE_NOT_YET_APPROVED"),
):
    try:
        evaluate_sales_execution(source(**bad))
        raise AssertionError(f"expected {expected}")
    except ValueError as exc:
        assert expected in str(exc), str(exc)

tampered = deepcopy(approved)
tampered["approval"]["administratorApproval"] = False
try:
    validate_sales_execution_packet(tampered)
    raise AssertionError("expected authorization mismatch")
except ValueError as exc:
    assert "authorization" in str(exc)

print("Kale Outreach sales execution deterministic rule tests passed.")
