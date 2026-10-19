# Federated union indices

## Scope

This directory contains generated, namespaced indices over the Marble upstream dataset and the imported Chinese mathematics dataset. It is a navigation layer, not a relicensed replacement for either source.

## Files

| File | Role |
|---|---|
| `manifest.json` | Source revisions, counts, and source paths. |
| `topics.json` | Lightweight topic index with global IDs such as `marble:mt_...` and `cn-math:cnm_...`. |
| `dependencies.json` | Namespaced prerequisite-edge index. |

Generate with `npm run build:union`; check source references and graph integrity with `npm run validate:union`.

---

Update this document only when the union contract, source set, or file navigation changes.
