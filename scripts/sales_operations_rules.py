#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter
from urllib.parse import urlparse

STATES = {
    "RESEARCHED",
    "QUALIFIED",
    "DISQUALIFIED",
    "ADMIN_APPROVED",
    "READY_FOR_OUTREACH",
    "SENT",
    "REPLIED",
    "POSITIVE_REPLY",
    "NEGATIVE_REPLY",
    "MEETING",
    "WON",
    "LOST",
}

TRANSITIONS = {
    "RESEARCHED": {"QUALIFIED", "DISQUALIFIED"},
    "QUALIFIED": {"ADMIN_APPROVED", "DISQUALIFIED"},
    "ADMIN_APPROVED": {"READY_FOR_OUTREACH"},
    "READY_FOR_OUTREACH": {"SENT"},
    "SENT": {"REPLIED"},
    "REPLIED": {"POSITIVE_REPLY", "NEGATIVE_REPLY"},
    "POSITIVE_REPLY": {"MEETING", "WON", "LOST"},
    "NEGATIVE_REPLY": {"LOST"},
    "MEETING": {"WON", "LOST"},
    "DISQUALIFIED": set(),
    "WON": set(),
    "LOST": set(),
}

SEND_GATE_CHECKS = (
    ("factsConfirmedPublished", "factsConfirmedPublished"),
    ("prospectSourceApproved", "prospectSourceApproved"),
    ("countryComplianceApproved", "countryComplianceApproved"),
    ("complianceEvidenceRef", "complianceEvidenceRef"),
    ("administratorApproval", "administratorApproval"),
    ("approvalScopeId", "approvalScopeId"),
    ("approved sender/channel", "approvedSenderChannel"),
    ("noMaterialClaimChanged", "noMaterialClaimChanged"),
)

PROSPECT_REQUIRED_FIELDS = {
    "Prospect ID",
    "Company",
    "Country",
    "Industry",
    "Fit Score",
    "Fit rationale",
    "Source URL",
    "Source system",
    "Source checked date",
    "Evidence",
    "Confidence",
    "Contact route",
    "Current status",
}

SENSITIVE_FIELD_NAMES = {
    "date of birth",
    "health",
    "medical condition",
    "religion",
    "race",
    "ethnicity",
    "sexual orientation",
    "political affiliation",
    "home address",
    "personal phone",
    "personal email",
}

POST_APPROVAL_STATES = {
    "ADMIN_APPROVED",
    "READY_FOR_OUTREACH",
    "SENT",
    "REPLIED",
    "POSITIVE_REPLY",
    "NEGATIVE_REPLY",
    "MEETING",
    "WON",
    "LOST",
}


def normalize_company_name(value: str) -> str:
    text = (value or "").casefold()
    normalized = "".join(character if character.isalnum() else " " for character in text)
    return " ".join(normalized.split())


