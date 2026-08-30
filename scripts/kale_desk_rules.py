#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ALLOWED_SOURCE_REFS = (
    "content/site-content.json",
    "content/faq-content.json",
    "content/faq-policy-additions.json",
    "license.html",
    "ja/license.html",
    "index.html",
    "ja/index.html",
)

CATEGORY_RULES = (
    (
        "security_privacy",
        (
            "security",
            "secure",
            "vulnerability",
            "breach",
            "privacy",
            "personal data",
            "data protection",
            "セキュリティ",
            "脆弱",
            "個人情報",
            "プライバシー",
        ),
    ),
    (
        "order_payment_fulfillment",
        (
            "order",
            "payment",
            "invoice",
            "receipt",
            "checkout",
            "delivery",
            "installer",
            "注文",
            "支払",
            "請求",
            "領収",
            "納品",
            "インストーラー",
        ),
    ),
    (
        "license_updates",
        (
            "license",
            "source code",
            "update",
            "subscription",
            "customize",
            "customise",
            "redistribution",
            "resale",
            "ライセンス",
            "ソースコード",
            "更新",
            "サブスク",
            "改変",
            "再配布",
            "再販売",
        ),
    ),
    (
        "product_specification",
        (
            "fde ims",
            "inventory",
            "feature",
            "product",
            "integration",
            "在庫",
            "機能",
            "製品",
            "連携",
        ),
    ),
)

AUTHORITY = {
    "customerSend": False,
    "outboundSales": False,
    "orderMutation": False,
    "paymentOperation": False,
    "fulfillmentOperation": False,
    "cloudflareDeploy": False,
    "cloudflareKvWrite": False,
    "gitMerge": False,
    "release": False,
    "publicPost": False,
    "faqPublish": False,
}

FORBIDDEN_ACTION_MARKERS = (
    "send_customer_email",
    "send_outbound_sales",
    "change_order_status",
    "create_payment",
    "release_installer",
    "deploy_cloudflare",
    "write_cloudflare_kv",
    "merge_pull_request",
    "publish_public_content",
    "publish_faq",
)


def clean(value, limit=8000):
    return str(value or "").strip()[:limit]


def fingerprint(value):
    return hashlib.sha256(clean(value, 20000).encode("utf-8")).hexdigest()[:16]


def classify_inquiry(inquiry):
    direction = clean(inquiry.get("direction"), 30).lower() or "inbound"
    if direction != "inbound":
        raise ValueError("KALE_DESK_INBOUND_ONLY")

    text = " ".join(
        (
            clean(inquiry.get("product"), 200),
            clean(inquiry.get("subject"), 500),
            clean(inquiry.get("message"), 8000),
        )
    ).casefold()

    for category, terms in CATEGORY_RULES:
        if any(term.casefold() in text for term in terms):
            return category
    return "general"


def escalation_flags(inquiry, category):
    text = " ".join(
        (
            clean(inquiry.get("subject"), 500),
            clean(inquiry.get("message"), 8000),
        )
    ).casefold()
    flags = []

    if category == "security_privacy":
        flags.append("KALE_GUARD_OR_ADMIN_REVIEW")
    if any(term in text for term in ("legal", "liability", "indemn", "warranty", "契約", "法的", "責任", "保証")):
        flags.append("ADMIN_POLICY_CONFIRMATION")
    if any(term in text for term in ("discount", "custom price", "refund", "返金", "値引", "割引")):
        flags.append("ADMIN_COMMERCIAL_CONFIRMATION")
    if category == "order_payment_fulfillment":
        flags.append("DETERMINISTIC_SYSTEM_STATUS_ONLY")

    return list(dict.fromkeys(flags))


def source_refs_for(category, lang):
    language = clean(lang, 10).lower()
    japanese = language.startswith("ja")
    refs = ["content/site-content.json", "content/faq-content.json", "content/faq-policy-additions.json"]

    if category == "license_updates":
        refs.insert(0, "ja/license.html" if japanese else "license.html")
    elif category == "product_specification":
        refs.insert(0, "ja/index.html" if japanese else "index.html")
    elif category == "security_privacy":
        refs.insert(0, "content/faq-policy-additions.json")
    elif category == "order_payment_fulfillment":
        refs.insert(0, "content/faq-content.json")

    return list(dict.fromkeys(refs))


