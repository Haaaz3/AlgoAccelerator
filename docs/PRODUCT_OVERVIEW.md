# AlgoAccelerator - Product Overview

## What is AlgoAccelerator?

AlgoAccelerator is a comprehensive platform for developing, validating, and deploying clinical quality measures (CQMs). It transforms the traditionally labor-intensive process of measure implementation by leveraging AI-assisted workflows, reusable component libraries, and multi-format code generation.

## The Problem

Healthcare quality measures (e.g., "% of diabetic patients with controlled blood sugar") are defined in dense PDF documents that require:
- Reading 50+ page specifications
- Manually extracting hundreds of medical codes
- Writing complex logic in specialized languages (CQL, SQL)
- Testing against patient scenarios
- Weeks to months of development time per measure

## The Solution

AlgoAccelerator automates this process:

1. **Upload** a measure specification (PDF, HTML, Excel)
2. **AI extracts** clinical logic, codes, and requirements
3. **Review & approve** extracted content with human oversight
4. **Test** against synthetic patients to validate correctness
5. **Export** production-ready code (CQL, SQL)

## Key Features

### Measure Library
- Browse and manage all quality measures
- Upload specifications via drag-and-drop
- Batch processing queue for multiple measures
- Status tracking (In Progress / Published)
- Lock/unlock for version control

### UMS Editor (Universal Measure Specification)
- Visual tree-based editor for measure logic
- AND/OR/NOT operators with clickable toggles
- Population-based structure (IPP, Denominator, Numerator, Exclusions)
- Inline value set and timing editing
- Deep Edit mode for advanced operations

### Component Library
- Reusable building blocks across measures
- Atomic components (single value set + timing)
- Composite components (collections with logic)
- Version management with approval workflow
- Automatic usage tracking across measures
- Shared edit warnings for multi-measure components

### Code Generation
- CQL (Clinical Quality Language) for FHIR-based systems
- Standard SQL for traditional databases
- Synapse SQL for Azure cloud analytics
- Per-component code with override support
- Syntax highlighting and validation

### Test Validation
- Pre-loaded synthetic test patients
- Step-by-step evaluation traces
- Pass/fail indicators per population
- "How close" analysis for near-misses

### Value Set Management
- Aggregated view across all measures
- Code search and bulk import
- Multiple code system support (ICD-10, CPT, SNOMED, LOINC, etc.)
- VSAC integration for standard value sets

## Target Users

| Role | Primary Use |
|------|-------------|
| Clinical Informaticist | Reviews AI extraction for clinical accuracy |
| Quality Analyst | Uploads specs, tracks review progress |
| eCQM Developer | Uses generated code, validates with test patients |
| Health IT Director | Customizes measures, validates against populations |

## Key Metrics Impact

| Metric | Before | After |
|--------|--------|-------|
| Time to implement one measure | 2-4 weeks | 2-4 hours |
| Manual code entry errors | Common | Near zero |
| Code review coverage | Variable | 100% required |

## Healthcare Standards Compliance

- **FHIR R4** - Data model and Measure resource alignment
- **QI-Core** - Profiles for quality improvement
- **CQL** - Clinical Quality Language standard
- **VSAC** - Value Set Authority Center integration

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| PDF Parsing | PDF.js |
| Backend | Spring Boot 3.2 (Java 17) |
| Database | H2 (dev) / PostgreSQL (prod) |
| API | RESTful JSON |

## Data Storage

**Hybrid Architecture:** Data persists both in browser localStorage and server-side database:

**Server-Side (Primary):**
- Measures with full population structure
- Component library with version history
- Test patients and validation traces

**Client-Side (Cache/Fallback):**
- Local state for fast UI interactions
- Offline capability for viewing
- Settings and API keys

**Data Flow:**
- On app load: fetch from backend API, merge with local cache
- On import: sync to backend, auto-create components from data elements
- On edit: update local state immediately, persist to backend async

## Getting Started

```bash
# Install frontend dependencies
npm install

# Start backend (in separate terminal)
cd backend && ./mvnw spring-boot:run

# Start frontend development server
npm run dev

# Build for production
npm run build
```

**URLs:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`

## AI Extraction Pipeline

The AI-guided measure extraction uses a hybrid approach:

1. **Direct API Calls (Preferred):** When an API key is configured in settings, extraction calls go directly from the browser to the LLM provider (Anthropic, OpenAI, Google). This provides faster response times and avoids backend timeout issues.

2. **Backend Proxy (Fallback):** If no frontend API key is configured, requests route through the Spring Boot backend, which handles timeout management and connection pooling.

The extraction pipeline automatically:
- Parses population structures (IPP, Denominator, Numerator, Exclusions)
- Extracts value sets with code references
- Creates component library entries from data elements
- Links measures to existing library components
