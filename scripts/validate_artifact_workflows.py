"""Bounded v7 migration contract; no workflow execution or external access.

Keep the six approved artifact steps on GitHub-hosted Linux, with the same
paths, names, missing-file handling, 14-day retention and read-only permissions.
This deliberately checks our existing YAML layout without a new YAML dependency.
The P3 validators remain responsible for no-send/no-publish and other authority.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_ACTION = "actions/upload-artifact@v7"
CONTRACTS = {
    "auto-security-audit.yml": (
        "auto-security-audit-${{ github.run_id }}",
        ("path: |", "security-audit.json", "security-audit.md"), "warn"),
    "kale-desk.yml": ("kale-desk-foundation-report", ("path: desk-report/",), "ignore"),
    "kale-outreach.yml": ("kale-outreach-foundation-report", ("path: outreach-report/",), "ignore"),
    "kale-sentinel.yml": ("kale-sentinel-operational-report", ("path: sentinel-report/",), "ignore"),
    "kales-office.yml": ("kales-office-foundation-report", ("path: office-report/",), "ignore"),
    "p3-agent-governance.yml": ("p3-agent-governance-acceptance-report", ("path: governance-report/",), "ignore"),
}


def validate_workflow(filename: str, text: str) -> list[str]:
    errors = []
    name, paths, missing = CONTRACTS[filename]
    actions = re.findall(r"(?m)^\s*(?:-\s+)?uses:\s*([^\s]+)\s*$", text)
    if sorted(actions) != sorted(("actions/checkout@v7", "actions/setup-python@v7", ARTIFACT_ACTION)):
        errors.append("exact approved GitHub action refs must be retained")
    if re.findall(r"(?m)^\s*runs-on:\s*(\S+)\s*$", text) != ["ubuntu-latest"]:
        errors.append("runner must remain GitHub-hosted ubuntu-latest")
    permissions = re.findall(r"(?m)^([ ]*)permissions:\s*\n((?:[ ]+[^\n]+\n)+)", text)
    expected = ["contents: read"] + (["actions: read"] if filename == "kale-sentinel.yml" else [])
    if len(permissions) != 1 or permissions[0][0] or [line.strip() for line in permissions[0][1].splitlines()] != expected:
        errors.append("exact existing read-only permissions must be retained")
    steps = re.split(r"(?m)^      - ", text)[1:]
    uploads = [step for step in steps if re.search(r"(?m)^        uses: actions/upload-artifact@", step)]
    if len(uploads) != 1:
        errors.append("exactly one approved artifact step is required")
    else:
        lines = [line.strip() for line in uploads[0].splitlines() if line.strip()]
        expected_lines = [
            lines[0], "if: always()", f"uses: {ARTIFACT_ACTION}", "with:",
            f"name: {name}", *paths, f"if-no-files-found: {missing}", "retention-days: 14",
        ]
        if lines != expected_lines or not lines[0].startswith("name: "):
            errors.append("artifact inputs, paths, retention and archive/hidden/overwrite defaults must remain unchanged")
    return errors


def main() -> int:
    errors = []
    for filename in CONTRACTS:
        path = ROOT / ".github" / "workflows" / filename
        if not path.is_file():
            errors.append(f"{filename}: workflow missing")
        else:
            errors.extend(f"{filename}: {error}" for error in validate_workflow(filename, path.read_text(encoding="utf-8")))
    if errors:
        print("Artifact workflow migration validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print("Artifact v7 migration validated: six workflows; unchanged evidence and read-only boundaries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
