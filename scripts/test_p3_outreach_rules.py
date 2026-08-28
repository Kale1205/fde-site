#!/usr/bin/env python3
from copy import deepcopy

from kale_outreach_rules import build_outreach_packet, validate_outreach_packet


def valid_source(**overrides):
    source = {
        "synthetic": True,
        "direction": "outbound_growth_draft_only",
        "factsConfirmedPublished": True,
        "usesUnpublishedOfficeDraft": False,
        "mentionsUnreleasedFeature": False,
        "containsRealRecipientData": False,
        "recipientListProvided": False,
        "channel": "email",
        "audienceType": "prospect_segment",
        "language": "en",
        "commercialLaunchReady": False,
        "ctaIntent": "view_demo",
        "ctaUrl": "https://kale1205.github.io/fde-site/demo.html",
        "audienceLabel": "small businesses evaluating inventory workflow tools",
        "sourceRefs": ["content/site-content.json"],
        "claims": [{"text": "FDE IMS is currently in development.", "sourceRef": "content/site-content.json", "supported": True}],
    }
    source.update(overrides)
    return source


packet = build_outreach_packet(valid_source())
assert packet["direction"] == "outbound_growth_draft_only"
assert packet["segmentProposal"]["state"] == "SEGMENT_PROPOSAL_ONLY_NO_REAL_RECIPIENTS"
assert packet["salesCopy"]["state"] == "DRAFT_REQUIRES_ADMIN_APPROVAL"
assert packet["execution"]["state"] == "EXECUTION_BLOCKED_UNTIL_P5_3_AND_ADMIN_APPROVAL"
assert packet["execution"]["outboundSendPerformed"] is False
assert packet["authority"]["brevoSend"] is False
assert validate_outreach_packet(packet) is True

linkedin = build_outreach_packet(valid_source(channel="linkedin_dm", language="ja", ctaIntent="contact", ctaUrl="https://kale1205.github.io/fde-site/ja/contact.html"))
assert linkedin["salesCopy"]["channel"] == "linkedin_dm"
assert linkedin["salesCopy"]["language"] == "ja"

for bad, expected in (
    ({"direction": "inbound"}, "KALE_OUTREACH_OUTBOUND_ONLY"),
    ({"factsConfirmedPublished": False}, "OUTREACH_REQUIRES_CONFIRMED_PUBLISHED_FACTS"),
    ({"usesUnpublishedOfficeDraft": True}, "UNPUBLISHED_OFFICE_DRAFT_BLOCKED"),
    ({"mentionsUnreleasedFeature": True}, "UNRELEASED_FEATURE_PROMOTION_BLOCKED"),
    ({"containsRealRecipientData": True}, "FOUNDATION_REJECTS_REAL_RECIPIENT_DATA"),
    ({"recipientListProvided": True}, "FOUNDATION_REJECTS_RECIPIENT_LISTS"),
    ({"ctaIntent": "buy_now"}, "PRE_RELEASE_TRANSACTIONAL_CTA_BLOCKED"),
):
    try:
        build_outreach_packet(valid_source(**bad))
        raise AssertionError(f"expected {expected}")
    except ValueError as exc:
        assert expected in str(exc), str(exc)

try:
    build_outreach_packet(valid_source(sourceRefs=["worker/src/index-v14.js"], claims=[{"text": "x", "sourceRef": "worker/src/index-v14.js", "supported": True}]))
    raise AssertionError("expected unapproved source")
except ValueError as exc:
    assert "UNAPPROVED_PUBLIC_SOURCE_REF" in str(exc)

try:
    build_outreach_packet(valid_source(claims=[{"text": "future feature", "sourceRef": "content/site-content.json", "supported": False}]))
    raise AssertionError("expected unsupported claim")
except ValueError as exc:
    assert "UNSUPPORTED_OR_UNPUBLISHED_OUTREACH_CLAIM" in str(exc)

try:
    build_outreach_packet(valid_source(includesCommercialOffer=True, administratorCommercialApproval=False))
    raise AssertionError("expected commercial approval block")
except ValueError as exc:
    assert "UNAPPROVED_COMMERCIAL_OFFER_BLOCKED" in str(exc)

tampered = deepcopy(packet)
tampered["authority"]["outboundSend"] = True
try:
    validate_outreach_packet(tampered)
    raise AssertionError("expected outbound send authority violation")
except ValueError as exc:
    assert "authority.outboundSend" in str(exc)

tampered2 = deepcopy(packet)
tampered2["execution"]["state"] = "READY_TO_SEND"
try:
    validate_outreach_packet(tampered2)
    raise AssertionError("expected execution gate violation")
except ValueError as exc:
    assert "P5-3" in str(exc)

print("P3-7 Kale Outreach deterministic rule tests passed.")
