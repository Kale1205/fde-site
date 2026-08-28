#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]

ALLOWED_PUBLIC_SOURCE_REFS = (
    "content/site-content.json",
    "index.html",
    "ja/index.html",
    "license.html",
    "ja/license.html",
    "news.html",
    "ja/news.html",
    "demo.html",
    "ja/demo.html",
    "why.html",
    "ja/why.html",
    "goals.html",
    "ja/goals.html",
)

ALLOWED_CHANNELS = {"email", "linkedin_dm", "general"}
ALLOWED_AUDIENCE_TYPES = {"prospect_segment", "existing_customer_segment"}
ALLOWED_LANGUAGES = {"ja", "en"}
ALLOWED_PRE_RELEASE_CTAS = {"learn_more", "view_demo", "contact"}
PUBLIC_SITE_HOST = "kale1205.github.io"
PUBLIC_SITE_PREFIX = "/fde-site/"

AUTHORITY = {
    "outboundSend": False,
    "customerSend": False,
    "recipientHarvest": False,
    "recipientListMutation": False,
    "crmWrite": False,
    "brevoSend": False,
    "gmailSend": False,
    "linkedinSend": False,
    "publicPost": False,
    "cmsPublish": False,
    "gitWrite": False,
    "gitMerge": False,
    "release": False,
    "cloudflareDeploy": False,
    "cloudflareKvWrite": False,
    "orderMutation": False,
    "paymentOperation": False,
    "fulfillmentOperation": False,
}

FORBIDDEN_ACTION_MARKERS = (
    "send_outbound_message",
    "send_campaign",
    "harvest_recipient",
    "build_real_recipient_list",
    "write_crm",
    "send_brevo",
    "send_gmail",
    "send_linkedin",
    "post_publicly",
    "publish_cms",
    "write_github_content",
    "merge_pull_request",
    "release_software",
    "deploy_cloudflare",
    "write_cloudflare_kv",
    "change_order_status",
    "create_payment",
    "fulfill_order",
)

EXECUTION_STATE = "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL"
DRAFT_STATE = "DRAFT_REQUIRES_ADMIN_APPROVAL"
SEGMENT_STATE = "SEGMENT_PROPOSAL_ONLY_NO_REAL_RECIPIENTS"


def clean(value, limit=12000):
    return str(value or "").strip()[:limit]


def fingerprint(value):
    return hashlib.sha256(clean(value, 30000).encode("utf-8")).hexdigest()[:16]


def validate_public_url(value):
    url = clean(value, 1000)
    if not url:
        return ""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != PUBLIC_SITE_HOST:
        raise ValueError("CTA_URL_MUST_USE_CURRENT_PUBLIC_SITE")
    if not parsed.path.startswith(PUBLIC_SITE_PREFIX):
        raise ValueError("CTA_URL_MUST_USE_CURRENT_PUBLIC_SITE")
    return url


def claim_ledger(source):
    refs = [clean(item, 300) for item in (source.get("sourceRefs") or []) if clean(item, 300)]
    if not refs:
        raise ValueError("PUBLIC_SOURCE_REFERENCES_REQUIRED")
    for ref in refs:
        if ref not in ALLOWED_PUBLIC_SOURCE_REFS:
            raise ValueError(f"UNAPPROVED_PUBLIC_SOURCE_REF:{ref}")

    claims = source.get("claims") or []
    if not isinstance(claims, list) or not claims:
        raise ValueError("SUPPORTED_PUBLIC_CLAIMS_REQUIRED")

    ledger = []
    for item in claims:
        if not isinstance(item, dict):
            raise ValueError("CLAIM_ENTRY_INVALID")
        text = clean(item.get("text"), 1200)
        source_ref = clean(item.get("sourceRef"), 300)
        supported = item.get("supported") is True
        if not text or source_ref not in refs or not supported:
            raise ValueError("UNSUPPORTED_OR_UNPUBLISHED_OUTREACH_CLAIM")
        ledger.append({"claimRef": fingerprint(f"{source_ref}|{text}"), "text": text, "sourceRef": source_ref, "supported": True, "published": True})
    return refs, ledger


