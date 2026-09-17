# AI-Project-Intelligence — complete project files

87 individual deliverable files. All source files are present in the normal `AI-Project-Intelligence/` directory. Install dependencies and run it directly; no generator or decoding step is needed.

Workspace directory: `/workspace/scratch/e7cc06891967/AI-Project-Intelligence`.

The tree lists deliverables. Installed dependencies, build outputs, caches, and temporary indexed data are generated locally and excluded. No final ZIP was created.

## Complete project tree

```text
AI-Project-Intelligence/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── blockers_actions.py
│   │   │   ├── extraction.py
│   │   │   ├── grounding.py
│   │   │   ├── prompts.py
│   │   │   ├── risk_forecast.py
│   │   │   ├── schemas.py
│   │   │   └── scope_deliverables.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── agents.py
│   │   │   ├── router.py
│   │   │   └── schemas.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   └── provider.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── embeddings.py
│   │   │   ├── knowledge_base.py
│   │   │   └── text.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── tests/
│   │   ├── test_agents.py
│   │   ├── test_integration.py
│   │   ├── test_providers.py
│   │   └── test_text.py
│   ├── pytest.ini
│   ├── requirements-dev.txt
│   ├── requirements-lock.txt
│   ├── requirements-windows-py311.txt
│   └── requirements.txt
├── docs/
│   ├── architecture.md
│   ├── backend-tests.xml
│   ├── demo.md
│   ├── frontend-tests.json
│   ├── live-verification.json
│   ├── milestone1.md
│   ├── milestone2-backend-tests.xml
│   ├── milestone2-build.txt
│   ├── milestone2-frontend-tests.json
│   ├── milestone2-live-tests.xml
│   ├── milestone2-live-verification.json
│   ├── milestone2.md
│   ├── python311-windows-resolution.json
│   ├── setup.md
│   └── verification.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── UI.tsx
│   │   ├── pages/
│   │   │   ├── AgentAnalysis.tsx
│   │   │   ├── BlockersActions.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── KnowledgeBase.tsx
│   │   │   ├── Overview.tsx
│   │   │   ├── Retrieval.tsx
│   │   │   ├── RiskDelivery.tsx
│   │   │   └── ScopeDeliverables.tsx
│   │   ├── Agents.test.tsx
│   │   ├── App.test.tsx
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   ├── test-setup.ts
│   │   └── types.ts
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── samples/
│   ├── meeting_notes.docx
│   ├── project_proposal.pdf
│   ├── sprint_update.txt
│   └── task_list.csv
├── scripts/
│   ├── create_agent_samples.py
│   ├── create_samples.py
│   └── smoke_demo.py
├── tests/
│   └── test_live_application.py
├── validation_samples/
│   ├── agent_project.csv
│   ├── agent_project.docx
│   ├── agent_project.pdf
│   └── agent_project.txt
├── .env.example
├── .gitignore
├── PROJECT_FILES.md
├── README.md
└── pytest.ini
```

## Individual source and document files

These links open the actual files in this handoff. Their relative paths in the tree show where each belongs.

