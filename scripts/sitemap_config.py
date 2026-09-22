"""Shared sitemap structure, persisted lastmod state, and PR-aware validation."""

from dataclasses import dataclass
from datetime import date
import json
import os
from pathlib import Path
import re
import subprocess
from typing import Optional
import xml.etree.ElementTree as ET


BASE_URL = "https://kale1205.github.io/fde-site"
SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml"
SITEMAP_NAME = "sitemap.xml"
LASTMOD_MANIFEST_NAME = "sitemap-lastmod.json"
LASTMOD_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")
ASSET_VERSION_PATTERN = re.compile(
    r"(?P<prefix>\b(?:href|src)\s*=\s*([\"'])"
    r"(?![a-z][a-z0-9+.-]*:|//)[^\"']*?\.(?:css|js)\?v=)"
    r"[^\"'&#\s>]+",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class SitemapPage:
    html_path: str
    url: str


@dataclass(frozen=True)
class SitemapPair:
    en: SitemapPage
    ja: SitemapPage
    zh: Optional[SitemapPage]
    changefreq: str
    priority: str

    @property
    def pages(self):
        return (self.en, self.ja) + ((self.zh,) if self.zh else ())

    @property
    def alternates(self):
        alternates = (
            ("en", self.en.url),
            ("ja", self.ja.url),
        )
        if self.zh:
            alternates += (("zh-CN", self.zh.url),)
        return alternates + (("x-default", self.en.url),)


def _pair(name, changefreq, priority, include_zh=False):
    if name == "index.html":
        en_url = f"{BASE_URL}/"
        ja_url = f"{BASE_URL}/ja/"
    else:
        en_url = f"{BASE_URL}/{name}"
        ja_url = f"{BASE_URL}/ja/{name}"
    return SitemapPair(
        en=SitemapPage(name, en_url),
        ja=SitemapPage(f"ja/{name}", ja_url),
        zh=SitemapPage(f"zh/{name}", f"{BASE_URL}/zh/{name}") if include_zh else None,
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
    _pair("license.html", "monthly", "0.9", include_zh=True),
    _pair("demo.html", "weekly", "0.8"),
    _pair("goals.html", "monthly", "0.8"),
    _pair("contact.html", "monthly", "0.7"),
    _pair("news.html", "weekly", "0.7"),
)
SITEMAP_PAGES = tuple(page for pair in SITEMAP_PAIRS for page in pair.pages)
SITEMAP_HTML_PATHS = tuple(page.html_path for page in SITEMAP_PAGES)


class SitemapStateError(RuntimeError):
    """Raised when trustworthy sitemap state cannot be derived or validated."""


def _run_git(root, *args, allow_failure=False):
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
        raise SitemapStateError(f"could not run git: {exc}") from exc

    if result.returncode != 0:
        if allow_failure:
            return None
        detail = result.stderr.strip() or result.stdout.strip() or "unknown Git error"
        raise SitemapStateError(f"git {' '.join(args)} failed: {detail}")
    return result.stdout.strip()


def _valid_lastmod(value):
    if not isinstance(value, str) or not LASTMOD_PATTERN.fullmatch(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _ordered_lastmods(lastmods):
    return {path: lastmods[path] for path in SITEMAP_HTML_PATHS}


def _validate_lastmods(lastmods, source):
    if not isinstance(lastmods, dict):
        raise SitemapStateError(f"{source} must contain a JSON object")
    expected = set(SITEMAP_HTML_PATHS)
    actual = set(lastmods)
    missing = sorted(expected - actual)
    unexpected = sorted(actual - expected)
    if missing or unexpected:
        details = []
        if missing:
            details.append(f"missing {missing}")
        if unexpected:
            details.append(f"unexpected {unexpected}")
        raise SitemapStateError(f"{source} page set is invalid: {'; '.join(details)}")
    for html_path in SITEMAP_HTML_PATHS:
        if not _valid_lastmod(lastmods[html_path]):
            raise SitemapStateError(
                f"{source} has invalid YYYY-MM-DD lastmod for {html_path}: "
                f"{lastmods[html_path]!r}"
            )
    return _ordered_lastmods(lastmods)


def serialize_lastmod_manifest(lastmods):
    validated = _validate_lastmods(lastmods, LASTMOD_MANIFEST_NAME)
    return json.dumps(validated, ensure_ascii=False, indent=2) + "\n"


def load_lastmod_manifest(root):
    path = Path(root) / LASTMOD_MANIFEST_NAME
    if not path.exists():
        raise SitemapStateError(f"{LASTMOD_MANIFEST_NAME} is missing")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SitemapStateError(f"could not read {LASTMOD_MANIFEST_NAME}: {exc}") from exc
    return _validate_lastmods(value, LASTMOD_MANIFEST_NAME)


def _load_manifest_at_ref(root, ref):
    content = _run_git(root, "show", f"{ref}:{LASTMOD_MANIFEST_NAME}", allow_failure=True)
    if content is None:
        return None
    try:
        value = json.loads(content)
    except json.JSONDecodeError as exc:
        raise SitemapStateError(
            f"{ref}:{LASTMOD_MANIFEST_NAME} is not valid JSON: {exc}"
        ) from exc
    return _validate_lastmods(value, f"{ref}:{LASTMOD_MANIFEST_NAME}")


def require_complete_git_history(root):
    root = Path(root)
    top_level = _run_git(root, "rev-parse", "--show-toplevel")
    if Path(top_level).resolve() != root.resolve():
        raise SitemapStateError(f"{root} is not the Git repository root ({top_level})")

    shallow = _run_git(root, "rev-parse", "--is-shallow-repository")
    if shallow == "true":
        raise SitemapStateError(
            "the repository is a shallow clone; fetch complete history before updating lastmod"
        )
    if shallow != "false":
        raise SitemapStateError(f"could not determine whether Git history is complete: {shallow!r}")


def resolve_base_ref(root, requested=None):
    """Resolve the PR base; return None on main where persisted state is authoritative."""

    root = Path(root)
    requested = requested or os.environ.get("SITEMAP_BASE_REF")
    if not requested and os.environ.get("GITHUB_BASE_REF"):
        requested = f"origin/{os.environ['GITHUB_BASE_REF']}"
    if requested:
        return _run_git(root, "rev-parse", "--verify", f"{requested}^{{commit}}")

    branch = _run_git(root, "symbolic-ref", "--quiet", "--short", "HEAD", allow_failure=True)
    branch = branch or os.environ.get("GITHUB_REF_NAME")
    if branch in {"main", "master"}:
        return None

    if _run_git(root, "rev-parse", "--verify", "origin/main^{commit}", allow_failure=True):
        return _run_git(root, "rev-parse", "--verify", "origin/main^{commit}")
    if branch:
        raise SitemapStateError(
            f"cannot resolve the main base for branch {branch!r}; fetch origin/main or pass --base"
        )
    return None


def normalize_html_for_lastmod(content):
    """Ignore only local CSS/JS ?v= cache-key values when comparing HTML."""

    if content is None:
        return None
    return ASSET_VERSION_PATTERN.sub(
        lambda match: f"{match.group('prefix')}<build-version>",
        content,
    )


def _content_at_ref(root, ref, html_path):
    return _run_git(root, "show", f"{ref}:{html_path}", allow_failure=True)


def _ensure_indexed_html_is_committed(root):
    status = _run_git(
        root,
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        *SITEMAP_HTML_PATHS,
    )
    if status:
        raise SitemapStateError(
            "indexed HTML has uncommitted changes; commit page changes before updating lastmod"
        )


def _latest_substantive_commit_date(root, start_ref, end_ref, html_path):
    commits = _run_git(
        root,
        "rev-list",
        "--reverse",
        "--topo-order",
        f"{start_ref}..{end_ref}",
        "--",
        html_path,
    ).splitlines()
    latest_date = None
    for commit in commits:
        parents = _run_git(root, "rev-list", "--parents", "-n", "1", commit).split()
        parent = parents[1] if len(parents) > 1 else None
        before = _content_at_ref(root, parent, html_path) if parent else None
        after = _content_at_ref(root, commit, html_path)
        if normalize_html_for_lastmod(before) == normalize_html_for_lastmod(after):
            continue
        commit_date = _run_git(root, "show", "-s", "--format=%cs", commit)
        if not _valid_lastmod(commit_date):
            raise SitemapStateError(
                f"unexpected Git date for substantive {html_path} change {commit}: {commit_date!r}"
            )
        latest_date = commit_date
    if latest_date is None:
        raise SitemapStateError(
            f"{html_path} differs materially but no substantive commit was found in "
            f"{start_ref}..{end_ref}"
        )
    return latest_date


def expected_lastmods_for_base(root, base_ref, current_lastmods=None):
    """Return expected persisted dates and pages materially changed by this branch."""

    root = Path(root)
    require_complete_git_history(root)
    _ensure_indexed_html_is_committed(root)
    base_tip = _run_git(root, "rev-parse", "--verify", f"{base_ref}^{{commit}}")
    head = _run_git(root, "rev-parse", "--verify", "HEAD^{commit}")
    merge_base = _run_git(root, "merge-base", base_tip, head)

    base_lastmods = _load_manifest_at_ref(root, base_tip)
    if base_lastmods is None:
        if current_lastmods is None:
            current_lastmods = load_lastmod_manifest(root)
        # Bootstrap only: the first manifest establishes reviewed dates. Once it
        # reaches main, every later PR is checked against main's persisted state.
        base_lastmods = _ordered_lastmods(current_lastmods)

    expected = dict(base_lastmods)
    materially_changed = set()
    for page in SITEMAP_PAGES:
        merge_base_content = normalize_html_for_lastmod(
            _content_at_ref(root, merge_base, page.html_path)
        )
        head_content = normalize_html_for_lastmod(_content_at_ref(root, head, page.html_path))
        base_content = normalize_html_for_lastmod(_content_at_ref(root, base_tip, page.html_path))

        branch_changed = merge_base_content != head_content
        base_changed = merge_base_content != base_content
        if branch_changed and base_changed:
            if head_content != base_content:
                raise SitemapStateError(
                    f"{page.html_path} changed materially on both the PR branch and its current base; "
                    "sync the branch with main before generating the sitemap"
                )
            branch_changed = False

        if branch_changed:
            expected[page.html_path] = _latest_substantive_commit_date(
                root, merge_base, head, page.html_path
            )
            materially_changed.add(page.html_path)

    return _ordered_lastmods(expected), materially_changed


def qualified(namespace, tag):
    return f"{{{namespace}}}{tag}"


def render_sitemap(lastmods):
    lastmods = _validate_lastmods(lastmods, LASTMOD_MANIFEST_NAME)
    ET.register_namespace("", SITEMAP_NAMESPACE)
    ET.register_namespace("xhtml", XHTML_NAMESPACE)

    urlset = ET.Element(qualified(SITEMAP_NAMESPACE, "urlset"))
    for pair in SITEMAP_PAIRS:
        for page in pair.pages:
            item = ET.SubElement(urlset, qualified(SITEMAP_NAMESPACE, "url"))
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "loc")).text = page.url
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "lastmod")).text = lastmods[
                page.html_path
            ]
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "changefreq")).text = pair.changefreq
            ET.SubElement(item, qualified(SITEMAP_NAMESPACE, "priority")).text = pair.priority
            for hreflang, href in pair.alternates:
                ET.SubElement(
                    item,
                    qualified(XHTML_NAMESPACE, "link"),
                    {"rel": "alternate", "hreflang": hreflang, "href": href},
                )

    ET.indent(urlset, space="  ")
    serialized = ET.tostring(urlset, encoding="unicode", short_empty_elements=True)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{serialized}\n'


