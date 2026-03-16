# Insight Forge Technical Specifications

## Overview

Insight Forge is a comprehensive clinical quality measure development platform built with React 18 and FastAPI. The frontend uses JavaScript (JSX), Vite, and Zustand for state management. The backend uses FastAPI with SQLAlchemy 2.0 async for database operations. It enables healthcare organizations to accelerate the creation, validation, and deployment of clinical quality measures (CQMs) through AI-assisted workflows, reusable component libraries, and multi-format code generation.

## Technology Stack

### Frontend
- **React 18** - UI framework with functional components and hooks
- **JavaScript (JSX)** - Component development
- **Vite** - Build tool and dev server with HMR
- **Zustand 5** - Lightweight state management with persist middleware
- **Tailwind CSS 4** - Utility-first styling with custom CSS variables
- **Lucide React** - Icon library

### Frontend Dependencies
- **PDF.js** - PDF document parsing for measure specification ingestion
- **xlsx** - Excel file parsing for value set imports
- **uuid** - Unique identifier generation
- **date-fns** - Date manipulation utilities

### Backend (FastAPI)
- **fastapi** - Async web framework with automatic OpenAPI docs
- **uvicorn[standard]** - ASGI server
- **sqlalchemy[asyncio]** - Async ORM with SQLAlchemy 2.0
- **aiosqlite** - SQLite async driver (development)
- **oracledb** - Oracle driver (production)
- **alembic** - Database migrations
- **pydantic / pydantic-settings** - Data validation and configuration
- **python-jose[cryptography]** - JWT token handling
- **passlib[bcrypt]** - Password hashing
- **httpx** - Async HTTP client for LLM API calls
- **anthropic** - Anthropic Python SDK
- **openai** - OpenAI Python SDK
- **email-validator** - Email validation for Pydantic

## Architecture

### Full-Stack Project Structure

```
insight_forge_api/          # FastAPI backend
├── app/
│   ├── main.py             # FastAPI app, CORS, lifespan, router includes
│   ├── config.py           # Settings (pydantic-settings, reads .env)
│   ├── database.py         # SQLAlchemy async engine, session factory
│   ├── dependencies.py     # Auth dependency injection
│   ├── deps.py             # DB session dependency (DbSession type)
│   ├── models/             # SQLAlchemy ORM models
│   │   ├── base.py         # AuditableEntity (created_at, updated_at)
│   │   ├── enums.py        # All Python Enum types
│   │   ├── measure.py      # Measure, Population, LogicalClause, DataElement,
│   │   │                   # MeasureValueSet, ValueSetCode, GlobalConstraints
│   │   ├── component.py    # LibraryComponent (abstract), AtomicComponent,
│   │   │                   # CompositeComponent + embedded types
│   │   ├── user.py         # User (auth)
│   │   └── validation.py   # TestPatient, FhirTestPatient, ClassifierFeedback
│   ├── schemas/            # Pydantic request/response models
│   │   ├── measure.py      # MeasureDto, MeasureSummaryDto, CreateMeasureRequest
│   │   ├── component.py    # ComponentDto, CreateAtomicComponentRequest
│   │   ├── code_generation.py  # CqlResponse, SqlResponse
│   │   ├── import_schema.py    # ImportRequest, ImportResultDto
│   │   ├── validation.py   # ValidationTraceDto, ClassifierFeedbackRequest
│   │   ├── test_patient.py # TestPatientDto, CreateTestPatientRequest
│   │   ├── llm.py          # LlmRequest, LlmResponseDto
│   │   └── auth.py         # RegisterRequest, LoginRequest, AuthResponse
│   ├── routers/            # FastAPI route handlers
│   │   ├── measures.py     # /api/measures CRUD + /api/measures/full
│   │   ├── components.py   # /api/components CRUD + approve/version/category
│   │   ├── code_generation.py  # /api/measures/{id}/cql, /sql, /code
│   │   ├── import_router.py    # /api/import
│   │   ├── validation.py   # /api/validation/patients + /api/validation/evaluate
│   │   ├── llm.py          # /api/llm/complete, /extract, /assist, /providers
│   │   ├── classifier_feedback.py  # /api/classifier/feedback
│   │   └── auth.py         # /api/auth/register, /login, /me, /refresh
│   ├── services/           # Business logic
│   │   ├── measure_service.py
│   │   ├── component_service.py
│   │   ├── cql_generator_service.py
│   │   ├── hdi_sql_generator_service.py
│   │   ├── import_service.py
│   │   ├── validation_service.py
│   │   ├── test_patient_service.py
│   │   ├── llm_service.py
│   │   ├── classifier_feedback_service.py
│   │   └── auth_service.py
│   └── seeds/
│       └── seed_data.py    # Runs on startup: 9 measures + 66 components
├── alembic/                # Database migrations
│   ├── env.py
│   ├── versions/           # Migration files
│   └── seeds/
│       ├── V10_components_and_measures.sql  # eCQM seed SQL
│       └── hcc_archived/   # HCC module SQL + Java source for Oracle team
├── data/
│   └── insightforge.db     # SQLite database (dev, gitignored)
├── requirements.txt
└── .env.example

src/                        # React frontend
├── components/
│   ├── copilot/           # AND/OR.ai Co-Pilot chat interface
│   ├── ingestion/         # Document import UI (CatalogueConfirmationChip)
│   ├── layout/            # App shell (Sidebar)
│   ├── library/           # Component Library UI
│   ├── measure/           # UMS Editor, MeasureLibrary, CodeGeneration
│   ├── settings/          # Settings page with feedback dashboard
│   ├── validation/        # Test patient validation
│   └── valueset/          # Value set management
├── services/              # Frontend business logic and generators
├── stores/                # Zustand state stores
├── api/                   # Backend API clients
├── types/                 # TypeScript type definitions
├── constants/             # Static data (code systems)
├── data/                  # Sample/seed data
└── utils/                 # Utility functions
```

