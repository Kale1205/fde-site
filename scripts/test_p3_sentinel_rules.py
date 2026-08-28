#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import kale_sentinel_probe as sentinel  # noqa: E402

NOW = dt.datetime(2026, 8, 28, 4, 0, tzinfo=dt.timezone.utc)


def codes(findings):
    return {item["code"] for item in findings}


def healthy_paid_order(status="payment_confirmed"):
    order = {
        "staging": True,
        "dryRun": True,
        "stagingOrderId": "fixture-order-1",
        "orderStatus": status,
        "quoteExpiresAt": "2026-08-27T00:00:00Z",
        "paymentExpectation": {"provider": "stripe"},
        "payment": {"provider": "stripe", "providerEventId": "evt_fixture"},
        "paymentConfirmedAt": "2026-08-28T02:00:00Z",
        "eulaAcceptance": {"accepted": True, "acceptedAt": "2026-08-28T01:30:00Z"},
        "fulfillment": {},
    }
    if status == "preparing_delivery":
        order["fulfillment"] = {
            "manifest": {
                "mode": "staging_simulation_only",
                "customerMailSent": False,
                "installerReleased": False,
                "productionDeliveryEnabled": False,
            }
        }
    if status == "delivered":
        order["fulfillment"] = {
            "manifest": {
                "mode": "staging_simulation_only",
                "customerMailSent": False,
                "installerReleased": False,
                "productionDeliveryEnabled": False,
            },
            "simulation": {
                "completed": True,
                "mode": "staging_simulation_only",
                "customerMailSent": False,
                "installerReleased": False,
                "productionDeliveryEnabled": False,
            },
        }
    return order


def run():
    # Sentinel must not invent a time SLA for ordinary awaiting_payment.
    waiting = {
        "stagingOrderId": "waiting",
        "orderStatus": "awaiting_payment",
        "quoteExpiresAt": "2026-08-28T12:00:00Z",
    }
    assert not sentinel.evaluate_order_record(waiting, now=NOW)

    expired = {
        "stagingOrderId": "expired",
        "orderStatus": "awaiting_payment",
        "quoteExpiresAt": "2026-08-28T00:30:00Z",
    }
    assert "ORDER_QUOTE_EXPIRY_STUCK" in codes(sentinel.evaluate_order_record(expired, now=NOW))

    recent_expiry = {
        "stagingOrderId": "recent-expiry",
        "orderStatus": "awaiting_payment",
        "quoteExpiresAt": "2026-08-28T03:00:00Z",
    }
    assert "ORDER_QUOTE_EXPIRY_STUCK" not in codes(sentinel.evaluate_order_record(recent_expiry, now=NOW))

    audit_pending = {
        "stagingOrderId": "audit-pending",
        "orderStatus": "cancelled",
        "auditPending": {"action": "quote_expired", "occurredAt": "2026-08-28T01:00:00Z"},
    }
    assert "ORDER_AUDIT_PENDING_STUCK" in codes(sentinel.evaluate_order_record(audit_pending, now=NOW))

    missing_paid = {
        "stagingOrderId": "bad-paid",
        "orderStatus": "payment_confirmed",
    }
    missing_codes = codes(sentinel.evaluate_order_record(missing_paid, now=NOW))
    assert "ORDER_PAYMENT_EVIDENCE_MISSING" in missing_codes
    assert "ORDER_EULA_EVIDENCE_MISSING" in missing_codes

    preparing = healthy_paid_order("preparing_delivery")
    assert not sentinel.evaluate_order_record(preparing, now=NOW)
    preparing["fulfillment"] = {}
    assert "FULFILLMENT_MANIFEST_MISSING" in codes(sentinel.evaluate_order_record(preparing, now=NOW))

    delivered = healthy_paid_order("delivered")
    assert not sentinel.evaluate_order_record(delivered, now=NOW)
    delivered["fulfillment"]["simulation"]["installerReleased"] = True
    delivered_codes = codes(sentinel.evaluate_order_record(delivered, now=NOW))
    assert "FULFILLMENT_SAFETY_FLAG_VIOLATION" in delivered_codes

    processing_recent = {
        "eventId": "evt_recent",
        "status": "processing",
        "receivedAt": "2026-08-28T03:45:00Z",
    }
    assert not sentinel.evaluate_stripe_marker(processing_recent, now=NOW)

    processing_stuck = {
        "eventId": "evt_stuck",
        "status": "processing",
        "receivedAt": "2026-08-28T03:00:00Z",
    }
    assert "STRIPE_EVENT_PROCESSING_STUCK" in codes(sentinel.evaluate_stripe_marker(processing_stuck, now=NOW))

    invalid_marker = {"eventId": "evt_invalid", "status": "mystery"}
    assert "STRIPE_EVENT_MARKER_STATE_INVALID" in codes(sentinel.evaluate_stripe_marker(invalid_marker, now=NOW))

    assert sentinel.verdict_for([]) == "HEALTHY"
    assert sentinel.verdict_for([sentinel.finding("warning", "W", "fixture", "x")]) == "DEGRADED"
    assert sentinel.verdict_for([sentinel.finding("incident", "I", "fixture", "x")]) == "INCIDENT"
    assert sentinel.verdict_for([sentinel.finding("blocked", "B", "fixture", "x")]) == "BLOCKED"

    # Report references are hashed; raw identifiers must not be emitted by rule findings.
    raw_id = "customer-visible-order-id-should-not-leak"
    bad = {"stagingOrderId": raw_id, "orderStatus": "payment_confirmed"}
    serialized = str(sentinel.evaluate_order_record(bad, now=NOW))
    assert raw_id not in serialized
    assert sentinel.fingerprint(raw_id) in serialized

    print("P3-4 Kale Sentinel deterministic rule tests passed.")


if __name__ == "__main__":
    run()
