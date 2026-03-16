"""
Seed initial data for Insight Forge.
Ported from Spring Boot Flyway migrations V9 and V10.
"""
import logging
import os
from datetime import date
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.component import LibraryComponent
from app.models.validation import TestPatient

logger = logging.getLogger(__name__)

# Path to the V10 SQL seed file
SEEDS_DIR = Path(__file__).parent.parent.parent / "alembic" / "seeds"
V10_SQL_FILE = SEEDS_DIR / "V10_components_and_measures.sql"


async def check_seeds_needed(session: AsyncSession) -> bool:
    """Check if seeds have already been applied."""
    result = await session.execute(
        select(LibraryComponent).where(LibraryComponent.id == "age-12-plus")
    )
    return result.scalar_one_or_none() is None


async def seed_database(session: AsyncSession) -> None:
    """Seed the database with initial data if not already seeded."""

    if not await check_seeds_needed(session):
        logger.info("Seeds already applied, skipping")
        return

    logger.info("Seeding database with initial data...")

    # =========================================================================
    # V9: Basic patient sex components and test patient
    # =========================================================================

    # Patient Sex components (from V9, not in V10)
    session.add(LibraryComponent(
        id="patient-sex-female",
        component_type="atomic",
        name="Patient Sex: Female",
        description='Patient administrative gender is female (FHIR Patient.gender = "female")',
        complexity_level="LOW",
        complexity_score=1,
        version_id="1.0",
        version_status="APPROVED",
        category="DEMOGRAPHICS",
        category_auto_assigned=False,
        source_origin="ecqi",
        value_set_oid="2.16.840.1.113883.4.642.3.1",
        value_set_name="Administrative Gender",
        value_set_version="FHIR R4",
        timing_operator="DURING",
        timing_reference="Measurement Period",
        timing_display="N/A - Patient demographic",
        negation=False,
        resource_type="Patient",
        gender_value="FEMALE",
        created_by="system",
        updated_by="system",
    ))

    session.add(LibraryComponent(
        id="patient-sex-male",
        component_type="atomic",
        name="Patient Sex: Male",
        description='Patient administrative gender is male (FHIR Patient.gender = "male")',
        complexity_level="LOW",
        complexity_score=1,
        version_id="1.0",
        version_status="APPROVED",
        category="DEMOGRAPHICS",
        category_auto_assigned=False,
        source_origin="ecqi",
        value_set_oid="2.16.840.1.113883.4.642.3.1",
        value_set_name="Administrative Gender",
        value_set_version="FHIR R4",
        timing_operator="DURING",
        timing_reference="Measurement Period",
        timing_display="N/A - Patient demographic",
        negation=False,
        resource_type="Patient",
        gender_value="MALE",
        created_by="system",
        updated_by="system",
    ))

    session.add(LibraryComponent(
        id="age-65-plus",
        component_type="atomic",
        name="Age 65 and Older",
        description="Patient age is 65 years or older during the measurement period",
        complexity_level="LOW",
        complexity_score=1,
        version_id="1.0",
        version_status="APPROVED",
        category="DEMOGRAPHICS",
        category_auto_assigned=False,
        source_origin="ecqi",
        timing_operator="DURING",
        timing_reference="Measurement Period",
        timing_display="Age >= 65 during Measurement Period",
        negation=False,
        resource_type="Patient",
        created_by="system",
        updated_by="system",
    ))

    # Test patient
    session.add(TestPatient(
        id="test-patient-001",
        name="Paul Atreides",
        birth_date=date(1970, 6, 15),
        gender="male",
        race="White",
        ethnicity="Non-Hispanic",
        diagnoses='[{"code":"I10","system":"ICD10CM","display":"Essential Hypertension","onsetDate":"2020-01-15"}]',
        encounters='[{"code":"99213","system":"CPT","display":"Office Visit","date":"2024-03-15","type":"outpatient"}]',
        procedures='[{"code":"45378","system":"CPT","display":"Colonoscopy","date":"2022-06-01"}]',
        observations='[{"code":"4548-4","system":"LOINC","display":"HbA1c","value":6.2,"unit":"%","date":"2024-02-01"}]',
        medications='[{"code":"314076","system":"RxNorm","display":"Lisinopril 10mg","startDate":"2020-02-01","status":"active"}]',
        immunizations="[]",
    ))

    # Commit V9 data first
    await session.commit()
    logger.info("V9 seed data (patient sex components and test patient) committed")

    # =========================================================================
    # V10: Full component library and 9 measures via SQL file
    # =========================================================================

    if V10_SQL_FILE.exists():
        logger.info(f"Loading V10 seeds from {V10_SQL_FILE}")
        sql_content = V10_SQL_FILE.read_text()

        # Split into individual statements and execute
        # Filter out comments and empty lines
        statements = []
        current_stmt = []

        for line in sql_content.split('\n'):
            stripped = line.strip()
            # Skip comment-only lines
            if stripped.startswith('--') or not stripped:
                continue
            current_stmt.append(line)
            # Check if this line ends a statement
            if stripped.endswith(';'):
                full_stmt = '\n'.join(current_stmt)
                statements.append(full_stmt)
                current_stmt = []

        logger.info(f"Executing {len(statements)} SQL statements from V10")

        executed = 0
        for stmt in statements:
            try:
                await session.execute(text(stmt))
                executed += 1
            except Exception as e:
                error_str = str(e)
                # Skip duplicate key errors (idempotent seeding)
                if "UNIQUE constraint failed" in error_str or "duplicate key" in error_str.lower():
                    logger.debug(f"Skipping duplicate: {stmt[:80]}...")
                else:
                    # Log other errors clearly
                    logger.error(f"Seed statement failed: {error_str}")
                    logger.error(f"Failed SQL: {stmt[:200]}...")
                    raise

        await session.commit()
        logger.info(f"V10 seed data committed ({executed} statements executed)")
    else:
        logger.warning(f"V10 SQL file not found at {V10_SQL_FILE}")

    logger.info("Database seeding complete")
