#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CMS_BOUNDARY_REFS = (
    "cms-admin.js",
    "news-translation-hook.js",
    "content/site-content.json",
    "worker/wrangler.toml",
    "worker/src/index-v14.js",
)

AUTHORITY = {
    "cmsPublish": False,
    "publicPost": False,
    "outboundCampaign": False,
    "outboundSend": False,
    "customerSend": False,
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
    "publish_cms",
    "post_publicly",
    "send_campaign",
    "send_customer_email",
    "write_github_content",
    "merge_pull_request",
    "release_software",
    "deploy_cloudflare",
    "write_cloudflare_kv",
    "change_order_status",
    "create_payment",
    "fulfill_order",
)

ROUTES = {
    "mirror_release": ("Product", "Product News"),
    "guard_improvement": ("Development", "Development News"),
    "administrator_social": ("Social", "Social content"),
}


def clean(value, limit=12000):
    return str(value or "").strip()[:limit]


def fingerprint(value):
    return hashlib.sha256(clean(value, 30000).encode("utf-8")).hexdigest()[:16]


def route_source(source):
    if not isinstance(source, dict):
        raise TypeError("source must be a dict")
    if source.get("synthetic") is not True:
        raise ValueError("FOUNDATION_DRY_RUN_REQUIRES_SYNTHETIC_INPUT")

    direction = clean(source.get("direction"), 50).lower() or "public_editorial_only"
    if direction != "public_editorial_only":
        raise ValueError("KALES_OFFICE_PUBLIC_EDITORIAL_ONLY")

    kind = clean(source.get("sourceKind"), 60).lower()
    if kind not in ROUTES:
        raise ValueError("KALES_OFFICE_SOURCE_KIND_UNSUPPORTED")

    if kind == "mirror_release":
        if clean(source.get("releaseStatus"), 40).lower() != "released" or source.get("releaseApproved") is not True:
            raise ValueError("UNRELEASED_PRODUCT_NEWS_BLOCKED")
    elif kind == "guard_improvement":
        if clean(source.get("remediationStatus"), 40).lower() != "verified":
            raise ValueError("UNVERIFIED_GUARD_IMPROVEMENT_BLOCKED")
        if source.get("publicSafeInput") is not True:
            raise ValueError("SENSITIVE_SECURITY_DETAIL_BLOCKED")
    elif kind == "administrator_social":
        if source.get("administratorRequested") is not True:
            raise ValueError("ADMIN_REQUEST_REQUIRED_FOR_SOCIAL")
        if source.get("factsAlreadyPublic") is not True:
            raise ValueError("SOCIAL_REQUIRES_ALREADY_PUBLIC_FACTS")

    return kind, ROUTES[kind]


def claim_ledger(source):
    refs = [clean(item, 300) for item in (source.get("sourceRefs") or []) if clean(item, 300)]
    if not refs:
        raise ValueError("SOURCE_REFERENCES_REQUIRED")

    claims = source.get("claims") or []
    if not isinstance(claims, list) or not claims:
        raise ValueError("SUPPORTED_CLAIMS_REQUIRED")

    ledger = []
    for item in claims:
        if not isinstance(item, dict):
            raise ValueError("CLAIM_ENTRY_INVALID")
        text = clean(item.get("text"), 1200)
        source_ref = clean(item.get("sourceRef"), 300)
        supported = item.get("supported") is True
        if not text or not source_ref or source_ref not in refs or not supported:
            raise ValueError("UNSUPPORTED_EDITORIAL_CLAIM")
        ledger.append(
            {
                "claimRef": fingerprint(f"{source_ref}|{text}"),
                "text": text,
                "sourceRef": source_ref,
                "supported": True,
            }
        )
    return refs, ledger


def draft_shell(source, category, label, claims):
    title = clean(source.get("headlineJa"), 180)
    summary = clean(source.get("summaryJa"), 4000)

    if not title:
        title = {
            "Product": "製品アップデートのお知らせ",
            "Development": "開発・運用改善のお知らせ",
            "Social": "Baked Kale / FDEからのお知らせ",
        }[category]

    if not summary:
        summary = "根拠確認済みの情報をもとに、公開用原稿を作成します。"

    claim_lines = [f"・{item['text']}" for item in claims]
    body = summary
    if claim_lines:
        body += "\n\n確認済み事項\n" + "\n".join(claim_lines)

    if category == "Development":
        body += "\n\n公開原稿には、Secrets・credential・悪用可能な脆弱性詳細を含めません。"
    elif category == "Social":
        body += "\n\nこの原稿は管理者から明示依頼された公開情報の再構成であり、営業campaignではありません。"

    return {
        "titleJa": title,
        "bodyJa": body,
        "category": category,
        "editorialLabel": label,
    }