def validate_source(source):
    if not isinstance(source, dict):
        raise TypeError("source must be a dict")
    if source.get("synthetic") is not True:
        raise ValueError("FOUNDATION_DRY_RUN_REQUIRES_SYNTHETIC_INPUT")

    direction = clean(source.get("direction"), 60).lower() or "outbound_growth_draft_only"
    if direction != "outbound_growth_draft_only":
        raise ValueError("KALE_OUTREACH_OUTBOUND_ONLY")
    if source.get("factsConfirmedPublished") is not True:
        raise ValueError("OUTREACH_REQUIRES_CONFIRMED_PUBLISHED_FACTS")
    if source.get("usesUnpublishedOfficeDraft") is True:
        raise ValueError("UNPUBLISHED_OFFICE_DRAFT_BLOCKED")
    if source.get("mentionsUnreleasedFeature") is True:
        raise ValueError("UNRELEASED_FEATURE_PROMOTION_BLOCKED")
    if source.get("containsRealRecipientData") is not False:
        raise ValueError("FOUNDATION_REJECTS_REAL_RECIPIENT_DATA")
    if source.get("recipientListProvided") is True:
        raise ValueError("FOUNDATION_REJECTS_RECIPIENT_LISTS")

    channel = clean(source.get("channel"), 40).lower()
    if channel not in ALLOWED_CHANNELS:
        raise ValueError("OUTREACH_CHANNEL_UNSUPPORTED")
    audience_type = clean(source.get("audienceType"), 80).lower()
    if audience_type not in ALLOWED_AUDIENCE_TYPES:
        raise ValueError("AUDIENCE_TYPE_UNSUPPORTED")
    language = clean(source.get("language"), 10).lower() or "en"
    if language not in ALLOWED_LANGUAGES:
        raise ValueError("OUTREACH_LANGUAGE_UNSUPPORTED")

    commercial_launch_ready = source.get("commercialLaunchReady") is True
    cta_intent = clean(source.get("ctaIntent"), 40).lower() or "learn_more"
    if not commercial_launch_ready and cta_intent not in ALLOWED_PRE_RELEASE_CTAS:
        raise ValueError("PRE_RELEASE_TRANSACTIONAL_CTA_BLOCKED")
    if source.get("includesCommercialOffer") is True and source.get("administratorCommercialApproval") is not True:
        raise ValueError("UNAPPROVED_COMMERCIAL_OFFER_BLOCKED")

    return {"channel": channel, "audienceType": audience_type, "language": language, "commercialLaunchReady": commercial_launch_ready, "ctaIntent": cta_intent, "ctaUrl": validate_public_url(source.get("ctaUrl"))}


def segment_proposal(source, validated):
    label = clean(source.get("audienceLabel"), 180) or ("見込み客セグメント" if validated["language"] == "ja" else "Prospect segment")
    rationale = clean(source.get("segmentRationale"), 1200) or ("公開済み情報との関連性をもとに対象像を整理します。" if validated["language"] == "ja" else "Define the audience profile using relevance to already-published information.")
    return {"state": SEGMENT_STATE, "audienceType": validated["audienceType"], "label": label, "rationale": rationale, "containsNamedRecipients": False, "containsContactDetails": False}


def sales_copy(source, validated, claims):
    lang = validated["language"]
    audience = clean(source.get("audienceLabel"), 180) or ("ご担当者" if lang == "ja" else "your team")
    if lang == "ja":
        subject = clean(source.get("subject"), 180) or "Baked Kale / FDE IMSのご紹介"
        intro = f"{audience}向けに、Baked Kale / Kale’s FDEの公開済み情報をご案内します。"
        if not validated["commercialLaunchReady"]:
            intro += " FDE IMSは現在開発中であり、正式販売開始を示す案内ではありません。"
        bullets = "\n".join(f"・{item['text']}" for item in claims)
        cta = {"learn_more": "詳細は公開サイトでご確認ください。", "view_demo": "現在の開発プレビューは公開Demoでご確認いただけます。", "contact": "関心がありましたら、公開Contactからお問い合わせください。"}.get(validated["ctaIntent"], "詳細は公開サイトでご確認ください。")
        body = f"{intro}\n\n公開済み情報\n{bullets}\n\n{cta}"
    else:
        subject = clean(source.get("subject"), 180) or "Introduction to Baked Kale / FDE IMS"
        intro = f"This draft introduces already-published Baked Kale / Kale’s FDE information relevant to {audience}."
        if not validated["commercialLaunchReady"]:
            intro += " FDE IMS is currently in development; this is not a notice that commercial sales are open."
        bullets = "\n".join(f"- {item['text']}" for item in claims)
        cta = {"learn_more": "Please refer to the public site for current information.", "view_demo": "You can review the current development preview on the public Demo page.", "contact": "If this is relevant, please use the public Contact page to get in touch."}.get(validated["ctaIntent"], "Please refer to the public site for current information.")
        body = f"{intro}\n\nPublished information\n{bullets}\n\n{cta}"
    if validated["ctaUrl"]:
        body += f"\n{validated['ctaUrl']}"
    return {"state": DRAFT_STATE, "channel": validated["channel"], "language": lang, "subject": subject, "body": body, "ctaIntent": validated["ctaIntent"], "ctaUrl": validated["ctaUrl"]}


