-- Add catalogue_defaults column to library_component table
-- Stores JSON object with catalogue-specific defaults for components
-- Example: {"hedis": {"collectionType": "administrative", "hybridSourceFlag": false}}
-- These defaults are used as initial values when adding components to HEDIS measures

ALTER TABLE library_component ADD COLUMN catalogue_defaults TEXT;