def validate_sitemap_state(root, base_ref=None):
    """Validate sitemap structure, persisted state, and optional PR-delta rules."""

    root = Path(root)
    errors = []
    try:
        lastmods = load_lastmod_manifest(root)
    except SitemapStateError as exc:
        return [str(exc)]

    sitemap_path = root / SITEMAP_NAME
    if not sitemap_path.exists():
        return [f"{SITEMAP_NAME} is missing"]

    try:
        sitemap_root = ET.parse(sitemap_path).getroot()
    except ET.ParseError as exc:
        return [f"{SITEMAP_NAME}: invalid XML: {exc}"]

    ns = {"sm": SITEMAP_NAMESPACE, "xhtml": XHTML_NAMESPACE}
    if sitemap_root.tag != qualified(SITEMAP_NAMESPACE, "urlset"):
        errors.append(f"{SITEMAP_NAME}: root element must be the sitemap urlset")

    entries = {}
    for item in sitemap_root.findall("sm:url", ns):
        loc = item.findtext("sm:loc", default="", namespaces=ns).strip()
        if not loc:
            errors.append(f"{SITEMAP_NAME}: url entry is missing loc")
            continue
        if loc in entries:
            errors.append(f"{SITEMAP_NAME}: duplicate loc: {loc}")
        entries[loc] = item

    expected_urls = {page.url for page in SITEMAP_PAGES}
    for missing in sorted(expected_urls - set(entries)):
        errors.append(f"{SITEMAP_NAME}: expected URL missing: {missing}")
    for unexpected in sorted(set(entries) - expected_urls):
        errors.append(f"{SITEMAP_NAME}: unexpected URL: {unexpected}")

    for pair in SITEMAP_PAIRS:
        required_alternates = set(pair.alternates)
        for page in pair.pages:
            item = entries.get(page.url)
            if item is None:
                continue
            lastmod = item.findtext("sm:lastmod", default="", namespaces=ns).strip()
            if not _valid_lastmod(lastmod):
                errors.append(f"{SITEMAP_NAME}: {page.url} lastmod must be a valid YYYY-MM-DD")
            elif lastmod != lastmods[page.html_path]:
                errors.append(
                    f"{SITEMAP_NAME}: {page.url} lastmod {lastmod} does not match "
                    f"{LASTMOD_MANIFEST_NAME} value {lastmods[page.html_path]}"
                )
            changefreq = item.findtext("sm:changefreq", default="", namespaces=ns).strip()
            if changefreq != pair.changefreq:
                errors.append(f"{SITEMAP_NAME}: {page.url} changefreq must be {pair.changefreq}")
            priority = item.findtext("sm:priority", default="", namespaces=ns).strip()
            if priority != pair.priority:
                errors.append(f"{SITEMAP_NAME}: {page.url} priority must be {pair.priority}")

            alternate_values = [
                (link.get("hreflang"), link.get("href"))
                for link in item.findall("xhtml:link", ns)
                if link.get("rel") == "alternate"
            ]
            alternates = set(alternate_values)
            if len(alternate_values) != len(alternates):
                errors.append(f"{SITEMAP_NAME}: {page.url} has duplicate hreflang alternates")
            for alternate in sorted(required_alternates - alternates):
                errors.append(f"{SITEMAP_NAME}: {page.url} missing hreflang alternate {alternate}")
            for alternate in sorted(alternates - required_alternates):
                errors.append(f"{SITEMAP_NAME}: {page.url} has unexpected hreflang alternate {alternate}")

    if sitemap_path.read_text(encoding="utf-8") != render_sitemap(lastmods):
        errors.append(f"{SITEMAP_NAME} does not match deterministic generated output")

    if base_ref:
        try:
            expected_lastmods, materially_changed = expected_lastmods_for_base(
                root, base_ref, current_lastmods=lastmods
            )
        except SitemapStateError as exc:
            errors.append(f"PR lastmod validation failed: {exc}")
        else:
            for html_path in SITEMAP_HTML_PATHS:
                if lastmods[html_path] == expected_lastmods[html_path]:
                    continue
                if html_path in materially_changed:
                    errors.append(
                        f"{LASTMOD_MANIFEST_NAME}: materially changed {html_path} must use "
                        f"{expected_lastmods[html_path]}, not {lastmods[html_path]}"
                    )
                else:
                    errors.append(
                        f"{LASTMOD_MANIFEST_NAME}: unchanged or cache-bust-only {html_path} must "
                        f"retain {expected_lastmods[html_path]}, not {lastmods[html_path]}"
                    )

    return errors
