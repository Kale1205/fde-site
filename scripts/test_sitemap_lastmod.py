#!/usr/bin/env python3
"""Regression tests for substantive sitemap lastmod updates."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from generate_sitemap import generate_files
from sitemap_config import (
    SITEMAP_HTML_PATHS,
    load_lastmod_manifest,
    render_sitemap,
    serialize_lastmod_manifest,
    validate_sitemap_state,
)


BASE_DATE = "2026-09-15"
CONTENT_DATE = "2026-09-16"
CACHE_DATE = "2026-09-17"
SQUASH_DATE = "2026-09-18"


class TemporarySitemapRepository:
    def __init__(self):
        self.tempdir = tempfile.TemporaryDirectory(prefix="fde-sitemap-lastmod-")
        self.root = Path(self.tempdir.name)
        self.git("init", "--initial-branch=main")
        self.git("config", "user.name", "Sitemap Test")
        self.git("config", "user.email", "sitemap-test@example.invalid")
        for html_path in SITEMAP_HTML_PATHS:
            path = self.root / html_path
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(self.html(html_path, "base"), encoding="utf-8")
        (self.root / "site.css").write_text("body { color: black; }\n", encoding="utf-8")
        (self.root / "site.js").write_text("console.log('base');\n", encoding="utf-8")
        lastmods = {html_path: BASE_DATE for html_path in SITEMAP_HTML_PATHS}
        (self.root / "sitemap-lastmod.json").write_text(
            serialize_lastmod_manifest(lastmods), encoding="utf-8"
        )
        (self.root / "sitemap.xml").write_text(render_sitemap(lastmods), encoding="utf-8")
        self.commit("Baseline", BASE_DATE)
        self.git("switch", "-c", "feature")

    @staticmethod
    def html(html_path, body, version="baseline"):
        return (
            '<!doctype html><html><head><link rel="stylesheet" '
            f'href="site.css?v={version}"><script src="site.js?v={version}"></script>'
            f"</head><body><main>{body}: {html_path}</main></body></html>\n"
        )

    def git(self, *args, env=None):
        result = subprocess.run(
            ["git", *args],
            cwd=self.root,
            check=True,
            capture_output=True,
            text=True,
            env=env,
        )
        return result.stdout.strip()

    def commit(self, message, day):
        self.git("add", "-A")
        commit_env = os.environ.copy()
        timestamp = f"{day}T12:00:00+09:00"
        commit_env["GIT_AUTHOR_DATE"] = timestamp
        commit_env["GIT_COMMITTER_DATE"] = timestamp
        self.git("commit", "-m", message, env=commit_env)

    def close(self):
        self.tempdir.cleanup()


class SitemapLastmodTests(unittest.TestCase):
    def setUp(self):
        self.repo = TemporarySitemapRepository()

    def tearDown(self):
        self.repo.close()

    def test_case_a_updates_only_materially_changed_html(self):
        target = "index.html"
        (self.repo.root / target).write_text(
            self.repo.html(target, "visible content changed"), encoding="utf-8"
        )
        self.repo.commit("Change homepage content", CONTENT_DATE)
        for html_path in SITEMAP_HTML_PATHS:
            path = self.repo.root / html_path
            path.write_text(
                path.read_text(encoding="utf-8").replace(
                    "?v=baseline", "?v=20260917-120000"
                ),
                encoding="utf-8",
            )
        self.repo.commit("Refresh cache keys", CACHE_DATE)

        stale, materially_changed = generate_files(self.repo.root, base_ref="main")
        lastmods = load_lastmod_manifest(self.repo.root)

        self.assertEqual(materially_changed, {target})
        self.assertEqual(set(stale), {"sitemap-lastmod.json", "sitemap.xml"})
        self.assertEqual(lastmods[target], CONTENT_DATE)
        self.assertTrue(
            all(
                lastmods[path] == BASE_DATE
                for path in SITEMAP_HTML_PATHS
                if path != target
            )
        )
        self.assertEqual(validate_sitemap_state(self.repo.root, base_ref="main"), [])

    def test_case_b_ignores_css_js_and_cache_key_only_html_changes(self):
        (self.repo.root / "site.css").write_text("body { color: green; }\n", encoding="utf-8")
        (self.repo.root / "site.js").write_text("console.log('changed');\n", encoding="utf-8")
        for html_path in SITEMAP_HTML_PATHS:
            (self.repo.root / html_path).write_text(
                self.repo.html(html_path, "base", version="20260917-120000"),
                encoding="utf-8",
            )
        self.repo.commit("Refresh assets and cache keys", CACHE_DATE)

        stale, materially_changed = generate_files(self.repo.root, base_ref="main")
        lastmods = load_lastmod_manifest(self.repo.root)

        self.assertEqual(materially_changed, set())
        self.assertEqual(stale, [])
        self.assertTrue(all(value == BASE_DATE for value in lastmods.values()))
        self.assertEqual(validate_sitemap_state(self.repo.root, base_ref="main"), [])

        incorrectly_updated = dict(lastmods)
        incorrectly_updated["index.html"] = CACHE_DATE
        (self.repo.root / "sitemap-lastmod.json").write_text(
            serialize_lastmod_manifest(incorrectly_updated), encoding="utf-8"
        )
        (self.repo.root / "sitemap.xml").write_text(
            render_sitemap(incorrectly_updated), encoding="utf-8"
        )
        errors = validate_sitemap_state(self.repo.root, base_ref="main")
        self.assertTrue(any("unchanged or cache-bust-only index.html" in error for error in errors))

    def test_case_c_squash_commit_date_does_not_replace_persisted_lastmod(self):
        target = "index.html"
        (self.repo.root / target).write_text(
            self.repo.html(target, "feature content"), encoding="utf-8"
        )
        self.repo.commit("Change homepage content", CONTENT_DATE)
        generate_files(self.repo.root, base_ref="main")
        self.repo.commit("Generate sitemap state", CONTENT_DATE)
        self.assertEqual(validate_sitemap_state(self.repo.root, base_ref="main"), [])

        self.repo.git("switch", "main")
        self.repo.git("merge", "--squash", "feature")
        self.repo.commit("Squash feature", SQUASH_DATE)

        git_date = self.repo.git("log", "-1", "--format=%cs", "--", target)
        stale, materially_changed = generate_files(self.repo.root, base_ref=None)
        lastmods = load_lastmod_manifest(self.repo.root)

        self.assertEqual(git_date, SQUASH_DATE)
        self.assertEqual(lastmods[target], CONTENT_DATE)
        self.assertEqual(materially_changed, set())
        self.assertEqual(stale, [])
        self.assertEqual(validate_sitemap_state(self.repo.root, base_ref=None), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
