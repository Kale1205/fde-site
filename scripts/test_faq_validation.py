"""Synthetic FAQ schema checks; never modify or load published content."""
import copy
import unittest
from faq_validation import LOCALES, validate_faq_documents


def fixture():
    labels = {locale: f"Synthetic {locale}" for locale in LOCALES}
    item = {"id": "synthetic-a", "category": "sample", "subcategory": "intro", "highFrequency": False,
            **{field: {locale: f"Synthetic {field} {locale}" for locale in LOCALES}
               for field in ("question", "answer")},
            **{field: {locale: [] for locale in LOCALES} for field in ("keywords", "synonyms")}}
    return {"version": 3, "locales": list(LOCALES), "categories": {"sample": {"label": labels}},
            "subcategories": {"intro": {"category": "sample", "label": labels}}, "faq": [item]}, {"faq": []}


class FaqValidationTests(unittest.TestCase):
    def test_counts_are_variable_and_inputs_are_unchanged(self):
        base, policy = fixture()
        for count in (0, 1, 3, 38):
            base["faq"] = [dict(copy.deepcopy(fixture()[0]["faq"][0]), id=f"synthetic-{i}") for i in range(count)]
            before = copy.deepcopy((base, policy))
            self.assertEqual(validate_faq_documents(base, policy), [])
            self.assertEqual((base, policy), before)

    def test_duplicate_ids_in_each_source_and_across_sources(self):
        for target in ("base", "policy", "both"):
            with self.subTest(target=target):
                base, policy = fixture()
                item = copy.deepcopy(base["faq"][0])
                if target == "base":
                    base["faq"].append(item)
                elif target == "policy":
                    base["faq"] = []
                    policy["faq"] = [item, copy.deepcopy(item)]
                else:
                    policy["faq"] = [item]
                self.assertTrue(validate_faq_documents(base, policy))

    def test_localized_field_types_and_completeness(self):
        for locale in LOCALES:
            for field in ("question", "answer", "keywords", "synonyms"):
                for invalid in (None, 23, {}, "" if field in ("question", "answer") else [23]):
                    with self.subTest(locale=locale, field=field, invalid=invalid):
                        base, policy = fixture()
                        base["faq"][0][field][locale] = invalid
                        self.assertTrue(validate_faq_documents(base, policy))

    def test_invalid_documents_ids_metadata_and_taxonomy(self):
        mutations = [
            lambda base, policy: base.update(version=2),
            lambda base, policy: base.update(locales=["ja", "en", "en"]),
            lambda base, policy: base.update(categories=[]),
            lambda base, policy: base["faq"].append(None),
            lambda base, policy: base["faq"][0].update(id='unsafe" id'),
            lambda base, policy: base["faq"][0].update(id="x" * 201),
            lambda base, policy: base["faq"][0].update(highFrequency=1),
            lambda base, policy: base["faq"][0].update(category="unknown"),
            lambda base, policy: base["subcategories"]["intro"].update(category="other"),
            lambda base, policy: base["categories"]["sample"]["label"].pop("zh-CN"),
        ]
        self.assertTrue(validate_faq_documents({}, {}))
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                base, policy = fixture()
                mutate(base, policy)
                self.assertTrue(validate_faq_documents(base, policy))


if __name__ == "__main__":
    unittest.main()
