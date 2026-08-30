#!/usr/bin/env python3
from __future__ import annotations

import copy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import kale_desk_rules as desk  # noqa: E402


def fixture(message, product="FDE IMS License", lang="en"):
    return {
        "direction": "inbound",
        "synthetic": True,
        "lang": lang,
        "product": product,
        "subject": "Synthetic support fixture",
        "message": message,
    }


def expect_contract_failure(packet):
    try:
        desk.validate_support_packet(packet)
    except ValueError:
        return
    raise AssertionError("tampered packet unexpectedly passed Kale Desk contract validation")


def run():
    license_packet = desk.build_support_packet(
        fixture("Can our team modify the source code for internal use, and are updates included?")
    )
    assert license_packet["analysis"]["category"] == "license_updates"
    assert "license.html" in license_packet["analysis"]["sourceRefs"]
    assert license_packet["replyDraft"]["state"] == "DRAFT_REQUIRES_ADMIN_APPROVAL"
    assert license_packet["authority"]["customerSend"] is False
    assert license_packet["customerSendPerformed"] is False
    assert license_packet["faqCandidate"]["state"] == "CANDIDATE_ONLY_NOT_PUBLISHED"
    assert desk.validate_support_packet(license_packet)

    security_packet = desk.build_support_packet(
        fixture("How do you handle security and personal data?", product="FDE IMS License")
    )
    assert security_packet["analysis"]["category"] == "security_privacy"
    assert "KALE_GUARD_OR_ADMIN_REVIEW" in security_packet["analysis"]["escalationFlags"]
    assert desk.validate_support_packet(security_packet)

    order_packet = desk.build_support_packet(
        fixture("Where can I check my payment and installer delivery status?", product="FDE IMS")
    )
    assert order_packet["analysis"]["category"] == "order_payment_fulfillment"
    assert "DETERMINISTIC_SYSTEM_STATUS_ONLY" in order_packet["analysis"]["escalationFlags"]
    assert order_packet["authority"]["orderMutation"] is False
    assert order_packet["authority"]["fulfillmentOperation"] is False

    ja_packet = desk.build_support_packet(
        fixture("ソースコードを社内利用のために改変できますか？", lang="ja")
    )
    assert ja_packet["analysis"]["category"] == "license_updates"
    assert "ja/license.html" in ja_packet["analysis"]["sourceRefs"]

    try:
        desk.build_support_packet(
            {
                "direction": "outbound",
                "synthetic": True,
                "lang": "en",
                "product": "FDE IMS",
                "message": "Please contact a prospect.",
            }
        )
    except ValueError as exc:
        assert "INBOUND_ONLY" in str(exc)
    else:
        raise AssertionError("outbound request was not rejected")

    try:
        desk.build_support_packet(
            {
                "direction": "inbound",
                "synthetic": False,
                "lang": "en",
                "product": "FDE IMS",
                "message": "real customer message",
            }
        )
    except ValueError as exc:
        assert "SYNTHETIC_INPUT" in str(exc)
    else:
        raise AssertionError("real-customer foundation input was not rejected")

    tampered_send = copy.deepcopy(license_packet)
    tampered_send["authority"]["customerSend"] = True
    expect_contract_failure(tampered_send)

    tampered_approval = copy.deepcopy(license_packet)
    tampered_approval["replyDraft"]["state"] = "APPROVED"
    expect_contract_failure(tampered_approval)

    tampered_sources = copy.deepcopy(license_packet)
    tampered_sources["analysis"]["sourceRefs"] = ["worker/src/index-v2.js"]
    expect_contract_failure(tampered_sources)

    tampered_faq = copy.deepcopy(license_packet)
    tampered_faq["faqCandidate"]["state"] = "PUBLISHED"
    expect_contract_failure(tampered_faq)

    print("P3-5 Kale Desk deterministic rule tests passed.")


if __name__ == "__main__":
    run()
