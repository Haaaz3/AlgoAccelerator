-- V14: Replace individual age components with parameterized Age Requirement
-- This migration removes the 9 individual age threshold components and adds
-- one configurable Age Requirement component. Each measure configures its own
-- age range using thresholds on the data element.

-- Delete old individual age components
DELETE FROM library_component WHERE id IN (
    'age-12-plus',
    'age-18-plus',
    'age-18-64',
    'age-18-75',
    'age-18-85',
    'age-21-64',
    'age-45-75',
    'age-52-74',
    'age-65-plus'
);

-- Insert new parameterized Age Requirement component
INSERT INTO library_component (
    id, component_type, name, description,
    complexity_level, complexity_score,
    version_id, version_status,
    category, category_auto_assigned, source_origin,
    negation, resource_type, subtype,
    usage_count,
    created_at, created_by, updated_at, updated_by
) VALUES (
    'comp-demographic-age-requirement', 'atomic', 'Age Requirement',
    'Configurable patient age range during the measurement period. Configure age min/max and reference point (start or end of measurement period) per measure.',
    'LOW', 1, '1.0', 'APPROVED',
    'DEMOGRAPHICS', false, 'ecqi',
    false, 'Patient', 'age',
    0,
    CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP, 'system'
);

-- Note: Data elements in measures that reference old age component IDs will be
-- migrated at runtime by the frontend's migrateAgeComponent function in
-- componentLibraryStore.js. This ensures existing measures continue to work
-- and their age thresholds are preserved.
