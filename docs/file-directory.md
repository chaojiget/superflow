# Project File Directory

This document outlines the initial directory structure derived from the v1 PR requirements.

```
superflow/
├── src/
│   ├── ideas/
│   ├── planner/
│   ├── flow/
│   ├── nodes/
│   ├── run-center/
│   └── shared/
├── public/
└── docs/
    ├── pr01.md
    └── file-directory.md
```

## Directory Map
- `src/ideas`: idea to blueprint processing
- `src/planner`: converts blueprints to DAG flows
- `src/flow`: flow canvas and runtime
- `src/nodes`: individual code nodes and related logic
- `src/run-center`: run center observability
- `src/shared`: shared utilities and types
- `public`: static assets
- `docs`: documentation, including PRs and architecture notes
