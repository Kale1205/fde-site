from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "auto-security-audit.yml"
AUDIT = ROOT / "scripts" / "security_audit.py"
NOTIFY = ROOT / ".github" / "workflows" / "notify-slack-on-failure.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
errors = []


def fail(message):
    errors.append(message)


def read(path: Path, label: str) -> str:
    if not path.exists():
        fail(f"missing P3 Auto Security file: {label}")
        return ""
    return path.read_text(encoding="utf-8")


workflow = read(WORKFLOW, WORKFLOW.relative_to(ROOT).as_posix())
audit = read(AUDIT, AUDIT.relative_to(ROOT).as_posix())
notify = read(NOTIFY, NOTIFY.relative_to(ROOT).as_posix())
pr_checks = read(PR_CHECKS, PR_CHECKS.relative_to(ROOT).as_posix())

for marker in (
    "name: Auto Security audit",
    "schedule:",
    "cron: '0 0 * * *'",
    "workflow_dispatch:",
    "contents: read",
    "python scripts/security_audit.py",
    "continue-on-error: true",
    "actions/upload-artifact@v4",
    "retention-days: 14",
    "Enforce critical finding gate",
):
    if marker not in workflow:
        fail(f"Auto Security workflow missing safety marker: {marker}")

for forbidden in (
    "contents: write",
    "pull-requests: write",
    "deployments: write",
    "id-token: write",
    "secrets.",
    "wrangler",
    "git push",
    "gh pr merge",
    "merge_pull_request",
):
    if forbidden in workflow:
        fail(f"Auto Security workflow contains forbidden write/deploy marker: {forbidden}")

for marker in (
    '"productionWrites": False',
    '"automaticFixes": False',
    '"automaticMerges": False',
    '"failOnCritical": True',
    "high-confidence credential pattern",
    "versioned_worker_accumulation",
):
    if marker not in audit:
        fail(f"security audit script missing policy marker: {marker}")

if "- Auto Security audit" not in notify:
    fail("Slack failure notification must monitor Auto Security audit")

if "P3 Auto Security critical gate" not in pr_checks or "python scripts/security_audit.py" not in pr_checks:
    fail("PR checks must run the P3 Auto Security critical gate")

if errors:
    print("P3 Auto Security validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("P3 Auto Security validation passed: daily audit remains read-only and critical findings are gated.")