def build_editorial_packet(source):
    kind, (category, label) = route_source(source)
    refs, claims = claim_ledger(source)
    draft = draft_shell(source, category, label, claims)

    source_seed = "|".join(
        [
            kind,
            clean(source.get("sourceId"), 300),
            *refs,
            *(item["claimRef"] for item in claims),
        ]
    )

    return {
        "schemaVersion": "p3-6-foundation-1",
        "mode": "synthetic_dry_run_only",
        "direction": "public_editorial_only",
        "source": {
            "kind": kind,
            "sourceRef": fingerprint(source_seed),
            "sourceRefs": refs,
            "claimLedger": claims,
            "unsupportedClaimsMustBeEscalated": True,
        },
        "cmsDraft": {
            "state": "DRAFT_REQUIRES_ADMIN_APPROVAL",
            "sourceLanguage": "ja",
            "englishGenerationPath": "EXISTING_CMS_SAVE_FLOW",
            **draft,
        },
        "publication": {
            "state": "DRAFT_REQUIRES_ADMIN_APPROVAL",
            "administratorApprovalRequired": True,
            "cmsPublishPerformed": False,
            "publicPostPerformed": False,
        },
        "authority": dict(AUTHORITY),
        "forbiddenActions": list(FORBIDDEN_ACTION_MARKERS),
        "containsRealCustomerData": False,
        "containsSensitiveSourceData": False,
    }


def validate_editorial_packet(packet):
    errors = []

    if packet.get("mode") != "synthetic_dry_run_only":
        errors.append("foundation workflow must remain synthetic dry-run only")
    if packet.get("direction") != "public_editorial_only":
        errors.append("direction must remain public editorial only")
    if packet.get("containsRealCustomerData") is not False:
        errors.append("foundation evidence must not contain real customer data")
    if packet.get("containsSensitiveSourceData") is not False:
        errors.append("foundation evidence must not contain sensitive source data")

    source = packet.get("source") or {}
    if source.get("unsupportedClaimsMustBeEscalated") is not True:
        errors.append("unsupported claims must be escalated")
    if not source.get("sourceRefs"):
        errors.append("source references are required")
    if not source.get("claimLedger"):
        errors.append("claim ledger is required")
    for claim in source.get("claimLedger") or []:
        if claim.get("supported") is not True:
            errors.append("claim ledger must contain supported claims only")

    draft = packet.get("cmsDraft") or {}
    if draft.get("state") != "DRAFT_REQUIRES_ADMIN_APPROVAL":
        errors.append("CMS draft must require Administrator approval")
    if draft.get("sourceLanguage") != "ja":
        errors.append("CMS source language must remain Japanese")
    if draft.get("englishGenerationPath") != "EXISTING_CMS_SAVE_FLOW":
        errors.append("English generation must remain in the existing CMS save flow")
    if draft.get("category") not in {"Product", "Development", "Social"}:
        errors.append("unsupported CMS category")
    if not clean(draft.get("titleJa"), 500) or not clean(draft.get("bodyJa"), 10000):
        errors.append("Japanese title/body are required")

    publication = packet.get("publication") or {}
    if publication.get("state") != "DRAFT_REQUIRES_ADMIN_APPROVAL":
        errors.append("publication state must require Administrator approval")
    if publication.get("administratorApprovalRequired") is not True:
        errors.append("Administrator approval must remain required")
    if publication.get("cmsPublishPerformed") is not False:
        errors.append("Kale’s Office foundation must not publish CMS content")
    if publication.get("publicPostPerformed") is not False:
        errors.append("Kale’s Office foundation must not post publicly")

    authority = packet.get("authority") or {}
    for key, expected in AUTHORITY.items():
        if authority.get(key) is not expected:
            errors.append(f"authority.{key} must remain {expected}")

    forbidden = packet.get("forbiddenActions") or []
    for marker in FORBIDDEN_ACTION_MARKERS:
        if marker not in forbidden:
            errors.append(f"missing forbidden action marker: {marker}")

    if errors:
        raise ValueError("KALES_OFFICE_CONTRACT_VIOLATION: " + "; ".join(errors))
    return True


def cms_boundary_fingerprints():
    output = []
    for ref in CMS_BOUNDARY_REFS:
        path = ROOT / ref
        if not path.exists():
            raise FileNotFoundError(ref)
        output.append(
            {
                "path": ref,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )
    return output
