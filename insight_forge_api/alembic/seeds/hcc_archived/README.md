# HCC Module — Archived SQL (Not Yet Ported to FastAPI)

These are the original Spring Boot Flyway migrations for the HCC
(Hierarchical Condition Category) module. They were not ported to FastAPI
as part of the initial Spring Boot → FastAPI migration. The Oracle team
will handle this separately.

## Files

| File | Contents |
|------|----------|
| V15__hcc_schema.sql | Full HCC schema — all tables and indexes |
| V16__hcc_synthetic_data.sql | Synthetic HCC patient data |
| V17__hcc_hiv_rule_seed.sql | HIV suspect rule definitions |
| V18__ckd_rule_seeds.sql | CKD rule definitions |
| V19__ckd_synthetic_patients.sql | CKD synthetic patients |

## Java source files (now deleted — recover from git history)

The original Java implementation lives in git history under commit d40859f.
To recover any Java file:

    git show d40859f:backend/src/main/java/com/algoaccel/hcc/<path>

Key files to recover when porting:
- hcc/model/          — JPA entities (port to app/models/hcc.py)
- hcc/service/        — Business logic (port to app/services/hcc/)
- hcc/controller/     — REST endpoints (port to app/routers/hcc.py)
- hcc/repository/     — Spring Data repos (replace with SQLAlchemy queries)
- hcc/dto/            — DTOs (port to app/schemas/hcc.py)

## Steps to port this later

1. Create app/models/hcc.py — port entities from hcc/model/
2. Run: alembic revision -m "hcc_schema"
   Port V15 table definitions into upgrade() / downgrade()
3. Run: alembic revision -m "hcc_seeds"
   Port V16-V19 INSERT statements, fixing H2 syntax (TRUE→1, FALSE→0)
4. Create app/services/hcc/ — port from hcc/service/
5. Create app/routers/hcc.py — port from hcc/controller/
6. Add hcc router to app/main.py