## State Management

The frontend uses **Zustand** with persist middleware for state management.

### measureStore.js
Primary store for measure data and UI state.

```javascript
const useMeasureStore = create(
  persist(
    (set, get) => ({
      measures: [],
      selectedMeasureId: null,
      activeTab: 'library',
      corrections: [],
      // ... actions
    }),
    { name: 'measure-storage' }
  )
)
```

**Key Actions:**
- `addMeasure(measure)` - Add new measure to library
- `updateMeasure(id, updates)` - Update measure properties
- `deleteMeasure(id)` - Remove measure
- `setSelectedMeasure(id)` - Select measure for editing
- `loadFromApi()` - Load measures from backend API
- `syncToApi(measure)` - Persist measure to backend

### componentLibraryStore.js
Store for reusable component library.

**Key Actions:**
- `addComponent(component)` - Add to library
- `updateComponent(id, updates)` - Update component
- `approve(id, approvedBy)` - Approve component
- `mergeComponents(ids, name, description)` - Create composite
- `loadFromApi()` - Load components from backend API
- `syncToApi(component)` - Persist component to backend

### settingsStore.js
Application configuration and preferences.

```javascript
{
  selectedProvider: 'anthropic' | 'openai' | 'google',
  selectedModel: string,
  vsacApiKey: string,  // VSAC key still stored client-side
}
```

### feedbackStore.js
Extraction feedback capture and prompt injection system.

**Key Actions:**
- `recordCorrection(correction)` - Capture user correction with auto-classification
- `generateExtractionGuidance(catalogueType)` - Build prompt injection text
- `getFilteredCorrections(filters)` - Query corrections
- `getPatternStats()` - Correction breakdown by pattern
- `getAccuracyMetrics()` - Calculate extraction accuracy

**Pattern Types:**
- `component_hallucination` - LLM extracted component that doesn't belong
- `component_missing` - User added component LLM missed
- `value_set_wrong` - Incorrect value set OID or codes
- `timing_wrong` - Timing expression incorrect
- `logical_operator_error` - AND/OR logic incorrect

## Data Models

### Universal Measure Spec (UMS)

The core data model representing a clinical quality measure, aligned with FHIR R4 and CQL standards.

```typescript
interface UniversalMeasureSpec {
  id: string;
  measureId: string;
  title: string;
  version: string;
  status: MeasureStatus;
  url?: string;
  effectivePeriod?: Period;
  scoring?: MeasureScoringType;
  clinicalFocus: string;
  rationale?: string;
  populations: Population[];
  valueSets: ValueSetReference[];
  steward?: string;
  measurementPeriod?: { start: string; end: string };
}
```

### Population Structure

```typescript
interface Population {
  type: PopulationType;  // 'initial-population' | 'denominator' | 'numerator' | etc.
  description: string;
  criteria: LogicalClause | DataElement | null;
  confidence?: ConfidenceLevel;
  cqlExpression?: string;
}
```

### Criteria Hierarchy

