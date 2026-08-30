#!/usr/bin/env python3
from __future__ import annotations

import hashlib

ALLOWED_CHANNELS = {"email", "linkedin_dm", "general"}
ALLOWED_PRE_RELEASE_CTAS = {"learn_more", "view_demo", "contact", "discovery_call"}
BLOCKED_PROSPECT_SOURCES = {"purchased_list", "scraped_list", "unreviewed_broker"}


def clean(value, limit=12000):
    return str(value or "").strip()[:limit]


def fingerprint(value):
    return hashlib.sha256(clean(value, 30000).encode("utf-8")).hexdigest()[:16]


def evaluate_sales_execution(source):
    if not isinstance(source, dict):
        raise TypeError("source must be a dict")

    channel = clean(source.get("channel"), 40).lower()
    if channel not in ALLOWED_CHANNELS:
        raise ValueError("SALES_CHANNEL_UNSUPPORTED")

    if source.get("factsConfirmedPublished") is not True:
        raise ValueError("SALES_REQUIRES_CONFIRMED_PUBLISHED_FACTS")
    if source.get("containsUnsupportedClaim") is True:
        raise ValueError("UNSUPPORTED_SALES_CLAIM_BLOCKED")

    prospect_source = clean(source.get("prospectSourceType"), 80).lower()
    if not prospect_source:
        raise ValueError("PROSPECT_SOURCE_REQUIRED")
    if prospect_source in BLOCKED_PROSPECT_SOURCES:
        raise ValueError("UNAPPROVED_PROSPECT_SOURCE_BLOCKED")
    if source.get("prospectSourceApproved") is not True:
        raise ValueError("PROSPECT_SOURCE_APPROVAL_REQUIRED")
    if source.get("businessPurposeConfirmed") is not True:
        raise ValueError("B2B_BUSINESS_PURPOSE_REQUIRED")
    if source.get("containsSensitivePersonalData") is True:
        raise ValueError("SENSITIVE_PROSPECT_DATA_BLOCKED")
    if source.get("bulkScrapingPerformed") is True:
        raise ValueError("BULK_SCRAPING_BLOCKED")

    commercial_launch_ready = source.get("commercialLaunchReady") is True
    cta_intent = clean(source.get("ctaIntent"), 40).lower() or "learn_more"
    if not commercial_launch_ready and cta_intent not in ALLOWED_PRE_RELEASE_CTAS:
        raise ValueError("PRE_RELEASE_TRANSACTIONAL_CTA_BLOCKED")

    compliance_approved = source.get("countryComplianceApproved") is True
    compliance_ref = clean(source.get("complianceEvidenceRef"), 500)
    administrator_approved = source.get("administratorApproval") is True
    approval_scope_id = clean(source.get("approvalScopeId"), 300)
    sender_approved = source.get("senderApproved") is True

    missing = []
    if not compliance_approved:
        missing.append("countryComplianceApproved")
    if not compliance_ref:
        missing.append("complianceEvidenceRef")
    if not administrator_approved:
        missing.append("administratorApproval")
    if not approval_scope_id:
        missing.append("approvalScopeId")
    if not sender_approved:
        missing.append("senderApproved")

    if source.get("autonomousBulkSend") is True:
        raise ValueError("AUTONOMOUS_BULK_SEND_BLOCKED")
    if source.get("reuseCloudflareBrevoCustomerPath") is True:
        raise ValueError("CUSTOMER_EMAIL_PATH_REPURPOSE_BLOCKED")
    if source.get("crmWriteRequested") is True:
        raise ValueError("CRM_WRITE_NOT_YET_APPROVED")

    execution_authorized = not missing
    execution_state = "APPROVED_FOR_BOUNDED_SALES_EXECUTION" if execution_authorized else "SALES_EXECUTION_BLOCKED"

    prospect_ref = fingerprint("|".join([
        prospect_source,
        clean(source.get("companyName"), 300),
        clean(source.get("country"), 100),
        clean(source.get("sourceRef"), 1000),
    ]))

    return {
        "schemaVersion": "sales-execution-extension-1",
        "direction": "outbound_sales",
        "channel": channel,
        "commercialLaunchReady": commercial_launch_ready,
        "ctaIntent": cta_intent,
        "prospect": {
            "prospectRef": prospect_ref,
            "sourceType": prospect_source,
            "sourceApproved": True,
            "businessPurposeConfirmed": True,
            "containsSensitivePersonalData": False,
            "bulkScrapingPerformed": False,
        },
        "compliance": {
            "countryComplianceApproved": compliance_approved,
            "complianceEvidenceRef": compliance_ref,
        },
        "approval": {
            "administratorApproval": administrator_approved,
            "approvalScopeId": approval_scope_id,
            "senderApproved": sender_approved,
        },
        "execution": {
            "state": execution_state,
            "authorized": execution_authorized,
            "missingGates": missing,
            "autonomousBulkSend": False,
            "cloudflareBrevoCustomerPathReused": False,
            "crmWriteApproved": False,
        },
    }


def validate_sales_execution_packet(packet):
    errors = []
    if packet.get("direction") != "outbound_sales":
        errors.append("direction must be outbound_sales")
    if packet.get("channel") not in ALLOWED_CHANNELS:
        errors.append("unsupported channel")

    prospect = packet.get("prospect") or {}
    if prospect.get("sourceApproved") is not True:
        errors.append("prospect source approval required")
    if prospect.get("businessPurposeConfirmed") is not True:
        errors.append("business purpose required")
    if prospect.get("containsSensitivePersonalData") is not False:
        errors.append("sensitive prospect data must remain false")
    if prospect.get("bulkScrapingPerformed") is not False:
        errors.append("bulk scraping must remain false")

    approval = packet.get("approval") or {}
    compliance = packet.get("compliance") or {}
    execution = packet.get("execution") or {}
    should_authorize = all([
        compliance.get("countryComplianceApproved") is True,
        bool(clean(compliance.get("complianceEvidenceRef"), 500)),
        approval.get("administratorApproval") is True,
        bool(clean(approval.get("approvalScopeId"), 300)),
        approval.get("senderApproved") is True,
    ])

    if execution.get("authorized") is not should_authorize:
        errors.append("execution authorization does not match required gates")
    expected_state = "APPROVED_FOR_BOUNDED_SALES_EXECUTION" if should_authorize else "SALES_EXECUTION_BLOCKED"
    if execution.get("state") != expected_state:
        errors.append("execution state does not match required gates")
    if execution.get("autonomousBulkSend") is not False:
        errors.append("autonomous bulk send must remain false")
    if execution.get("cloudflareBrevoCustomerPathReused") is not False:
        errors.append("Cloudflare/Brevo customer path reuse must remain false")
    if execution.get("crmWriteApproved") is not False:
        errors.append("CRM write must remain disabled until separately approved")

    if errors:
        raise ValueError("KALE_OUTREACH_SALES_CONTRACT_VIOLATION: " + "; ".join(errors))
    return True
