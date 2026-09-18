"""Shared sitemap structure and Git-history helpers."""

from dataclasses import dataclass
from datetime import date
from pathlib import Path
import re
import subprocess


BASE_URL = "https://kale1205.github.io/fde-site"
SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml"
LASTMOD_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")


@dataclass(frozen=True)
class SitemapPage:
    html_path: str
    url: str


@dataclass(frozen=True)
class SitemapPair:
    en: SitemapPage
    ja: SitemapPage
    changefreq: str
    priority: str

    @property
    def pages(self):
        return (self.en, self.ja)

    @property
    def alternates(self):
        return (
            ("en", self.en.url),
            ("ja", self.ja.url),
            ("x-default", self.en.url),
        )


def _pair(name, changefreq, priority):
    if name == "index.html":
        en_url = f"{BASE_URL}/"
        ja_url = f"{BASE_URL}/ja/"
    else:
        en_url = f"{BASE_URL}/{name}"
        ja_url = f"{BASE_URL}/ja/{name}"
    return SitemapPair(
        en=SitemapPage(name, en_url),
        ja=SitemapPage(f"ja/{name}", ja_url),
        changefreq=changefreq,
        priority=priority,
    )


# Keep this order aligned with the established sitemap and Search Console URLs.
SITEMAP_PAIRS = (
    _pair("index.html", "weekly", "1.0"),
    _pair("one-time-purchase-inventory-software.html", "monthly", "0.9"),
    _pair("inventory-software-with-source-code.html", "monthly", "0.9"),
    _pair("self-hosted-inventory-management-software.html", "monthly", "0.9"),
    _pair("small-business-inventory-management-software.html", "monthly", "0.9"),
    _pair("license.html", "monthly", "0.9"),
    _pair("demo.html", "weekly", "0.8"),
    _pair("goals.html", "monthly", "0.8"),
    _pair("contact.html", "monthly", "0.7"),
    _pair("news.html", "weekly", "0.7"),
)


class GitHistoryError(RuntimeError):
    """Raised when a trustworthy page date cannot be read from Git."""


def _git_output(root, *args):
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=root,
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise GitHistoryError(f"could not run git: {exc}") from exc

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown Git error"
        raise GitHistoryError(f"git {' '.join(args)} failed: {detail}")
    return result.stdout.strip()


def require_complete_git_history(root):
    root = Path(root)
    top_level = _git_output(root, "rev-parse", "--show-toplevel")
    if Path(top_level).resolve() != root.resolve():
        raise GitHistoryError(f"{root} is not the Git repository root ({top_level})")

    shallow = _git_output(root, "rev-parse", "--is-shallow-repository")
    if shallow == "true":
        raise GitHistoryError(
            "the repository is a shallow clone; fetch complete history before generating the sitemap"
        )
    if shallow != "false":
        raise GitHistoryError(f"could not determine whether Git history is complete: {shallow!r}")


def git_last_modified(root, html_path):
    """Return the last committed change date for one tracked HTML file."""

    root = Path(root)
    _git_output(root, "ls-files", "--error-unmatch", "--", html_path)
    lastmod = _git_output(root, "log", "-1", "--format=%cs", "--", html_path)
    if not lastmod:
        raise GitHistoryError(f"no Git history found for {html_path}")
    if not LASTMOD_PATTERN.fullmatch(lastmod):
        raise GitHistoryError(f"unexpected Git date for {html_path}: {lastmod!r}")
    try:
        date.fromisoformat(lastmod)
    except ValueError as exc:
        raise GitHistoryError(f"invalid Git date for {html_path}: {lastmod!r}") from exc
    return lastmod