```typescript
interface LogicalClause {
  id: string;
  operator: LogicalOperator;  // 'AND' | 'OR' | 'NOT'
  children: (LogicalClause | DataElement)[];
  siblingConnections?: SiblingConnection[];
}

interface DataElement {
  id: string;
  type: QICoreResourceType;  // 'Encounter' | 'Condition' | 'Procedure' | etc.
  description: string;
  valueSet?: ValueSetReference;
  valueSets?: ValueSetReference[];
  timingRequirements?: TimingRequirement[];
  libraryComponentId?: string;
  hedis?: { collectionType: string; hybridSourceFlag: boolean };
}
```

### Component Library Types

```typescript
interface AtomicComponent {
  type: 'atomic';
  id: ComponentId;
  name: string;
  valueSet: ComponentValueSet;
  timing: TimingExpression;
  negation: boolean;
  complexity: ComponentComplexity;
  versionInfo: ComponentVersionInfo;
  catalogueDefaults?: Record<string, object>;
}

interface CompositeComponent {
  type: 'composite';
  id: ComponentId;
  name: string;
  operator: LogicalOperator;
  children: ComponentReference[];
  complexity: ComponentComplexity;
}
```

## Backend Services

### measure_service.py
Full CRUD for measures with population trees.

**Key Functions:**
- `get_all_measures(status?, search?)` - List with optional filters
- `get_all_measures_full()` - Eager-load full tree (eliminates N+1)
- `get_measure(id)` - Single measure with full population tree
- `create_measure(request)` - Create new measure
- `update_measure(id, request)` - Partial update
- `delete_measure(id)` - Cascade delete populations/clauses/elements

### component_service.py
Full CRUD for atomic and composite components.

**Key Functions:**
- `get_all_components()` - List all components
- `get_component(id)` - Single component
- `create_atomic_component(request)` - Create atomic
- `create_composite_component(request)` - Create composite
- `update_component(id, request)` - Update any component
- `approve_component(id, request)` - Approval workflow
- `create_version(id, request)` - Version management
- `set_category(id, request)` - Category assignment
- `get_stats()` - Counts by category and status
- `parse_catalogue_defaults(json_str)` / `serialize_catalogue_defaults(dict)` - HEDIS defaults

### cql_generator_service.py
Generates CQL from measures.

**Key Functions:**
- `generate_cql(measure_id)` - Standard CQL generation
- `generate_cql_component_aware(measure_id)` - Uses library component metadata
- HEDIS comments injected when `hedis.collection_type` present

### hdi_sql_generator_service.py
Generates HDI SQL with CTEs for data warehouse execution.

**Key Functions:**
- `generate_sql(measure_id, population_id?)` - HDI SQL generation
- CTE generators for each predicate type (condition, result, procedure, medication, immunization, encounter)
- HEDIS comments injected into SQL CTEs

### import_service.py
Handles bulk import of measures and components.

**Key Functions:**
- `import_data(request)` - Accepts Zustand JSON export format
- Components imported before measures (FK dependency order)
- Skips duplicates silently
- `export_data()` - Export all measures and components

### llm_service.py
Handles all LLM API interactions.

**Key Functions:**
- `complete(request)` - General completion
- `extract(request)` - Document extraction (AI ingestion pipeline)
- `assist(request)` - Co-pilot completions
- Provider chain: Anthropic → OpenAI → Google based on configured keys
- API keys live server-side in `.env` — never returned to browser

### validation_service.py
Evaluates measures against test patients.

**Key Functions:**
- `evaluate_measure(measure_id, patient_id?)` - Evaluate against test patients
- Returns detailed population traces with step-by-step results
- `get_validation_summary(measure_id)` - Aggregated pass/fail counts

### auth_service.py
JWT-based authentication.

**Key Functions:**
- `register_user(request)` - Create new user
- `authenticate_user(email, password)` - Login and return JWT
- `create_access_token(data)` - Generate JWT
- `verify_token(token)` - Validate JWT and return user
- Auth is disabled by default (`AUTH_ENABLED=false`)

## Frontend Services

### extractionService.js
Orchestrates measure extraction with feedback integration. **LLM calls now routed through `/api/llm/extract` backend endpoint** (API keys server-side).

**Key Functions:**
- `extractMeasure(skeleton, documentText, settings)` - Single-pass extraction
- `extractMeasureMultiPass(skeleton, documentText, settings)` - Multi-pass extraction

### cqlGenerator.ts
Generates CQL from UMS on the frontend for immediate preview.