| File |
| --- |
| [.env.example](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/.env.example) |
| [.gitignore](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/.gitignore) |
| [PROJECT_FILES.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/PROJECT_FILES.md) |
| [README.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/README.md) |
| [backend/app/__init__.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/__init__.py) |
| [backend/app/agents/__init__.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/__init__.py) |
| [backend/app/agents/base.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/base.py) |
| [backend/app/agents/blockers_actions.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/blockers_actions.py) |
| [backend/app/agents/extraction.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/extraction.py) |
| [backend/app/agents/grounding.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/grounding.py) |
| [backend/app/agents/prompts.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/prompts.py) |
| [backend/app/agents/risk_forecast.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/risk_forecast.py) |
| [backend/app/agents/schemas.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/schemas.py) |
| [backend/app/agents/scope_deliverables.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/agents/scope_deliverables.py) |
| [backend/app/api/__init__.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/api/__init__.py) |
| [backend/app/api/agents.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/api/agents.py) |
| [backend/app/api/router.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/api/router.py) |
| [backend/app/api/schemas.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/api/schemas.py) |
| [backend/app/core/__init__.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/core/__init__.py) |
| [backend/app/core/config.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/core/config.py) |
| [backend/app/llm/__init__.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/llm/__init__.py) |
| [backend/app/llm/base.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/llm/base.py) |
| [backend/app/llm/provider.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/llm/provider.py) |
| [backend/app/main.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/main.py) |
| [backend/app/services/__init__.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/services/__init__.py) |
| [backend/app/services/embeddings.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/services/embeddings.py) |
| [backend/app/services/knowledge_base.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/services/knowledge_base.py) |
| [backend/app/services/text.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/app/services/text.py) |
| [backend/pytest.ini](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/pytest.ini) |
| [backend/requirements-dev.txt](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/requirements-dev.txt) |
| [backend/requirements-lock.txt](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/requirements-lock.txt) |
| [backend/requirements-windows-py311.txt](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/requirements-windows-py311.txt) |
| [backend/requirements.txt](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/requirements.txt) |
| [backend/tests/test_agents.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/tests/test_agents.py) |
| [backend/tests/test_integration.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/tests/test_integration.py) |
| [backend/tests/test_providers.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/tests/test_providers.py) |
| [backend/tests/test_text.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/backend/tests/test_text.py) |
| [docs/architecture.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/architecture.md) |
| [docs/backend-tests.xml](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/backend-tests.xml) |
| [docs/demo.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/demo.md) |
| [docs/frontend-tests.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/frontend-tests.json) |
| [docs/live-verification.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/live-verification.json) |
| [docs/milestone1.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/milestone1.md) |
| [docs/milestone2-backend-tests.xml](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/milestone2-backend-tests.xml) |
| [docs/milestone2-build.txt](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/milestone2-build.txt) |
| [docs/milestone2-frontend-tests.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/milestone2-frontend-tests.json) |
| [docs/milestone2-live-tests.xml](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/milestone2-live-tests.xml) |
| [docs/milestone2-live-verification.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/milestone2-live-verification.json) |
| [docs/milestone2.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/milestone2.md) |
| [docs/python311-windows-resolution.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/python311-windows-resolution.json) |
| [docs/setup.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/setup.md) |
| [docs/verification.md](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/docs/verification.md) |
| [frontend/index.html](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/index.html) |
| [frontend/package-lock.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/package-lock.json) |
| [frontend/package.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/package.json) |
| [frontend/src/Agents.test.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/Agents.test.tsx) |
| [frontend/src/App.test.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/App.test.tsx) |
| [frontend/src/App.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/App.tsx) |
| [frontend/src/api.ts](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/api.ts) |
| [frontend/src/components/UI.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/components/UI.tsx) |
| [frontend/src/main.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/main.tsx) |
| [frontend/src/pages/AgentAnalysis.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/AgentAnalysis.tsx) |
| [frontend/src/pages/BlockersActions.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/BlockersActions.tsx) |
| [frontend/src/pages/Documents.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/Documents.tsx) |
| [frontend/src/pages/KnowledgeBase.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/KnowledgeBase.tsx) |
| [frontend/src/pages/Overview.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/Overview.tsx) |
| [frontend/src/pages/Retrieval.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/Retrieval.tsx) |
| [frontend/src/pages/RiskDelivery.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/RiskDelivery.tsx) |
| [frontend/src/pages/ScopeDeliverables.tsx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/pages/ScopeDeliverables.tsx) |
| [frontend/src/styles.css](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/styles.css) |
| [frontend/src/test-setup.ts](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/test-setup.ts) |
| [frontend/src/types.ts](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/src/types.ts) |
| [frontend/tsconfig.json](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/tsconfig.json) |
| [frontend/vite.config.ts](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/frontend/vite.config.ts) |
| [pytest.ini](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/pytest.ini) |
| [samples/meeting_notes.docx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/samples/meeting_notes.docx) |
| [samples/project_proposal.pdf](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/samples/project_proposal.pdf) |
| [samples/sprint_update.txt](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/samples/sprint_update.txt) |
| [samples/task_list.csv](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/samples/task_list.csv) |
| [scripts/create_agent_samples.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/scripts/create_agent_samples.py) |
| [scripts/create_samples.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/scripts/create_samples.py) |
| [scripts/smoke_demo.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/scripts/smoke_demo.py) |
| [tests/test_live_application.py](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/tests/test_live_application.py) |
| [validation_samples/agent_project.csv](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/validation_samples/agent_project.csv) |
| [validation_samples/agent_project.docx](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/validation_samples/agent_project.docx) |
| [validation_samples/agent_project.pdf](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/validation_samples/agent_project.pdf) |
| [validation_samples/agent_project.txt](sandbox:/workspace/scratch/e7cc06891967/AI-Project-Intelligence/validation_samples/agent_project.txt) |
