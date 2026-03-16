# Insight Forge - Claude Code Onboarding

This document provides essential context for Claude Code sessions working on Insight Forge.

## Project Overview

**Insight Forge** is a clinical quality measure (CQM) development platform that transforms 50+ page PDF measure specifications into executable code (CQL, SQL) using AI-assisted extraction, a reusable component library, and automated validation.

**Problem solved:** What traditionally takes 2-4 weeks per measure now takes 2-4 hours.

## Quick Start

```bash
# Frontend (React + Vite)
npm install && npm run dev
# Runs at http://localhost:5173

# Backend (FastAPI — replaces Spring Boot)
cd insight_forge_api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
# Runs at http://localhost:8000
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, JavaScript (JSX), Vite, Zustand 5, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.9+, SQLAlchemy 2.0 async, Alembic, aiosqlite (dev) / Oracle (prod) |
| AI Providers | Anthropic Claude, OpenAI GPT, Google Gemini |
| Deployment | Frontend: Vercel, Backend: Railway |

## Project Structure

```
insight_forge_api/          # FastAPI backend
├── app/
│   ├── main.py             # FastAPI app, CORS, lifespan, router includes
│   ├── config.py           # Settings (pydantic-settings, reads .env)
│   ├── database.py         # SQLAlchemy async engine, session factory
│   ├── dependencies.py     # Auth dependency injection
│   ├── deps.py             # DB session dependency (DbSession type)
│   ├── models/             # SQLAlchemy ORM models
│   ├── schemas/            # Pydantic request/response models
│   ├── routers/            # FastAPI route handlers
│   ├── services/           # Business logic
│   └── seeds/
│       └── seed_data.py    # Runs on startup: 9 measures + 66 components
├── alembic/                # Database migrations
│   ├── versions/           # Migration files
│   └── seeds/
│       ├── V10_components_and_measures.sql  # eCQM seed SQL
│       └── hcc_archived/   # HCC module SQL + Java source for Oracle team
├── data/
│   └── insightforge.db     # SQLite database (dev, gitignored)
├── requirements.txt
└── .env.example

src/                        # React frontend
├── components/             # React UI components
│   ├── copilot/           # AND/OR.ai Co-Pilot chat interface
│   ├── ingestion/         # Document import UI (CatalogueConfirmationChip)
│   ├── layout/            # App shell (Sidebar)
│   ├── library/           # Component Library UI
│   ├── measure/           # UMS Editor, MeasureLibrary, CodeGeneration
│   ├── settings/          # Settings page with feedback dashboard
│   ├── validation/        # Test patient validation
│   └── valueset/          # Value set management
├── services/              # Business logic and generators
│   ├── measureIngestion.ts    # Document parsing
│   ├── cqlGenerator.ts        # CQL code generation
│   ├── hdiSqlGenerator.ts     # SQL code generation
│   ├── copilotService.ts      # AI Co-Pilot context
│   └── extractionService.js   # AI extraction with feedback
├── stores/                # Zustand state management
│   ├── measureStore.js        # Measures, active tab, code overrides
│   ├── componentLibraryStore.js  # Reusable components
│   ├── feedbackStore.js       # Extraction corrections
│   └── settingsStore.js       # User preferences
├── api/                   # Backend API clients
│   ├── measures.js            # Measure CRUD
│   ├── components.js          # Component CRUD
│   ├── validation.js          # Test patient validation
│   ├── import.js              # Import endpoint
│   └── classifierFeedback.js  # Classifier feedback API
├── utils/                 # Utility functions
│   └── catalogueClassifier.js # Document type detection
└── types/                 # TypeScript definitions
```

## Key Concepts

### Universal Measure Spec (UMS)
The canonical data model representing a clinical quality measure. Contains:
- Metadata (title, ID, measurement period)
- Populations (IPP, Denominator, Numerator, Exclusions)
- Criteria tree (AND/OR/NOT clauses with DataElements)
- Value sets with codes

### Component Library
Reusable building blocks:
- **Atomic**: Single value set + timing (e.g., "Office Visit during MP")
- **Composite**: Collection with AND/OR logic (created via merge)

### Ingestion Pipeline
1. Upload PDF/Word document
2. **Catalogue auto-detect**: Classify as eCQM, MIPS_CQM, HEDIS, QOF, or Clinical_Standard
3. AI extraction with feedback injection (learns from past corrections)
4. Component auto-linking to library
5. User review and refinement

## Key Documentation Files

| File | Purpose |
|------|---------|
| `PRODUCT_GUIDE.md` | User-facing feature documentation |
| `TECH_SPECS.md` | Technical specifications, data models, services |
| `WIRING_MANIFEST.md` | Component-store connections, data flows |
| `docs/TECHNICAL_ARCHITECTURE.md` | Code structure and patterns |
| `docs/PRODUCT_OVERVIEW.md` | High-level product description |

**Note:** HCC module archived at `insight_forge_api/alembic/seeds/hcc_archived/` for Oracle team to port separately.

## API Endpoints

### Measures
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/measures` | GET | List all measures (summary) |
| `/api/measures/full` | GET | List all measures (full tree) |
| `/api/measures/{id}` | GET/PUT/DELETE | Measure CRUD |
| `/api/measures/by-measure-id/{cms_id}` | GET | Get by CMS measure ID |
| `/api/measures/{id}/lock` | POST | Lock measure for editing |
| `/api/measures/{id}/unlock` | POST | Unlock measure |
| `/api/measures/{id}/validate` | GET | Get validation traces |
| `/api/measures/{id}/validate/summary` | GET | Validation summary |