### hdiSqlGenerator.ts
Generates HDI SQL queries from UMS on the frontend for immediate preview.

### copilotService.ts
AI Co-Pilot context building and message handling.

**Functions:**
- `buildCopilotContext(params)` - Build context from measure, components, code
- `buildCopilotSystemPrompt(context)` - Generate system prompt
- `sendCopilotMessage(history, context, settings)` - Send message via backend API

### componentMatcher.ts
Matches measure data elements to library components.

**Matching Strategies:**
- Exact OID match
- Fuzzy name matching
- Timing compatibility check
- Confidence scoring

## API Integration

### Backend API (FastAPI at http://localhost:8000)
- All `/api/*` routes proxied from Vite dev server
- Defined in `insight_forge_api/app/routers/`
- Auto-documented at http://localhost:8000/docs (Swagger UI)
- Health check: `GET /health`

### External Services (direct from browser)
- **VSAC API** — value set lookup (API key in settings)
- **FHIR Terminology Server** — code system validation

### Classifier Feedback API
```javascript
POST /api/classifier/feedback
{
  "documentName": "CMS125v13.pdf",
  "detectedType": "eCQM",
  "confirmedType": "MIPS_CQM",
  "confidence": "medium",
  "wasOverride": true,
  "signals": ["cms qualifier", "quality measure"]
}
```

## Data Persistence

### Backend (source of truth)
- **SQLite database** at `insight_forge_api/data/insightforge.db` (dev)
- **Oracle DB** via `oracledb` driver (prod) — configure `DATABASE_URL_ORACLE` in .env
- Schema managed by Alembic migrations
- Seeded on startup: 9 eCQM measures, 66 library components, 1 test patient
- To reset: `rm insight_forge_api/data/insightforge.db` — re-seeds on next start

### Frontend (transient UI state)
- Zustand stores with localStorage persistence remain for UI state and settings
- `settings-storage` — LLM provider preference, VSAC API key
- `feedback-storage` — Extraction corrections and feedback settings
- `component-code-storage` — Code override state
- Measures and components loaded from backend API on startup

**Note:** The localStorage `measure-storage` and `component-library-storage` keys are no longer the source of truth. Data lives in the backend database. The `/api/import` endpoint exists to migrate any data still in localStorage.

## Configuration (.env)

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./data/insightforge.db
DATABASE_URL_ORACLE=oracle+oracledb://user:password@host:1521/?service_name=ORCL

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# LLM API Keys (server-side only)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=

# Auth
JWT_SECRET=dev-secret-change-in-prod
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
AUTH_ENABLED=false

# Environment: dev | oracle
ENVIRONMENT=dev
```

## Security

- **API keys**: LLM API keys now live in backend `.env` — not in browser localStorage
- **Auth**: JWT via `python-jose`, toggled by `AUTH_ENABLED` env var
- **CORS**: Configurable via `CORS_ORIGINS` env var — not hardcoded
- **Password hashing**: bcrypt via passlib
- **Oracle production**: Set `AUTH_ENABLED=true` and configure Oracle IDCS JWT

## Theming

CSS variables support light/dark themes:

```css
:root {
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --text: #ffffff;
  --text-muted: #a0a0a0;
  --accent: #3b82f6;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

## Performance Optimizations

- **React.memo** for expensive component renders
- **useMemo/useCallback** for computed values and callbacks
- **Virtualization** for long lists (value sets, codes)
- **Lazy loading** for PDF.js worker
- **Eager loading** in backend for full measure trees (eliminates N+1)

## Future Enhancements

- ✅ Server-side persistence — FastAPI + SQLAlchemy + SQLite/Oracle
- ✅ VSAC direct integration — Real-time value set lookup
- ✅ Due Date tracking — T-Days calculation for patient outreach
- ✅ Extraction feedback loop — Correction capture and prompt injection
- ✅ Catalogue auto-detection — Signal-based document classifier
- ✅ LLM keys server-side — No longer in browser localStorage
- ⏳ HCC module port to FastAPI (Oracle team)
- ⏳ Oracle IDCS / OCI IAM auth integration
- ⏳ Collaboration — Multi-user editing with conflict resolution
- ⏳ CQL execution engine — In-browser CQL evaluation
- ⏳ FHIR Measure import — Parse existing FHIR measures
- ⏳ Audit logging — Track changes and approvals
- ⏳ Export formats — MAT XML, HQMF, additional SQL dialects