def build_outreach_packet(source):
    validated = validate_source(source)
    refs, claims = claim_ledger(source)
    segment = segment_proposal(source, validated)
    copy = sales_copy(source, validated, claims)
    seed = "|".join([validated["channel"], validated["audienceType"], validated["language"], *refs, *(item["claimRef"] for item in claims)])
    return {
        "schemaVersion": "p3-7-foundation-1",
        "mode": "synthetic_dry_run_only",
        "direction": "outbound_growth_draft_only",
        "campaignRef": fingerprint(seed),
        "grounding": {"factsConfirmedPublished": True, "sourceRefs": refs, "claimLedger": claims, "unsupportedClaimsMustBeEscalated": True, "unpublishedOfficeDraftsAllowed": False, "unreleasedFeaturesAllowed": False},
        "segmentProposal": segment,
        "salesCopy": copy,
        "execution": {"state": EXECUTION_STATE, "administratorApprovalRequired": True, "p5_3CountryComplianceReviewRequired": True, "countrySpecificEmailRulesChecked": False, "realRecipientDataHandlingApproved": False, "outboundSendPerformed": False, "customerSendPerformed": False, "crmWritePerformed": False},
        "authority": dict(AUTHORITY),
        "forbiddenActions": list(FORBIDDEN_ACTION_MARKERS),
        "containsRealRecipientData": False,
        "containsRealCustomerData": False,
    }


def validate_outreach_packet(packet):
    errors = []
    if packet.get("mode") != "synthetic_dry_run_only": errors.append("foundation workflow must remain synthetic dry-run only")
    if packet.get("direction") != "outbound_growth_draft_only": errors.append("direction must remain outbound growth draft only")
    if packet.get("containsRealRecipientData") is not False: errors.append("foundation evidence must not contain real recipient data")
    if packet.get("containsRealCustomerData") is not False: errors.append("foundation evidence must not contain real customer data")
    grounding = packet.get("grounding") or {}
    if grounding.get("factsConfirmedPublished") is not True: errors.append("outreach claims must come from confirmed published facts")
    if grounding.get("unsupportedClaimsMustBeEscalated") is not True: errors.append("unsupported claims must be escalated")
    if grounding.get("unpublishedOfficeDraftsAllowed") is not False: errors.append("unpublished Kale’s Office drafts must remain blocked")
    if grounding.get("unreleasedFeaturesAllowed") is not False: errors.append("unreleased features must remain blocked")
    if not grounding.get("sourceRefs") or not grounding.get("claimLedger"): errors.append("published source references and claim ledger are required")
    for ref in grounding.get("sourceRefs") or []:
        if ref not in ALLOWED_PUBLIC_SOURCE_REFS: errors.append(f"unapproved public source ref: {ref}")
    for claim in grounding.get("claimLedger") or []:
        if claim.get("supported") is not True or claim.get("published") is not True: errors.append("claim ledger must contain supported published claims only")
    segment = packet.get("segmentProposal") or {}
    if segment.get("state") != SEGMENT_STATE: errors.append("segment output must remain proposal-only")
    if segment.get("containsNamedRecipients") is not False or segment.get("containsContactDetails") is not False: errors.append("segment proposal must not contain real recipients or contact details")
    copy = packet.get("salesCopy") or {}
    if copy.get("state") != DRAFT_STATE: errors.append("sales copy must require Administrator approval")
    if copy.get("channel") not in ALLOWED_CHANNELS: errors.append("unsupported outreach channel")
    if copy.get("language") not in ALLOWED_LANGUAGES: errors.append("unsupported outreach language")
    if not clean(copy.get("subject"), 500) or not clean(copy.get("body"), 10000): errors.append("sales copy subject/body are required")
    execution = packet.get("execution") or {}
    if execution.get("state") != EXECUTION_STATE: errors.append("execution must remain blocked until P5-3 and Administrator approval")
    if execution.get("administratorApprovalRequired") is not True: errors.append("Administrator approval must remain required")
    if execution.get("p5_3CountryComplianceReviewRequired") is not True: errors.append("P5-3 country compliance review must remain required")
    for key in ("countrySpecificEmailRulesChecked", "realRecipientDataHandlingApproved", "outboundSendPerformed", "customerSendPerformed", "crmWritePerformed"):
        if execution.get(key) is not False: errors.append(f"execution.{key} must remain false in P3-7 foundation")
    authority = packet.get("authority") or {}
    for key, expected in AUTHORITY.items():
        if authority.get(key) is not expected: errors.append(f"authority.{key} must remain {expected}")
    forbidden = packet.get("forbiddenActions") or []
    for marker in FORBIDDEN_ACTION_MARKERS:
        if marker not in forbidden: errors.append(f"missing forbidden action marker: {marker}")
    if errors: raise ValueError("KALE_OUTREACH_CONTRACT_VIOLATION: " + "; ".join(errors))
    return True


def source_fingerprints(refs):
    output = []
    for ref in refs:
        if ref not in ALLOWED_PUBLIC_SOURCE_REFS: raise ValueError(f"UNAPPROVED_PUBLIC_SOURCE_REF:{ref}")
        path = ROOT / ref
        if not path.exists(): raise FileNotFoundError(ref)
        output.append({"path": ref, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    return output
