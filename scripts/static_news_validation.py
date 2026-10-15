"""Validate a complete static lead story, not truncated tag attributes."""
from html.parser import HTMLParser
import re


class LeadParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.heading_depth = 0
        self.paragraph_depth = 0
        self.hidden_depth = 0
        self.headings = []
        self.paragraphs = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "template"}:
            self.hidden_depth += 1
        if tag == "h2":
            self.heading_depth += 1
        if tag == "p":
            self.paragraph_depth += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "template"}:
            self.hidden_depth = max(0, self.hidden_depth - 1)
        if tag == "h2":
            self.heading_depth = max(0, self.heading_depth - 1)
        if tag == "p":
            self.paragraph_depth = max(0, self.paragraph_depth - 1)

    def handle_data(self, data):
        if self.hidden_depth:
            return
        if self.heading_depth:
            self.headings.append(data)
        if self.paragraph_depth:
            self.paragraphs.append(data)


def complete_static_news_lead(source, expected_title, required_terms):
    match = re.search(r'<a\b[^>]*\bid="cmsNewsLead"[^>]*>[\s\S]*?</a>', source)
    candidates = [match.group(0)] if match else []
    # W05 has one circular shelf instead of a duplicate visible lead/list.
    # Only actual noscript articles count, never the JSON seed or attributes.
    if not match:
        for fallback in re.findall(r'<noscript\b[^>]*>([\s\S]*?)</noscript>', source):
            candidates.extend(re.findall(r'<article\b[^>]*\bdata-static-news-id="[^"]+"[^>]*>[\s\S]*?</article>', fallback))
    for candidate in candidates:
        parser = LeadParser()
        parser.feed(candidate)
        heading = " ".join("".join(parser.headings).split())
        body = " ".join("".join(parser.paragraphs).split())
        if (heading == expected_title and len(body) >= 150
                and all(term in body for term in required_terms)):
            return True
    return False
