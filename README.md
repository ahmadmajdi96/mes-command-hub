# Cortanex RMS — R&D Recipe Management

An industry-agnostic recipe management system: recipes and variant branches, trial logs, stage-gate pipelines, material catalog, attribute schemas, units and conversions, comparison engine, audit trail, API keys, integrations, and AI-assisted QA insights.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Self-hosting with Docker

```sh
docker compose up -d
```

The app runs on port 8121 and accepts any hostname (e.g. rms.manuqube.com).
