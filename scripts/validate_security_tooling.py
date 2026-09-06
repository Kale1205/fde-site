from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
CODEQL = ROOT / ".github" / "workflows" / "codeql.yml"
DEPENDABOT = ROOT / ".github" / "dependabot.yml"
NOTIFIER = ROOT / ".github" / "workflows" / "notify-slack-on-failure.yml"
PR_CHECKS = ROOT / ".github" / "workflows" / "pr-checks.yml"
PACKAGE_JSON = ROOT / "package.json"
WORKFLOWS = ROOT / ".github" / "workflows"

errors = []


def fail(message):
    errors.append(message)


def read_text(path):
    if not path.exists():
        fail(f"Required file is missing: {path.relative_to(ROOT)}")
        return ""
    return path.read_text(encoding="utf-8")


codeql = read_text(CODEQL)
dependabot = read_text(DEPENDABOT)
notifier = read_text(NOTIFIER)
pr_checks = read_text(PR_CHECKS)

for marker in (
    "name: CodeQL security analysis",
    "push:",
    "pull_request:",
    "schedule:",
    "workflow_dispatch:",
    "- main",
    "security-events: write",
    "contents: read",
    "actions: read",
    "javascript-typescript",
    "python",
    "build-mode: ${{ matrix.build-mode }}",
    "github/codeql-action/init@v4",
    "github/codeql-action/analyze@v4",
):
    if marker not in codeql:
        fail(f"CodeQL workflow missing marker: {marker}")

if "cron: '17 3 * * 1'" not in codeql:
    fail("CodeQL workflow must retain the approved weekly schedule")

uses = set(re.findall(r"uses:\s*([^\s]+)", codeql))
allowed_actions = {
    "actions/checkout@v4",
    "github/codeql-action/init@v4",
    "github/codeql-action/analyze@v4",
}
if uses != allowed_actions:
    fail(f"CodeQL workflow actions differ from the approved GitHub-only set: {sorted(uses)}")

for forbidden in (
    "contents: write",
    "deployments: write",
    "id-token: write",
    "issues: write",
    "packages: write",
    "pull-requests: write",
    "wrangler",
    "cloudflare",
    "secrets.",
    "gh pr merge",
    "merge_pull_request",
):
    if forbidden in codeql.lower():
        fail(f"CodeQL workflow contains forbidden production/authority marker: {forbidden}")

if not any(ROOT.rglob("*.js")):
    fail("JavaScript source is not present; javascript-typescript CodeQL entry is not justified")
if not any(ROOT.rglob("*.py")):
    fail("Python source is not present; python CodeQL entry is not justified")

if not PACKAGE_JSON.exists():
    fail("package.json is missing; npm Dependabot ecosystem is not justified")
else:
    try:
        json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"package.json is invalid JSON: {exc}")

workflow_files = list(WORKFLOWS.glob("*.yml")) + list(WORKFLOWS.glob("*.yaml"))
if not workflow_files:
    fail("GitHub Actions workflows are missing; github-actions Dependabot ecosystem is not justified")

if "version: 2" not in dependabot:
    fail("Dependabot config must use version 2 syntax")

ecosystems = re.findall(r'package-ecosystem:\s*["\']([^"\']+)["\']', dependabot)
if set(ecosystems) != {"npm", "github-actions"} or len(ecosystems) != 2:
    fail(f"Dependabot must contain exactly the verified npm and github-actions ecosystems: {ecosystems}")

if dependabot.count('directory: "/"') != 2:
    fail("Each Dependabot ecosystem must target the repository root")
if dependabot.count('interval: "weekly"') != 2:
    fail("Each Dependabot ecosystem must use a weekly update schedule")
if dependabot.count("open-pull-requests-limit: 3") != 2:
    fail("Dependabot PR volume limits must remain at 3 per ecosystem")
if dependabot.count("applies-to: version-updates") != 2:
    fail("Dependabot grouping must be limited to version updates")
if dependabot.count('- "minor"') != 2 or dependabot.count('- "patch"') != 2:
    fail("Dependabot minor/patch grouping is incomplete")
if '- "major"' in dependabot:
    fail("Major Dependabot updates must not be included in grouped update rules")
if "auto-merge" in dependabot.lower() or "automerge" in dependabot.lower():
    fail("Dependabot configuration must not enable auto-merge")

if "- CodeQL security analysis" not in notifier:
    fail("Slack failure notifier must monitor CodeQL workflow failures")
if "python scripts/validate_security_tooling.py" not in pr_checks:
    fail("PR checks must execute the security tooling validator")

if errors:
    print("Security tooling validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("Security tooling validation passed.")
print("- CodeQL: JavaScript/TypeScript + Python, GitHub actions only, no production authority")
print("- Dependabot: npm + GitHub Actions, weekly, bounded PR volume, no auto-merge")
print("- Slack: workflow failures monitored; warning-only Auto Security behavior remains unchanged")
