"""Pure structural checks for the two published FAQ documents."""
import re

LOCALES = ("ja", "en", "zh-CN")
SOURCES = ("content/faq-content.json", "content/faq-policy-additions.json")


def validate_faq_documents(base, policy):
    errors = []
    if not all(isinstance(doc, dict) and isinstance(doc.get("faq"), list)
               for doc in (base, policy)):
        return ["FAQ documents must contain faq arrays"]
    locales = base.get("locales")
    if (base.get("version") != 3 or not isinstance(locales, list)
            or len(locales) != len(LOCALES)
            or any(locale not in locales for locale in LOCALES)):
        errors.append("content/faq-content.json: expected version 3 and ja/en/zh-CN locales")
    categories, subcategories = base.get("categories"), base.get("subcategories")
    if not isinstance(categories, dict) or not isinstance(subcategories, dict):
        return errors + ["content/faq-content.json: taxonomy objects are required"]
    seen = set()
    nonempty = lambda value: isinstance(value, str) and bool(value.strip())
    for source, doc in zip(SOURCES, (base, policy)):
        for index, item in enumerate(doc["faq"]):
            label = f"{source}: FAQ at index {index}"
            if not isinstance(item, dict):
                errors.append(f"{label} must be an object")
                continue
            item_id = item.get("id")
            if not isinstance(item_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,199}", item_id):
                errors.append(f"{label} has an invalid ID")
            elif item_id in seen:
                errors.append(f"{label} has a duplicate ID across FAQ sources")
            else:
                seen.add(item_id)
            if not isinstance(item.get("highFrequency"), bool):
                errors.append(f"{label} highFrequency must be boolean")
            category_key, subcategory_key = item.get("category"), item.get("subcategory")
            category = categories.get(category_key) if nonempty(category_key) else None
            subcategory = subcategories.get(subcategory_key) if nonempty(subcategory_key) else None
            if (not isinstance(category, dict) or not isinstance(subcategory, dict)
                    or subcategory.get("category") != category_key):
                errors.append(f"{label} has an invalid category/subcategory reference")
            else:
                for kind, definition in (("category", category), ("subcategory", subcategory)):
                    labels = definition.get("label")
                    if not isinstance(labels, dict) or any(not nonempty(labels.get(locale)) for locale in LOCALES):
                        errors.append(f"{label} {kind} labels must cover all three locales")
            for locale in LOCALES:
                for field in ("question", "answer"):
                    values = item.get(field)
                    if not isinstance(values, dict) or not nonempty(values.get(locale)):
                        errors.append(f"{label} missing {locale} {field}")
                for field in ("keywords", "synonyms"):
                    values = item.get(field)
                    value = values.get(locale) if isinstance(values, dict) else None
                    if not isinstance(value, list) or any(not isinstance(word, str) for word in value):
                        errors.append(f"{label} {locale} {field} must be a string array")
    return errors