def draft_shell(inquiry, category):
    product = clean(inquiry.get("product"), 120) or "Baked Kale / FDE"
    lang = clean(inquiry.get("lang"), 10).lower()
    if lang.startswith("ja"):
        category_note = {
            "security_privacy": "セキュリティ・プライバシーに関する内容のため、公開済み仕様に加えて必要な管理者確認を行います。",
            "order_payment_fulfillment": "注文・支払い・納品に関する内容のため、決定論システムに記録された事実だけを確認します。",
            "license_updates": "ライセンス・更新条件に関する内容のため、現在公開されている条件を根拠として確認します。",
            "product_specification": "製品仕様に関する内容のため、現在公開されている製品情報を根拠として確認します。",
            "general": "お問い合わせ内容を確認し、現在公開されている情報を根拠として回答内容を整理します。",
        }[category]
        return (
            f"お問い合わせありがとうございます。{product}について確認しました。"
            f"{category_note}"
            "未公開の機能・価格・保証・契約条件は推測せず、確認できない点はその旨を明記します。"
        )
    category_note = {
        "security_privacy": "Because this concerns security or privacy, the response must use published facts and any required administrator review.",
        "order_payment_fulfillment": "Because this concerns an order, payment, or fulfillment, the response must rely only on facts recorded by the deterministic system.",
        "license_updates": "Because this concerns license or update terms, the response must be grounded in the currently published terms.",
        "product_specification": "Because this concerns product specifications, the response must be grounded in the currently published product information.",
        "general": "The response will be grounded in the currently published information.",
    }[category]
    return (
        f"Thank you for your inquiry about {product}. {category_note} "
        "Unpublished features, prices, warranties, or contractual commitments must not be inferred; any unverified point must be stated as unconfirmed."
    )


def build_support_packet(inquiry):
    if not isinstance(inquiry, dict):
        raise TypeError("inquiry must be a dict")
    if inquiry.get("synthetic") is not True:
        raise ValueError("FOUNDATION_DRY_RUN_REQUIRES_SYNTHETIC_INPUT")

    category = classify_inquiry(inquiry)
    lang = clean(inquiry.get("lang"), 10) or "en"
    source_refs = source_refs_for(category, lang)
    message = clean(inquiry.get("message"), 8000)
    product = clean(inquiry.get("product"), 120)

    packet = {
        "schemaVersion": "p3-5-foundation-1",
        "mode": "synthetic_dry_run_only",
        "direction": "inbound",
        "inquiryRef": fingerprint(f"{lang}|{product}|{message}"),
        "analysis": {
            "category": category,
            "sourceRefs": source_refs,
            "escalationFlags": escalation_flags(inquiry, category),
            "unsupportedClaimsMustBeEscalated": True,
        },
        "replyDraft": {
            "state": "DRAFT_REQUIRES_ADMIN_APPROVAL",
            "language": lang,
            "body": draft_shell(inquiry, category),
        },
        "faqCandidate": {
            "state": "CANDIDATE_ONLY_NOT_PUBLISHED",
            "topic": f"{product or 'general'} / {category}",
        },
        "authority": dict(AUTHORITY),
        "forbiddenActions": list(FORBIDDEN_ACTION_MARKERS),
        "customerSendPerformed": False,
        "containsRealCustomerData": False,
    }
    return packet


def validate_support_packet(packet):
    errors = []

    if packet.get("direction") != "inbound":
        errors.append("direction must remain inbound")
    if packet.get("mode") != "synthetic_dry_run_only":
        errors.append("foundation workflow must remain synthetic dry-run only")
    if packet.get("containsRealCustomerData") is not False:
        errors.append("foundation evidence must not contain real customer data")
    if packet.get("customerSendPerformed") is not False:
        errors.append("Kale Desk foundation must not send customer communications")

    authority = packet.get("authority") or {}
    for key, expected in AUTHORITY.items():
        if authority.get(key) is not expected:
            errors.append(f"authority.{key} must remain {expected}")

    reply = packet.get("replyDraft") or {}
    if reply.get("state") != "DRAFT_REQUIRES_ADMIN_APPROVAL":
        errors.append("reply draft must require Administrator approval")
    if not clean(reply.get("body"), 12000):
        errors.append("reply draft body is required")

    analysis = packet.get("analysis") or {}
    refs = analysis.get("sourceRefs") or []
    if not refs:
        errors.append("at least one source reference is required")
    for ref in refs:
        if ref not in ALLOWED_SOURCE_REFS:
            errors.append(f"unapproved source reference: {ref}")
    if analysis.get("unsupportedClaimsMustBeEscalated") is not True:
        errors.append("unsupported claims must be escalated")

    faq = packet.get("faqCandidate") or {}
    if faq.get("state") != "CANDIDATE_ONLY_NOT_PUBLISHED":
        errors.append("FAQ output must remain candidate-only")

    forbidden = packet.get("forbiddenActions") or []
    for marker in FORBIDDEN_ACTION_MARKERS:
        if marker not in forbidden:
            errors.append(f"missing forbidden action marker: {marker}")

    if errors:
        raise ValueError("KALE_DESK_CONTRACT_VIOLATION: " + "; ".join(errors))
    return True


def source_fingerprints(refs):
    output = []
    for ref in refs:
        if ref not in ALLOWED_SOURCE_REFS:
            raise ValueError(f"UNAPPROVED_SOURCE_REF:{ref}")
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
