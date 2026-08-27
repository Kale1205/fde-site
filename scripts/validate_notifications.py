from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "notify-slack-on-failure.yml"
errors = []


def fail(message):
    errors.append(message)


if not WORKFLOW.exists():
    fail("Slack failure notification workflow is missing")
    text = ""
else:
    text = WORKFLOW.read_text(encoding="utf-8")

required_markers = (
    "name: Notify Slack on workflow failure",
    "workflow_run:",
    "workflow_dispatch:",
    "- PR checks",
    "- Deploy Cloudflare Worker",
    "- Deploy staging environment",
    "- Sync site build version",
    "- Auto Security audit",
    "github.event.workflow_run.conclusion == 'failure'",
    "github.event.workflow_run.conclusion == 'timed_out'",
    "github.event.workflow_run.conclusion == 'action_required'",
    "SLACK_FDE_WORK_AGENTS_WEBHOOK_URL",
    "curl --fail-with-body --silent --show-error",
    "Open workflow run",
)
for marker in required_markers:
    if marker not in text:
        fail(f"Slack notification workflow missing marker: {marker}")

for forbidden in (
    "hooks.slack.com/services/",
    "hooks.slack-gov.com/services/",
    "xoxb-",
    "xapp-",
):
    if forbidden in text:
        fail(f"Slack notification workflow contains a literal secret/token marker: {forbidden}")

if "Notify Slack on workflow failure" in text.split("workflows:", 1)[-1].split("types:", 1)[0] if "workflows:" in text and "types:" in text else False:
    fail("Slack notification workflow must not monitor itself")

if errors:
    print("Notification validation failed:\n")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("Notification workflow validation passed.")
