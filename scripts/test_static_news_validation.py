from pathlib import Path
import unittest
from static_news_validation import complete_static_news_lead

ROOT = Path(__file__).resolve().parents[1]


class StaticNewsTests(unittest.TestCase):
    def test_localized_real_stories(self):
        for file, title, terms in [
            ("news.html", "IMS updated to two products plus a License Updates add-on", ("License", "License Plus", "source code", "Updates")),
            ("ja/news.html", "IMSを2商品＋Updates追加オプションへ更新", ("License", "License Plus", "ソースコード", "Updates")),
        ]:
            with self.subTest(file=file):
                self.assertTrue(complete_static_news_lead((ROOT / file).read_text(encoding="utf-8"), title, terms))

    def test_attributes_cannot_replace_a_heading_or_body(self):
        for body in ["", "Short", "x" * 400]:
            html = '<a id="cmsNewsLead" title="IMS news" data-copy="License source code Updates"><p>' + body + '</p></a>'
            self.assertFalse(complete_static_news_lead(html, "IMS news", ("License", "source code", "Updates")))

    def test_product_facts_are_required_even_with_long_text(self):
        html = '<a id="cmsNewsLead"><h2>IMS news</h2><p>' + "x" * 400 + '</p></a>'
        self.assertFalse(complete_static_news_lead(html, "IMS news", ("License", "License Plus", "Updates")))

    def test_unclosed_or_missing_lead_is_rejected(self):
        self.assertFalse(complete_static_news_lead('<a id="cmsNewsLead"><h2>IMS news</h2>', "IMS news", ("License",)))
        self.assertFalse(complete_static_news_lead('<article><h2>IMS news</h2></article>', "IMS news", ("License",)))

    def test_hidden_code_does_not_count_as_article_copy(self):
        for tag in ("script", "style", "template"):
            html = '<a id="cmsNewsLead"><h2>IMS news</h2><p><' + tag + '>' + "License " * 80 + '</' + tag + '></p></a>'
            self.assertFalse(complete_static_news_lead(html, "IMS news", ("License",)))


if __name__ == "__main__":
    unittest.main()
