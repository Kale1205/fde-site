#!/usr/bin/env python3
"""Read-only operational reconciliation for Kale Sentinel.

This module deliberately observes existing deterministic systems. It does not
mutate order/payment/fulfillment state and does not deploy Cloudflare resources.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

ACCOUNT_ID = "77e0788b9aba13c49053ac0c37c25b67"
STAGING_KV_TITLE = "kales-fde-contact-order-status-staging"
STAGING_WORKER_HEALTH = "https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/health"
STAGING_P27 = "https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/p2-7"
STAGING_P28 = "https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/p2-8"
STAGING_SITE = "https://kales-fde-staging.pages.dev/fde-site/"
PUBLIC_EN = "https://kale1205.github.io/fde-site/"
PUBLIC_JA = "https://kale1205.github.io/fde-site/ja/"
GITHUB_REPOSITORY = "Kale1205/fde-site"
AUTO_SECURITY_WORKFLOW = "auto-security-audit.yml"

ELIGIBLE_EXPIRY_STATUSES = {"order_received", "billing_preparation", "awaiting_payment"}
PAID_OR_DELIVERY_STATUSES = {"payment_confirmed", "preparing_delivery", "delivered"}
QUOTE_STUCK_GRACE = dt.timedelta(hours=2)
AUDIT_PENDING_GRACE = dt.timedelta(hours=2)
STRIPE_PROCESSING_STUCK = dt.timedelta(minutes=30)
ACTIONS_STUCK = dt.timedelta(hours=1)
AUTO_SECURITY_MAX_AGE = dt.timedelta(hours=30)


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def parse_time(value) -> dt.datetime | None:
    if not value:
        return None
    try:
        text = str(value).strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        parsed = dt.datetime.fromisoformat(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)
    except (TypeError, ValueError):
        return None


def fingerprint(value: object) -> str:
    raw = str(value or "unknown").encode("utf-8", "replace")
    return hashlib.sha256(raw).hexdigest()[:10]


def finding(severity: str, code: str, source: str, detail: str) -> dict:
    return {
        "severity": severity,
        "code": code,
        "source": source,
        "detail": detail,
    }


def verdict_for(findings: list[dict]) -> str:
    severities = {item.get("severity") for item in findings}
    if "blocked" in severities:
        return "BLOCKED"
    if "incident" in severities:
        return "INCIDENT"
    if "warning" in severities:
        return "DEGRADED"
    return "HEALTHY"


def _record_ref(record: dict, fallback: str) -> str:
    return fingerprint(record.get("stagingOrderId") or record.get("eventId") or fallback)


def _truthy_safety_flag(order: dict, name: str) -> bool:
    fulfillment = order.get("fulfillment") if isinstance(order.get("fulfillment"), dict) else {}
    manifest = fulfillment.get("manifest") if isinstance(fulfillment.get("manifest"), dict) else {}
    simulation = fulfillment.get("simulation") if isinstance(fulfillment.get("simulation"), dict) else {}
    return any(
        value is True
        for value in (
            order.get(name),
            fulfillment.get(name),
            manifest.get(name),
            simulation.get(name),
        )
    )


def evaluate_order_record(order: dict, *, now: dt.datetime, key: str = "fixture") -> list[dict]:
    findings: list[dict] = []
    ref = _record_ref(order, key)
    status = str(order.get("orderStatus") or "").strip()

    expires_at = parse_time(order.get("quoteExpiresAt"))
    if status in ELIGIBLE_EXPIRY_STATUSES and expires_at and now > expires_at + QUOTE_STUCK_GRACE:
        findings.append(finding(
            "incident",
            "ORDER_QUOTE_EXPIRY_STUCK",
            "staging-kv",
            f"order_ref={ref} remained {status} more than 2h after quote expiry",
        ))

    pending = order.get("auditPending")
    if isinstance(pending, dict):
        pending_at = (
            parse_time(pending.get("occurredAt"))
            or parse_time(order.get("cancelledAt"))
            or parse_time(order.get("updatedAt"))
        )
        if pending_at and now > pending_at + AUDIT_PENDING_GRACE:
            findings.append(finding(
                "incident",
                "ORDER_AUDIT_PENDING_STUCK",
                "staging-kv",
                f"order_ref={ref} retained auditPending for more than 2h",
            ))
        elif pending_at is None:
            findings.append(finding(
                "warning",
                "ORDER_AUDIT_PENDING_TIME_UNKNOWN",
                "staging-kv",
                f"order_ref={ref} has auditPending without a usable timestamp",
            ))

    if status in PAID_OR_DELIVERY_STATUSES:
        payment = order.get("payment") if isinstance(order.get("payment"), dict) else {}
        if payment.get("provider") != "stripe" or not payment.get("providerEventId") or not order.get("paymentConfirmedAt"):
            findings.append(finding(
                "incident",
                "ORDER_PAYMENT_EVIDENCE_MISSING",
                "staging-kv",
                f"order_ref={ref} status={status} lacks required Stripe payment evidence",
            ))
        eula = order.get("eulaAcceptance") if isinstance(order.get("eulaAcceptance"), dict) else {}
        if eula.get("accepted") is not True or not eula.get("acceptedAt"):
            findings.append(finding(
                "incident",
                "ORDER_EULA_EVIDENCE_MISSING",
                "staging-kv",
                f"order_ref={ref} status={status} lacks required EULA acceptance evidence",
            ))

    fulfillment = order.get("fulfillment") if isinstance(order.get("fulfillment"), dict) else {}
    if status == "preparing_delivery" and not isinstance(fulfillment.get("manifest"), dict):
        findings.append(finding(
            "incident",
            "FULFILLMENT_MANIFEST_MISSING",
            "staging-kv",
            f"order_ref={ref} preparing_delivery lacks a fulfillment manifest",
        ))
    if status == "delivered":
        simulation = fulfillment.get("simulation") if isinstance(fulfillment.get("simulation"), dict) else {}
        if simulation.get("completed") is not True or simulation.get("mode") != "staging_simulation_only":
            findings.append(finding(
                "incident",
                "DELIVERY_SIMULATION_EVIDENCE_MISSING",
                "staging-kv",
                f"order_ref={ref} delivered lacks completed staging-only simulation evidence",
            ))

    for flag in ("customerMailSent", "installerReleased", "productionDeliveryEnabled"):
        if _truthy_safety_flag(order, flag):
            findings.append(finding(
                "incident",
                "FULFILLMENT_SAFETY_FLAG_VIOLATION",
                "staging-kv",
                f"order_ref={ref} observed forbidden {flag}=true",
            ))

    return findings


def order_requires_index_check(order: dict) -> bool:
    return any(
        isinstance(order.get(field), dict)
        for field in ("paymentExpectation", "payment", "eulaAcceptance", "fulfillment")
    )


def evaluate_stripe_marker(marker: dict, *, now: dt.datetime, key: str = "fixture") -> list[dict]:
    findings: list[dict] = []
    ref = _record_ref(marker, key)
    state = str(marker.get("status") or "").strip()
    if state == "processing":
        received_at = parse_time(marker.get("receivedAt"))
        if received_at is None:
            findings.append(finding(
                "incident",
                "STRIPE_PROCESSING_TIME_INVALID",
                "staging-kv",
                f"stripe_ref={ref} processing marker has no usable receivedAt",
            ))
        elif now > received_at + STRIPE_PROCESSING_STUCK:
            findings.append(finding(
                "incident",
                "STRIPE_EVENT_PROCESSING_STUCK",
                "staging-kv",
                f"stripe_ref={ref} remained processing for more than 30m",
            ))
    elif state == "processed":
        if not (marker.get("processedAt") or marker.get("receivedAt")):
            findings.append(finding(
                "warning",
                "STRIPE_PROCESSED_TIME_MISSING",
                "staging-kv",
                f"stripe_ref={ref} processed marker lacks an observation timestamp",
            ))
    else:
        findings.append(finding(
            "incident",
            "STRIPE_EVENT_MARKER_STATE_INVALID",
            "staging-kv",
            f"stripe_ref={ref} has unsupported marker state",
        ))
    return findings


def request_bytes(url: str, *, headers: dict[str, str] | None = None, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError(f"HTTP_{response.status}")
        return response.read()


def request_json(url: str, *, headers: dict[str, str] | None = None, timeout: int = 20) -> object:
    return json.loads(request_bytes(url, headers=headers, timeout=timeout).decode("utf-8"))


def cloudflare_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def cloudflare_api_json(path: str, token: str) -> dict:
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}{path}"
    payload = request_json(url, headers=cloudflare_headers(token))
    if not isinstance(payload, dict) or payload.get("success") is not True:
        raise RuntimeError("CLOUDFLARE_API_RESPONSE_NOT_SUCCESS")
    return payload


def resolve_staging_kv_namespace(token: str) -> str:
    payload = cloudflare_api_json("/storage/kv/namespaces?per_page=100", token)
    matches = [item for item in payload.get("result", []) if item.get("title") == STAGING_KV_TITLE]
    if len(matches) != 1 or not matches[0].get("id"):
        raise RuntimeError("STAGING_KV_NAMESPACE_NOT_UNIQUE")
    return str(matches[0]["id"])


def list_kv_keys(namespace_id: str, prefix: str, token: str) -> list[str]:
    keys: list[str] = []
    cursor = None
    while True:
        query = urllib.parse.urlencode({"prefix": prefix, "limit": 1000, **({"cursor": cursor} if cursor else {})})
        payload = cloudflare_api_json(f"/storage/kv/namespaces/{namespace_id}/keys?{query}", token)
        keys.extend(str(item.get("name")) for item in payload.get("result", []) if item.get("name"))
        info = payload.get("result_info") or {}
        cursor = info.get("cursor")
        if not cursor:
            break
    return keys


def get_kv_value(namespace_id: str, key: str, token: str) -> str | None:
    encoded = urllib.parse.quote(key, safe="")
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{namespace_id}/values/{encoded}"
    req = urllib.request.Request(url, headers=cloudflare_headers(token), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def observe_http(findings: list[dict], observations: dict) -> None:
    expected_health = {
        "ok": True,
        "staging": True,
        "dryRun": True,
        "mailDisabled": True,
        "productionImported": False,
        "kvConfigured": True,
        "turnstileConfigured": True,
    }
    expected_p2 = {
        "quoteExpiryEnabled": True,
        "quoteValidityDays": 7,
        "auditLogEnabled": True,
        "autoCancelEnabled": True,
        "expiryCron": "0 * * * *",
        "stripeWebhookBoundaryEnabled": True,
        "stripeCheckoutBoundaryEnabled": True,
        "eulaAcceptanceBoundaryEnabled": True,
        "p27QaEnabled": True,
        "fulfillmentBoundaryEnabled": True,
        "p28QaEnabled": True,
        "deliverySimulationOnly": True,
        "productionDeliveryEnabled": False,
        "customerFulfillmentMailEnabled": False,
        "installerDeliveryEnabled": False,
        "livePaymentsEnabled": False,
    }
    try:
        health = request_json(STAGING_WORKER_HEALTH)
        if not isinstance(health, dict):
            raise RuntimeError("STAGING_HEALTH_NOT_OBJECT")
        observations["staging_health_reachable"] = True
        for key, expected in expected_health.items():
            if health.get(key) != expected:
                findings.append(finding("incident", "STAGING_HEALTH_CONTRACT_MISMATCH", "cloudflare-staging", f"health.{key} expected {expected!r}"))
        p2 = health.get("p2") if isinstance(health.get("p2"), dict) else {}
        for key, expected in expected_p2.items():
            if p2.get(key) != expected:
                findings.append(finding("incident", "STAGING_P2_SAFETY_CONTRACT_MISMATCH", "cloudflare-staging", f"p2.{key} expected {expected!r}"))
        for key in ("stripeWebhookConfigured", "stripeCheckoutConfigured", "stripeCheckoutActivationEnabled"):
            if not isinstance(p2.get(key), bool):
                findings.append(finding("incident", "STAGING_P2_CONFIG_MARKER_INVALID", "cloudflare-staging", f"p2.{key} must remain boolean"))
    except Exception as error:
        observations["staging_health_reachable"] = False
        findings.append(finding("blocked", "STAGING_HEALTH_UNAVAILABLE", "cloudflare-staging", type(error).__name__))

    page_checks = (
        (STAGING_P27, "P2-7 Stripe Sandbox QA", "P27_QA_UNAVAILABLE"),
        (STAGING_P28, "P2-8 Fulfillment QA", "P28_QA_UNAVAILABLE"),
        (PUBLIC_EN, '<html lang="en"', "PUBLIC_EN_UNAVAILABLE"),
        (PUBLIC_JA, '<html lang="ja"', "PUBLIC_JA_UNAVAILABLE"),
        (STAGING_SITE, "", "STAGING_SITE_UNAVAILABLE"),
    )
    for url, marker, code in page_checks:
        try:
            text = request_bytes(url).decode("utf-8", "replace")
            if marker and marker not in text:
                raise RuntimeError("EXPECTED_MARKER_MISSING")
        except Exception as error:
            findings.append(finding("blocked", code, "http", type(error).__name__))


def observe_cloudflare_kv(findings: list[dict], observations: dict, *, token: str, now: dt.datetime) -> None:
    try:
        namespace_id = resolve_staging_kv_namespace(token)
    except Exception as error:
        findings.append(finding("blocked", "STAGING_KV_READ_UNAVAILABLE", "cloudflare-kv", type(error).__name__))
        return

    order_keys = list_kv_keys(namespace_id, "staging:order:", token)
    stripe_keys = list_kv_keys(namespace_id, "staging:stripe-event:", token)
    observations["staging_order_records"] = len(order_keys)
    observations["staging_stripe_event_markers"] = len(stripe_keys)

    invalid_orders = 0
    for key in order_keys:
        raw = get_kv_value(namespace_id, key, token)
        if raw is None:
            continue
        try:
            order = json.loads(raw)
            if not isinstance(order, dict):
                raise ValueError("not object")
        except (json.JSONDecodeError, ValueError):
            invalid_orders += 1
            findings.append(finding("incident", "ORDER_RECORD_INVALID_JSON", "staging-kv", f"record_ref={fingerprint(key)} invalid JSON/object"))
            continue

        findings.extend(evaluate_order_record(order, now=now, key=key))
        if order_requires_index_check(order):
            order_id = str(order.get("stagingOrderId") or "").strip()
            if not order_id:
                findings.append(finding("incident", "ORDER_ID_MISSING", "staging-kv", f"record_ref={fingerprint(key)} payment-integrated order lacks stagingOrderId"))
            else:
                index_key = f"staging:order-id:{order_id}"
                indexed = get_kv_value(namespace_id, index_key, token)
                if indexed != key:
                    findings.append(finding("incident", "ORDER_INDEX_MISMATCH", "staging-kv", f"order_ref={fingerprint(order_id)} index does not point to canonical record"))

    invalid_markers = 0
    for key in stripe_keys:
        raw = get_kv_value(namespace_id, key, token)
        if raw is None:
            continue
        try:
            marker = json.loads(raw)
            if not isinstance(marker, dict):
                raise ValueError("not object")
        except (json.JSONDecodeError, ValueError):
            invalid_markers += 1
            findings.append(finding("incident", "STRIPE_MARKER_INVALID_JSON", "staging-kv", f"record_ref={fingerprint(key)} invalid JSON/object"))
            continue
        findings.extend(evaluate_stripe_marker(marker, now=now, key=key))

    observations["invalid_order_records"] = invalid_orders
    observations["invalid_stripe_markers"] = invalid_markers


def github_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "baked-kale-sentinel",
    }


def observe_github_actions(findings: list[dict], observations: dict, *, token: str, now: dt.datetime) -> None:
    if not token:
        findings.append(finding("blocked", "GITHUB_ACTIONS_TOKEN_UNAVAILABLE", "github-actions", "GITHUB_TOKEN not available"))
        return
    base = f"https://api.github.com/repos/{GITHUB_REPOSITORY}"
    try:
        runs = request_json(f"{base}/actions/runs?per_page=50", headers=github_headers(token))
        workflow_runs = runs.get("workflow_runs", []) if isinstance(runs, dict) else []
        stuck = 0
        for run in workflow_runs:
            if run.get("status") not in {"queued", "in_progress", "waiting", "requested", "pending"}:
                continue
            started = parse_time(run.get("run_started_at") or run.get("created_at"))
            if started and now > started + ACTIONS_STUCK:
                stuck += 1
                findings.append(finding(
                    "incident",
                    "GITHUB_ACTIONS_RUN_STUCK",
                    "github-actions",
                    f"workflow={str(run.get('name') or 'unknown')[:80]} run={run.get('run_number')} active for >1h",
                ))
        observations["github_active_run_stuck_count"] = stuck
    except Exception as error:
        findings.append(finding("blocked", "GITHUB_ACTIONS_RECONCILIATION_UNAVAILABLE", "github-actions", type(error).__name__))

    try:
        data = request_json(
            f"{base}/actions/workflows/{AUTO_SECURITY_WORKFLOW}/runs?branch=main&per_page=10",
            headers=github_headers(token),
        )
        runs = data.get("workflow_runs", []) if isinstance(data, dict) else []
        completed = [run for run in runs if run.get("status") == "completed"]
        if not completed:
            findings.append(finding("blocked", "AUTO_SECURITY_RUN_NOT_FOUND", "github-actions", "no completed Auto Security run on main"))
            return
        latest = completed[0]
        completed_at = parse_time(latest.get("updated_at") or latest.get("run_started_at") or latest.get("created_at"))
        observations["auto_security_latest_conclusion"] = str(latest.get("conclusion") or "unknown")
        observations["auto_security_latest_run_number"] = latest.get("run_number")
        if latest.get("conclusion") != "success":
            findings.append(finding("incident", "AUTO_SECURITY_LATEST_NOT_SUCCESS", "github-actions", f"latest completed run conclusion={latest.get('conclusion')}"))
        if completed_at is None:
            findings.append(finding("blocked", "AUTO_SECURITY_COMPLETION_TIME_INVALID", "github-actions", "latest completed run has invalid timestamp"))
        elif now > completed_at + AUTO_SECURITY_MAX_AGE:
            findings.append(finding("incident", "AUTO_SECURITY_STALE", "github-actions", "latest completed Auto Security run is older than 30h"))
    except Exception as error:
        findings.append(finding("blocked", "AUTO_SECURITY_OBSERVATION_UNAVAILABLE", "github-actions", type(error).__name__))


def render_markdown(report: dict) -> str:
    lines = [
        "# Kale Sentinel Operational Report",
        "",
        f"- Generated: `{report['generatedAt']}`",
        f"- Verdict: **{report['verdict']}**",
        f"- Incidents: {report['summary']['incident']}",
        f"- Blocked observations: {report['summary']['blocked']}",
        f"- Warnings: {report['summary']['warning']}",
        "",
        "## Aggregate observations",
        "",
    ]
    for key, value in sorted(report.get("observations", {}).items()):
        lines.append(f"- `{key}`: `{html.escape(str(value))}`")
    lines.extend(["", "## Findings", ""])
    if not report["findings"]:
        lines.append("- None")
    else:
        for item in report["findings"]:
            lines.append(f"- **{item['severity'].upper()}** `{item['code']}` ({item['source']}): {html.escape(item['detail'])}")
    lines.extend([
        "",
        "> This report contains operational evidence only. It does not authorize remediation, state changes, deployment, merge, release, payment, fulfillment, or customer communication.",
        "",
    ])
    return "\n".join(lines)


def build_report(findings: list[dict], observations: dict, *, now: dt.datetime) -> dict:
    counts = {severity: sum(1 for item in findings if item.get("severity") == severity) for severity in ("incident", "blocked", "warning")}
    return {
        "schemaVersion": 1,
        "generatedAt": now.isoformat().replace("+00:00", "Z"),
        "verdict": verdict_for(findings),
        "summary": counts,
        "observations": observations,
        "findings": findings,
        "authorityBoundary": "evidence_only_no_remediation_authority",
    }


def write_report(report: dict, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "kale-sentinel-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (output_dir / "kale-sentinel-report.md").write_text(render_markdown(report), encoding="utf-8")


def run_live(output_dir: Path) -> int:
    now = utc_now()
    findings: list[dict] = []
    observations: dict = {}
    cloudflare_token = os.environ.get("CLOUDFLARE_SENTINEL_TOKEN", "").strip()
    github_token = os.environ.get("GITHUB_TOKEN", "").strip()

    if not cloudflare_token:
        findings.append(finding("blocked", "CLOUDFLARE_SENTINEL_TOKEN_UNAVAILABLE", "cloudflare-kv", "dedicated read-only token is not configured"))
    else:
        try:
            observe_cloudflare_kv(findings, observations, token=cloudflare_token, now=now)
        except Exception as error:
            findings.append(finding("blocked", "CLOUDFLARE_KV_OBSERVATION_FAILED", "cloudflare-kv", type(error).__name__))

    observe_http(findings, observations)
    observe_github_actions(findings, observations, token=github_token, now=now)

    report = build_report(findings, observations, now=now)
    write_report(report, output_dir)
    print(f"Kale Sentinel verdict: {report['verdict']} (incidents={report['summary']['incident']}, blocked={report['summary']['blocked']}, warnings={report['summary']['warning']})")
    return 1 if report["verdict"] in {"INCIDENT", "BLOCKED"} else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Kale Sentinel read-only operational probe")
    parser.add_argument("--live", action="store_true", help="Run live read-only observations")
    parser.add_argument("--output", default="sentinel-report", help="Report output directory")
    args = parser.parse_args()
    if not args.live:
        parser.error("--live is required for the operational probe; use test_p3_sentinel_rules.py for fixture tests")
    return run_live(Path(args.output))


if __name__ == "__main__":
    sys.exit(main())
