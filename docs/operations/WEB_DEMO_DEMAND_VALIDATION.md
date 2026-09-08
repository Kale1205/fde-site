# FDE IMS Web Demo Demand Validation Policy

Status: `ADMINISTRATOR-APPROVED STRATEGY — 2026-09-09`

## Purpose

FDE IMS native v1.0 will not wait for every native platform to be packaged and physically validated before release.

The first native release target is Apple M2 or later on macOS 12 Monterey or later, subject to Apple's model-specific minimum OS for the exact Mac model.

The browser-based Web Demo is a separate validation surface used to expose the planned inventory workflow broadly and collect demand signals for later native platform releases.

## Web Demo availability

The Web Demo should remain usable in modern browsers across:

- macOS;
- Windows;
- Linux;
- iOS / iPadOS; and
- Android.

No operating-system gate should be added solely to mirror the native release matrix.

Web Demo availability does **not** mean that the corresponding native application is released or supported.

Public copy must keep the distinction clear:

- `Web Demo` = browser-based development preview with sample/temporary data;
- `Native v1.0` = first formally supported installed product, initially M2+ / macOS 12+;
- `Later native platforms` = M1 compatibility validation, Windows, Linux, iPhone/iPad, and Android according to evidence and demand.

## Demand signals

Initial platform-prioritization evidence should favor explicit, low-risk signals:

1. visitors who open the Web Demo and then submit an inquiry;
2. users who explicitly state the native platform they want;
3. country/region and company context already provided through approved inquiry flows;
4. existing privacy-approved aggregate website/search metrics where available;
5. later sales/discovery evidence collected under existing Outreach and compliance gates.

The first implementation does not need hidden OS/device fingerprinting to validate demand.

Do not introduce device fingerprinting, invasive profiling, or new third-party analytics merely to infer platform demand. Any new analytics/tracking that creates a new privacy/compliance obligation requires its own review before production activation.

## Native release independence

Windows, iOS/iPadOS, Android, Linux, and M1 physical validation are not blockers for the first M2+ / macOS 12+ native v1.0 release.

Existing cross-platform compile checks and portable architecture remain useful engineering evidence, but they do not re-enter the initial release critical path.

The Web Demo must not weaken or bypass native release requirements such as:

- Developer ID signing and notarization;
- Gatekeeper validation;
- installer lifecycle validation;
- second physical M2+ Mac private-LAN validation;
- security/integrity gates;
- Kale Review;
- Kale Guard; and
- Administrator release/distribution approval.

## Public wording

Preferred wording:

> Web Demo: available in a modern browser across major operating systems. The first native FDE IMS v1.0 release is planned for Apple M2 or later Macs on macOS 12 or later. Other native platforms will be prioritized using validation and demand data.

Do not use Web Demo availability as evidence that Windows, Linux, iOS/iPadOS, Android, or M1 native support already exists.

## Current commercial safety

This policy does not enable:

- live payment;
- production fulfillment;
- customer installer distribution;
- native product release;
- automatic customer fulfillment mail;
- agent auto-merge or auto-release; or
- unapproved public claims beyond the reviewed Web Demo/native-platform distinction.

Production publication of changed public copy remains subject to the existing Administrator publication/merge gate.
