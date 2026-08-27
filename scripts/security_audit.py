from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".toml",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}
SKIP_DIRS = {".git", ".wrangler", "dist", "node_modules"}
SENSITIVE_FILE_PATTERNS = (
    re.compile(r"(^|/)\.env($|\.)", re.IGNORECASE),
    re.compile(r"(^|/)\.dev\.vars$", re.IGNORECASE),
    re.compile(r"(^|/)(id_rsa|id_ed25519)$", re.IGNORECASE),
    re.compile(r"\.(pem|p12|pfx|key)$", re.IGNORECASE),
)
SECRET_PATTERNS = (
    ("private_key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("github_classic_pat", re.compile(r"\bghp_[A-Za-z0-9]{36}\b")),
    ("github_fine_grained_pat", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{40,}\b")),
    ("stripe_secret_key", re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b")),
    ("stripe_webhook_secret", re.compile(r"\bwhsec_[A-Za-z0-9]{16,}\b")),
    ("slack_webhook", re.compile(r"https://hooks\.slack(?:-gov)?\.com/services/[A-Za-z0-9/_-]{20,}")),
    ("slack_token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    ("brevo_api_key", re.compile(r"\bxkeysib-[A-Za-z0-9_-]{24,}\b")),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
)
RISKY_CODE_PATTERNS = (
    ("javascript_eval", re.compile(r"\beval\s*\(")),
    ("javascript_new_function", re.compile(r"\bnew\s+Function\s*\(")),
    ("csp_unsafe_eval", re.compile(r"unsafe-eval", re.IGNORECASE)),
)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def is_skipped(path: Path) -> bool:
    try:
        parts = path.relative_to(ROOT).parts
    except ValueError:
        return True
    return any(part in SKIP_DIRS for part in parts)


def iter_files():
    for path in ROOT.rglob("*"):
        if not path.is_file() or is_skipped(path):
            continue
        yield path


def read_text(path: Path) -> str | None:
    if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {".gitignore", ".nojekyll"}:
        return None
    try:
        if path.stat().st_size > 2 * 1024 * 1024:
            return None
        return path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def add_finding(findings, severity: str, code: str, path: str, detail: str):
    findings.append({
        "severity": severity,
        "code": code,
        "path": path,
        "detail": detail,
    })


def run_audit():
    findings = []
    scanned_text_files = 0

    for path in iter_files():
        relative = rel(path)
        for pattern in SENSITIVE_FILE_PATTERNS:
            if pattern.search(relative):
                add_finding(
                    findings,
                    "critical",
                    "sensitive_file_tracked",
                    relative,
                    "A secret-bearing filename is present in the checked-out repository tree.",
                )
                break

        text = read_text(path)
        if text is None:
            continue
        scanned_text_files += 1

        for code, pattern in SECRET_PATTERNS:
            match = pattern.search(text)
            if match:
                add_finding(
                    findings,
                    "critical",
                    code,
                    relative,
                    "A value matching a high-confidence credential pattern was found. Rotate it if real and remove it from Git history.",
                )

        if path.suffix.lower() in {".js", ".mjs", ".html"}:
            for code, pattern in RISKY_CODE_PATTERNS:
                if pattern.search(text):
                    add_finding(
                        findings,
                        "warning",
                        code,
                        relative,
                        "Review this dynamic-code pattern manually before production use.",
                    )

    versioned_workers = sorted((ROOT / "worker" / "src").glob("index-v*.js"))
    if len(versioned_workers) > 3:
        add_finding(
            findings,
            "warning",
            "versioned_worker_accumulation",
            "worker/src/",
            f"{len(versioned_workers)} versioned Worker entry files remain. Confirm which are active and remove obsolete runtime files only after dependency checks.",
        )

    workflows = list((ROOT / ".github" / "workflows").glob("*.yml")) + list((ROOT / ".github" / "workflows").glob("*.yaml"))
    codeql_configured = any("codeql" in path.name.lower() for path in workflows)
    dependabot_configured = (ROOT / ".github" / "dependabot.yml").exists() or (ROOT / ".github" / "dependabot.yaml").exists()

    critical_count = sum(item["severity"] == "critical" for item in findings)
    warning_count = sum(item["severity"] == "warning" for item in findings)

    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "root": str(ROOT),
        "scannedTextFiles": scanned_text_files,
        "criticalCount": critical_count,
        "warningCount": warning_count,
        "findings": findings,
        "coverage": {
            "highConfidenceSecretPatterns": True,
            "sensitiveTrackedFilenames": True,
            "riskyDynamicJavaScriptPatterns": True,
            "versionedWorkerAccumulation": True,
            "codeqlConfigured": codeql_configured,
            "dependabotConfigured": dependabot_configured,
        },
        "policy": {
            "productionWrites": False,
            "automaticFixes": False,
            "automaticMerges": False,
            "failOnCritical": True,
        },
    }


def render_markdown(report: dict) -> str:
    lines = [
        "# Baked Kale Auto Security audit",
        "",
        f"- Critical: **{report['criticalCount']}**",
        f"- Warnings: **{report['warningCount']}**",
        f"- Text files scanned: **{report['scannedTextFiles']}**",
        f"- CodeQL configured: **{str(report['coverage']['codeqlConfigured']).lower()}**",
        f"- Dependabot configured: **{str(report['coverage']['dependabotConfigured']).lower()}**",
        "- Automatic fixes / merges / production writes: **disabled**",
        "",
        "## Findings",
    ]
    if not report["findings"]:
        lines.append("No findings.")
    else:
        for item in report["findings"]:
            lines.append(
                f"- **{item['severity'].upper()}** `{item['code']}` — `{item['path']}`: {item['detail']}"
            )
    lines += [
        "",
        "## Scope",
        "This P3-1 audit is intentionally read-only. Critical findings fail CI so the existing Slack failure notification can alert the operator. Warnings are review candidates and do not change production automatically.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only Baked Kale repository security audit")
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--markdown-out", type=Path)
    args = parser.parse_args()

    report = run_audit()
    markdown = render_markdown(report)

    print(markdown)
    if args.json_out:
        args.json_out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if args.markdown_out:
        args.markdown_out.write_text(markdown, encoding="utf-8")

    return 1 if report["criticalCount"] else 0


if __name__ == "__main__":
    sys.exit(main())
