# Privacy Policy

Effective date: 2026-06-07

Net Boost Agent is designed to run network diagnostics and benchmark workflows locally through the user's agent environment.

## Data Processed

The agent may process local network diagnostics, benchmark measurements, dependency status, audit entries, and user-provided optimization goals. Benchmark artifacts are saved locally under `.net-boost-runs` unless the host application stores or exports them separately.

## External Tools

When the official Ookla Speedtest CLI is installed, the agent can call it to measure download speed, upload speed, latency, and related benchmark data. Use of Speedtest CLI is subject to Ookla's own terms and privacy practices. The official download page is https://www.speedtest.net/apps/cli.

## Data Sharing

This project does not include hidden telemetry, advertising trackers, or background upload logic. Data is only sent to external services when a user or host agent explicitly runs tools that contact those services, such as Speedtest CLI or DNS checks.

## Local Records

Preview, apply, benchmark, and report artifacts may be written locally for auditability. Users can delete local run artifacts at any time from `.net-boost-runs`.

## Safety Controls

Read-only diagnostics are the default. Any apply action must pass through preview and explicit confirmation. The agent records what was previewed or applied so users can review the decision trail.

## Contact

For this local development package, contact the Net Boost Agent maintainers through the repository or distribution channel where the package was provided.
