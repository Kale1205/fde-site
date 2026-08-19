# English-only stabilization

Temporary public-site stabilization policy:

- Display language is English only.
- Public prices are USD only.
- Language selection and local-currency conversion are disabled.
- Products shows License first and Updates second; flip behavior is disabled.
- Purchase and License pages use dedicated lightweight English-only runtimes.
- Legacy compatibility entry points that previously changed language, currency, or plan state are disabled or reduced to English-only behavior.
- Cache busting remains controlled by the repository build-version workflow.

This state is intended to provide a stable baseline before multilingual support is redesigned as a single, non-conflicting system.