def normalize_website_host(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    candidate = raw if "://" in raw else f"https://{raw}"
    parsed = urlparse(candidate)
    host = (parsed.hostname or "").casefold().strip(".")
    if host.startswith("www."):
        host = host[4:]
    return host


def prospect_dedupe_key(company: str, website: str) -> str:
    host = normalize_website_host(website)
    if host:
        return f"domain:{host}"
    name = normalize_company_name(company)
    if not name:
        raise ValueError("company or website is required for duplicate detection")
    return f"company:{name}"


def detect_duplicate_prospects(records: list[dict]) -> list[tuple[int, int, str]]:
    seen: dict[str, int] = {}
    duplicates: list[tuple[int, int, str]] = []
    for index, record in enumerate(records):
        key = prospect_dedupe_key(str(record.get("Company", "")), str(record.get("Website", "")))
        if key in seen:
            duplicates.append((seen[key], index, key))
        else:
            seen[key] = index
    return duplicates


def assign_id(record_type: str, sequence: int) -> str:
    prefixes = {"prospect": "PROS", "activity": "ACT", "campaign": "CAMP"}
    if record_type not in prefixes:
        raise ValueError(f"unsupported record type: {record_type}")
    if not isinstance(sequence, int) or sequence < 1:
        raise ValueError("sequence must be a positive integer")
    return f"{prefixes[record_type]}-{sequence:06d}"


def validate_prospect(record: dict) -> list[str]:
    errors: list[str] = []
    missing = sorted(field for field in PROSPECT_REQUIRED_FIELDS if record.get(field) in (None, ""))
    if missing:
        errors.append("missing required prospect fields: " + ", ".join(missing))

    score = record.get("Fit Score")
    if score not in (None, ""):
        if not isinstance(score, (int, float)) or isinstance(score, bool) or not 0 <= score <= 100:
            errors.append("Fit Score must be a number from 0 to 100")

    status = record.get("Current status")
    if status not in (None, "") and status not in STATES:
        errors.append(f"invalid prospect status: {status}")

    if record.get("Business email"):
        email = str(record["Business email"]).strip()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            errors.append("Business email is not a valid business-email shape")

    lowered_keys = {str(key).casefold() for key in record}
    sensitive = sorted(lowered_keys & SENSITIVE_FIELD_NAMES)
    if sensitive:
        errors.append("sensitive personal-data fields are prohibited: " + ", ".join(sensitive))

    return errors


def missing_send_gates(context: dict) -> list[str]:
    missing: list[str] = []
    boolean_gates = {
        "factsConfirmedPublished",
        "prospectSourceApproved",
        "countryComplianceApproved",
        "administratorApproval",
        "noMaterialClaimChanged",
    }
    for label, key in SEND_GATE_CHECKS:
        value = context.get(key)
        if label in boolean_gates:
            if value is not True:
                missing.append(label)
        elif value in (None, "", False):
            missing.append(label)
    return missing


def validate_transition(current: str, target: str, context: dict | None = None) -> list[str]:
    context = context or {}
    errors: list[str] = []
    if current not in STATES:
        return [f"unknown current state: {current}"]
    if target not in STATES:
        return [f"unknown target state: {target}"]
    if target not in TRANSITIONS[current]:
        errors.append(f"invalid lifecycle transition: {current} -> {target}")
        return errors

    if target == "ADMIN_APPROVED":
        if context.get("administratorApproval") is not True:
            errors.append("ADMIN_APPROVED requires explicit Administrator approval")
        if not context.get("approvalScopeId"):
            errors.append("ADMIN_APPROVED requires bounded approvalScopeId")

    if target in {"READY_FOR_OUTREACH", "SENT"}:
        missing = missing_send_gates(context)
        if missing:
            errors.append(f"{target} requires complete outbound execution gates: {', '.join(missing)}")

    return errors


def calculate_metrics(prospects: list[dict], activities: list[dict]) -> dict[str, float | int]:
    statuses = Counter(str(item.get("Current status", "")) for item in prospects)
    researched = len(prospects)
    approved = sum(1 for item in prospects if item.get("Current status") in POST_APPROVAL_STATES)
    sent = sum(1 for item in activities if str(item.get("Action", "")).casefold() == "send")
    replies = sum(
        1
        for item in activities
        if str(item.get("Action", "")).casefold() == "reply_received" or bool(item.get("Reply category"))
    )
    positive = sum(1 for item in activities if str(item.get("Reply category", "")).casefold() == "positive")
    meetings = sum(1 for item in activities if str(item.get("Action", "")).casefold() == "meeting_booked")
    wins = statuses["WON"]
    losses = statuses["LOST"]

    def rate(numerator: int, denominator: int) -> float:
        return round(numerator / denominator, 6) if denominator else 0.0

    return {
        "researched prospects": researched,
        "approved prospects": approved,
        "messages sent": sent,
        "replies": replies,
        "positive replies": positive,
        "meetings": meetings,
        "wins": wins,
        "losses": losses,
        "reply rate": rate(replies, sent),
        "positive reply rate": rate(positive, sent),
        "meeting rate": rate(meetings, sent),
        "conversion rate": rate(wins, sent),
    }
