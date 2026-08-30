#!/usr/bin/env python3
from __future__ import annotations

import kales_office_rules as office


def fixture(kind="mirror_release"):
    if kind == "mirror_release":
        ref = "synthetic://fde-ims/release/fixture"
        return {
            "synthetic": True,
            "direction": "public_editorial_only",
            "sourceKind": kind,
            "sourceId": "release-fixture",
            "releaseStatus": "released",
            "releaseApproved": True,
            "sourceRefs": [ref],
            "headlineJa": "合成Product News",
            "summaryJa": "合成fixtureです。",
            "claims": [{"text": "合成fixtureの確認済み事項です。", "sourceRef": ref, "supported": True}],
        }
    if kind == "guard_improvement":
        ref = "synthetic://guard/improvement/fixture"
        return {
            "synthetic": True,
            "direction": "public_editorial_only",
            "sourceKind": kind,
            "sourceId": "guard-fixture",
            "remediationStatus": "verified",
            "publicSafeInput": True,
            "sourceRefs": [ref],
            "headlineJa": "合成Development News",
            "summaryJa": "公開安全性を確認済みの合成改善情報です。",
            "claims": [{"text": "改善はsynthetic fixture上でverifiedです。", "sourceRef": ref, "supported": True}],
        }
    ref = "synthetic://public/social/fixture"
    return {
        "synthetic": True,
        "direction": "public_editorial_only",
        "sourceKind": "administrator_social",
        "sourceId": "social-fixture",
        "administratorRequested": True,
        "factsAlreadyPublic": True,
        "sourceRefs": [ref],
        "headlineJa": "合成Social content",
        "summaryJa": "すでに公開済みという前提の合成fixtureです。",
        "claims": [{"text": "このsocial fixtureは公開済み情報のみを再構成します。", "sourceRef": ref, "supported": True}],
    }


def expect_error(source, code):
    try:
        office.build_editorial_packet(source)
    except ValueError as exc:
        assert code in str(exc), (code, exc)
        return
    raise AssertionError(f"Expected error {code}")


def run():
    product = office.build_editorial_packet(fixture("mirror_release"))
    assert product["direction"] == "public_editorial_only"
    assert product["cmsDraft"]["category"] == "Product"
    assert product["cmsDraft"]["state"] == "DRAFT_REQUIRES_ADMIN_APPROVAL"
    assert product["cmsDraft"]["englishGenerationPath"] == "EXISTING_CMS_SAVE_FLOW"
    assert product["publication"]["cmsPublishPerformed"] is False
    assert product["publication"]["publicPostPerformed"] is False
    assert office.validate_editorial_packet(product)

    unreleased = fixture("mirror_release")
    unreleased["releaseStatus"] = "candidate"
    expect_error(unreleased, "UNRELEASED_PRODUCT_NEWS_BLOCKED")

    development = office.build_editorial_packet(fixture("guard_improvement"))
    assert development["cmsDraft"]["category"] == "Development"
    assert "Secrets" in development["cmsDraft"]["bodyJa"]
    assert office.validate_editorial_packet(development)

    unverified = fixture("guard_improvement")
    unverified["remediationStatus"] = "open"
    expect_error(unverified, "UNVERIFIED_GUARD_IMPROVEMENT_BLOCKED")

    sensitive = fixture("guard_improvement")
    sensitive["publicSafeInput"] = False
    expect_error(sensitive, "SENSITIVE_SECURITY_DETAIL_BLOCKED")

    social = office.build_editorial_packet(fixture("administrator_social"))
    assert social["cmsDraft"]["category"] == "Social"
    assert social["authority"]["outboundCampaign"] is False
    assert office.validate_editorial_packet(social)

    social_without_request = fixture("administrator_social")
    social_without_request["administratorRequested"] = False
    expect_error(social_without_request, "ADMIN_REQUEST_REQUIRED_FOR_SOCIAL")

    private_fact_social = fixture("administrator_social")
    private_fact_social["factsAlreadyPublic"] = False
    expect_error(private_fact_social, "SOCIAL_REQUIRES_ALREADY_PUBLIC_FACTS")

    unsupported = fixture("mirror_release")
    unsupported["claims"][0]["supported"] = False
    expect_error(unsupported, "UNSUPPORTED_EDITORIAL_CLAIM")

    wrong_direction = fixture("mirror_release")
    wrong_direction["direction"] = "outbound_campaign"
    expect_error(wrong_direction, "KALES_OFFICE_PUBLIC_EDITORIAL_ONLY")

    real_input = fixture("mirror_release")
    real_input["synthetic"] = False
    expect_error(real_input, "FOUNDATION_DRY_RUN_REQUIRES_SYNTHETIC_INPUT")

    for key, expected in office.AUTHORITY.items():
        assert product["authority"][key] is expected

    print("P3-6 Kale’s Office deterministic rule tests passed.")


if __name__ == "__main__":
    run()
