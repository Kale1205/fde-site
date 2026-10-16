"""Offline cache-sync integration: commit every rewritten CMS module together."""
import re
import shlex
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class BuildSyncTests(unittest.TestCase):
    def test_workflow_stages_all_rewritten_runtime_imports(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory)
            (fixture / "scripts").mkdir()
            shutil.copy(ROOT / "scripts/sync_build_version.py", fixture / "scripts/")
            (fixture / "build-version.txt").write_text("fixture-before\n")
            for folder in (fixture, fixture / "ja", fixture / "zh"):
                folder.mkdir(exist_ok=True)
                (folder / "contact.html").write_text('<script src="cms-admin-loader.js?v=fixture-before"></script>')
            runtimes = ("contact-config.js", "cms-admin.js", "cms-news-workflow.js", "news-renderer.js", "cms-faq-workflow.js", "faq-admin-safe.js")
            for name in runtimes:
                # Use the real module imports, including transitive FAQ imports.
                shutil.copy(ROOT / name, fixture / name)
            (fixture / "content").mkdir()
            protected = fixture / "content/faq-content.json"
            protected.write_text('{"faq":[{"id":"synthetic-preserve"}]}\n')
            original_content = protected.read_bytes()

            def git(*args):
                return subprocess.run(["git", *args], cwd=fixture, check=True, capture_output=True, text=True).stdout

            git("init", "-q")
            git("add", ".")
            git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture baseline")
            (fixture / "build-version.txt").write_text("fixture-after\n")
            subprocess.run(["python3", "scripts/sync_build_version.py"], cwd=fixture, check=True, capture_output=True)
            rewritten = set(git("diff", "--name-only").splitlines())
            self.assertIn("cms-faq-workflow.js", rewritten)
            self.assertIn("faq-admin-safe.js", rewritten)
            for name in runtimes:
                source = (fixture / name).read_text()
                versions = re.findall(r"[\w./-]+\.(?:js|css)\?v=([\w.-]+)", source)
                self.assertTrue(versions, name)
                self.assertEqual(set(versions), {"fixture-after"}, name)

            workflow = (ROOT / ".github/workflows/cache-bust-styles.yml").read_text()
            command = next(line.strip() for line in workflow.splitlines() if line.strip().startswith("git add build-version.txt "))
            git(*shlex.split(command)[1:])
            staged = set(git("diff", "--cached", "--name-only").splitlines())
            self.assertEqual(staged, rewritten)
            self.assertEqual(git("diff", "--name-only"), "")
            self.assertEqual(protected.read_bytes(), original_content)
            self.assertNotIn("content/faq-content.json", staged)


if __name__ == "__main__":
    unittest.main()
