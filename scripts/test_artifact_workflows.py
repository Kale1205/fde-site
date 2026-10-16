"""Offline mutation tests: only approved artifact migration may pass."""
import contextlib
import io
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch

from validate_artifact_workflows import CONTRACTS, ROOT, validate_workflow


class ArtifactWorkflowTests(unittest.TestCase):
    def test_approved_workflows(self):
        for name in CONTRACTS:
            with self.subTest(workflow=name):
                self.assertEqual(validate_workflow(name, self.read(name)), [])

    @staticmethod
    def read(name):
        return (ROOT / ".github" / "workflows" / name).read_text(encoding="utf-8")

    def test_rejects_artifact_and_authority_mutations(self):
        mutations = [
            ("actions/upload-artifact@v7", "actions/upload-artifact@v4"),
            ("actions/upload-artifact@v7", "actions/upload-artifact@v70"),
            ("actions/upload-artifact@v7", "actions/upload-artifact@main"),
            ("actions/upload-artifact@v7", "unknown/upload-artifact@v7"),
            ("actions/setup-python@v7", "unknown/setup-python@v7"),
            ("retention-days: 14", "retention-days: 90"),
            ("contents: read", "contents: write"),
            ("contents: read", "contents: read\n  issues: write"),
            ("runs-on: ubuntu-latest", "runs-on: self-hosted"),
            ("retention-days: 14", "retention-days: 14\n          archive: false"),
            ("retention-days: 14", "retention-days: 14\n          include-hidden-files: true"),
            ("retention-days: 14", "retention-days: 14\n          overwrite: true"),
            ("if: always()", "if: success()"),
        ]
        for name in CONTRACTS:
            original = self.read(name)
            for old, new in mutations:
                with self.subTest(workflow=name, change=new):
                    self.assertIn(old, original)
                    self.assertTrue(validate_workflow(name, original.replace(old, new)))
            for replacement in ("path: /tmp/", "path: .", "path: ${{ github.workspace }}/"):
                with self.subTest(workflow=name, path=replacement):
                    old = CONTRACTS[name][1][0]
                    self.assertTrue(validate_workflow(name, original.replace(old, replacement)))

    def test_existing_p3_no_send_no_publish_checks_remain_effective(self):
        validators = {
            "kale-desk.yml": "validate_p3_desk.py",
            "kale-outreach.yml": "validate_p3_outreach.py",
            "kales-office.yml": "validate_p3_office.py",
            "kale-sentinel.yml": "validate_p3_sentinel.py",
            "auto-security-audit.yml": "validate_p3_security.py",
        }
        original_read = Path.read_text
        for workflow, validator in validators.items():
            target = ROOT / ".github" / "workflows" / workflow
            for marker in (None, "git push", "gh pr merge", "contents: write", "deployments: write"):
                text = self.read(workflow)
                if marker:
                    text += f"\n      - name: Unsafe mutation\n        run: {marker}\n"

                def fixture_read(path, *args, **kwargs):
                    return text if path == target else original_read(path, *args, **kwargs)

                with self.subTest(workflow=workflow, forbidden=marker), patch.object(Path, "read_text", fixture_read), contextlib.redirect_stdout(io.StringIO()):
                    if marker:
                        with self.assertRaises(SystemExit) as raised:
                            runpy.run_path(str(ROOT / "scripts" / validator), run_name="__main__")
                        self.assertEqual(raised.exception.code, 1)
                    else:
                        runpy.run_path(str(ROOT / "scripts" / validator), run_name="__main__")


if __name__ == "__main__":
    unittest.main()