### Components
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/components` | GET | List all components |
| `/api/components/stats` | GET | Component statistics |
| `/api/components/{id}` | GET/PUT/DELETE | Component CRUD |
| `/api/components/atomic` | POST | Create atomic component |
| `/api/components/composite` | POST | Create composite component |
| `/api/components/{id}/approve` | POST | Approve component |
| `/api/components/{id}/archive` | POST | Archive component |
| `/api/components/{id}/versions` | POST | Create new version |
| `/api/components/{id}/category` | PUT | Set category |

### Code Generation
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/measures/{id}/cql` | GET | Generate CQL |
| `/api/measures/{id}/cql/preview` | POST | Preview CQL |
| `/api/measures/{id}/sql` | GET | Generate HDI SQL |
| `/api/measures/{id}/sql/preview` | POST | Preview SQL |
| `/api/measures/{id}/code` | GET | Generate both CQL and SQL |

### Validation
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/validation/patients` | GET/POST | List/create test patients |
| `/api/validation/patients/{id}` | GET/PUT/DELETE | Patient CRUD |
| `/api/validation/patients/for-measure/{id}` | GET | Patients for measure |
| `/api/validation/evaluate/{measure_id}` | GET | Evaluate all patients |
| `/api/validation/evaluate/{measure_id}/{patient_id}` | GET | Evaluate single patient |
| `/api/validation/summary/{measure_id}` | GET | Validation summary |

### LLM
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/llm/providers` | GET | List available providers |
| `/api/llm/complete` | POST | General completion |
| `/api/llm/extract` | POST | Document extraction |
| `/api/llm/assist` | POST | Co-pilot assistance |

### Other
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/import` | POST | Import measures/components |
| `/api/import/export` | GET | Export all data |
| `/api/classifier/feedback` | POST/GET | Classifier feedback CRUD |
| `/api/auth/register` | POST | Register user |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET/PUT | Current user |
| `/api/auth/refresh` | POST | Refresh token |
| `/health` | GET | Health check |

## Recent Features

### Backend Migration to FastAPI (March 2026)
Full replacement of Spring Boot backend with FastAPI + SQLAlchemy async.
- `insight_forge_api/` — full Python backend
- SQLite (dev) / Oracle (prod) via oracledb driver
- Alembic replaces Flyway for schema migrations
- Seed data: 9 eCQM measures + 66 components loaded on startup
- JWT auth via python-jose + passlib[bcrypt] (off by default, toggle AUTH_ENABLED)
- HCC module archived at `insight_forge_api/alembic/seeds/hcc_archived/` for Oracle team

### Feature 1c: Easy HEDIS — NDC, Collection Type, Hybrid Source (March 2026)
- `catalogueDefaults` on components for HEDIS-specific defaults
- `hedis` block on data elements: `{ collectionType, hybridSourceFlag }`
- AI infers collection type at HEDIS ingest
- HEDIS Collection section in UMS editor
- NDC code system recognition
- HEDIS export validation warnings
- HEDIS comments in generated CQL/SQL

### Feature 1b: Catalogue Auto-Detection (March 2026)
- `src/utils/catalogueClassifier.js` — Signal-based document classifier
- `src/components/ingestion/CatalogueConfirmationChip.jsx` — Confirmation UI
- Backend: `/api/classifier/feedback` endpoint

### Feature 1a: Catalogue Tagging (February 2026)
- Standardized "Catalogue" spelling in user-facing strings
- Added catalogue type badges to component library

### Extraction Feedback System (February 2026)
- `src/stores/feedbackStore.js` — Captures user corrections
- Prompt injection into AI extraction prompts
- Feedback dashboard in Settings

## State Management

Zustand stores with localStorage persistence:
- `settings-storage` — LLM provider preference, VSAC API key
- `feedback-storage` — Extraction corrections and feedback settings
- `component-code-storage` — Code override state

**Note:** Measures and components are now persisted in the backend database, not localStorage.

## Development Notes

- Backend database: SQLite file at `insight_forge_api/data/insightforge.db`
- Database seeded automatically on first startup via `app/seeds/seed_data.py`
- LLM API keys live server-side in `.env` — not in browser localStorage
- All component IDs use `comp-` or `composite-` prefix
- Swagger UI available at http://localhost:8000/docs

## Helpful Commands

```bash
# Check database (SQLite)
sqlite3 insight_forge_api/data/insightforge.db ".tables"
sqlite3 insight_forge_api/data/insightforge.db "SELECT COUNT(*) FROM library_component;"

# Reset database (re-seeds on next startup)
rm insight_forge_api/data/insightforge.db

# Run with reload (dev)
cd insight_forge_api && uvicorn app.main:app --reload --port 8000

# Kill processes on port 8000
lsof -ti:8000 | xargs kill -9

# Run frontend tests
npm run test        # Run once
npm run test:watch  # Watch mode

# Build frontend for production
npm run build       # Output to dist/
```

## Git Workflow

- Main branch: `main`
- Feature branches: `feature/1b-catalogue-autodetect`
- Commit format: `feat:`, `fix:`, `docs:`, `refactor:`
- Push to production: `git push origin main`
