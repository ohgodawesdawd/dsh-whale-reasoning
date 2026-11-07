# Security and privacy

- This plugin runs inside a DSH profile. Install only packages you trust and back up the profile first.
- Manual effort/model selection uses the host model directory; this plugin contains no analytics collector or third-party upload endpoint.
- Local preferences use `dsh-whale-reasoning.config.v1`. Server-side plugin state is stored under `.whale-reasoning/state.json` in the profile, unless an explicit environment override is used.
- Auto-band and model routing are optional and disabled by default. With both disabled, request handling returns without inspecting conversation content (covered by a test).
- Auto-band can inspect recent tool-error events when enabled. Model routing can inspect the current user message when configured. A routing text-extraction failure may create `.whale-reasoning/debug-user-event.json`; the structural sample may contain short text fragments. Treat this file and plugin state as private.
- The local `/whale-reasoning/state` and `/whale-reasoning/band` routes use the host server's security boundary. Do not expose an unauthenticated DSH server publicly on the assumption that this plugin provides separate authentication.
- Do not post API keys, profile files, session dumps, state files or debug samples in issues. For a UI report, use the isolated fixture or crop and redact a screenshot.
- This repository contains no credentials. It has not received an independent security audit.

Before reporting a vulnerability publicly, contact a repository maintainer privately through the contact method displayed on their GitHub profile. If none is available, open only a minimal issue requesting a private contact, without exploit details or personal data.
