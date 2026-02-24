package com.algoaccel.dto.mapper;

import com.algoaccel.dto.request.CreateMeasureRequest;
import com.algoaccel.dto.request.UpdateMeasureRequest;
import com.algoaccel.dto.response.*;
import com.algoaccel.model.enums.ConfidenceLevel;
import com.algoaccel.model.enums.Gender;
import com.algoaccel.model.enums.MeasureProgram;
import com.algoaccel.model.enums.MeasureStatus;
import com.algoaccel.model.measure.*;
import com.algoaccel.service.MeasureEvaluatorService;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Mapper for converting between Measure entities and DTOs.
 */
@Component
public class MeasureMapper {

    /**
     * Convert Measure entity to full DTO (eagerly resolves full tree).
     */
    public MeasureDto toDto(Measure entity) {
        if (entity == null) {
            return null;
        }

        return new MeasureDto(
            entity.getId(),
            entity.getMeasureId(),
            entity.getTitle(),
            entity.getVersion(),
            entity.getSteward(),
            entity.getProgram() != null ? entity.getProgram().name() : null,
            entity.getMeasureType(),
            entity.getDescription(),
            entity.getRationale(),
            entity.getClinicalRecommendation(),
            entity.getPeriodStart(),
            entity.getPeriodEnd(),
            toGlobalConstraintsDto(entity.getGlobalConstraints()),
            entity.getStatus() != null ? entity.getStatus().name() : null,
            entity.getOverallConfidence() != null ? entity.getOverallConfidence().name() : null,
            entity.getLockedAt(),
            entity.getLockedBy(),
            entity.getPopulations().stream()
                .map(this::toPopulationDto)
                .collect(Collectors.toList()),
            entity.getValueSets().stream()
                .map(this::toValueSetDto)
                .collect(Collectors.toList()),
            entity.getCorrections().stream()
                .map(this::toCorrectionDto)
                .collect(Collectors.toList()),
            entity.getGeneratedCql(),
            entity.getGeneratedSql(),
            entity.getCreatedAt(),
            entity.getCreatedBy(),
            entity.getUpdatedAt(),
            entity.getUpdatedBy()
        );
    }

    /**
     * Convert Measure entity to summary DTO.
     */
    public MeasureSummaryDto toSummaryDto(Measure entity) {
        if (entity == null) {
            return null;
        }

        return new MeasureSummaryDto(
            entity.getId(),
            entity.getMeasureId(),
            entity.getTitle(),
            entity.getProgram() != null ? entity.getProgram().name() : null,
            entity.getStatus() != null ? entity.getStatus().name() : null,
            entity.getPopulations() != null ? entity.getPopulations().size() : 0,
            entity.getUpdatedAt()
        );
    }

    /**
     * Convert Population entity to DTO.
     */
    public PopulationDto toPopulationDto(Population entity) {
        if (entity == null) {
            return null;
        }

        return new PopulationDto(
            entity.getId(),
            entity.getPopulationType() != null ? entity.getPopulationType().name() : null,
            entity.getDescription(),
            entity.getNarrative(),
            toClauseDto(entity.getRootClause()),
            entity.getDisplayOrder() != null ? entity.getDisplayOrder() : 0,
            entity.getConfidence() != null ? entity.getConfidence().name() : null,
            entity.getReviewStatus() != null ? entity.getReviewStatus().name() : null,
            entity.getReviewNotes(),
            entity.getCqlDefinition(),
            entity.getCqlDefinitionName()
        );
    }

    /**
     * Convert LogicalClause entity to DTO (recursive).
     */
    public LogicalClauseDto toClauseDto(LogicalClause entity) {
        if (entity == null) {
            return null;
        }

        return new LogicalClauseDto(
            entity.getId(),
            entity.getOperator() != null ? entity.getOperator().name() : null,
            entity.getDescription(),
            entity.getDisplayOrder() != null ? entity.getDisplayOrder() : 0,
            entity.getChildClauses().stream()
                .map(this::toClauseDto)
                .collect(Collectors.toList()),
            entity.getDataElements().stream()
                .map(this::toElementDto)
                .collect(Collectors.toList())
        );
    }

    /**
     * Convert DataElement entity to DTO.
     */
    public DataElementDto toElementDto(DataElement entity) {
        if (entity == null) {
            return null;
        }

        // Map value sets with their codes
        List<DataElementDto.ValueSetRefDto> valueSetRefs = entity.getValueSets().stream()
            .map(vs -> new DataElementDto.ValueSetRefDto(
                vs.getId(),
                vs.getOid(),
                vs.getName(),
                vs.getVersion(),
                vs.getSource(),
                vs.getVerified() != null && vs.getVerified(),
                vs.getCodes().stream()
                    .map(this::toValueSetCodeDto)
                    .collect(Collectors.toList())
            ))
            .collect(Collectors.toList());

        return new DataElementDto(
            entity.getId(),
            entity.getElementType() != null ? entity.getElementType().name() : null,
            entity.getResourceType(),
            entity.getDescription(),
            entity.getLibraryComponent() != null ? entity.getLibraryComponent().getId() : null,
            entity.isNegation(),
            entity.getNegationRationale(),
            entity.getGenderValue() != null ? entity.getGenderValue().name() : null,
            toThresholdDto(entity.getThresholds()),
            entity.getTimingOverride(),
            entity.getTimingWindow(),
            entity.getAdditionalRequirements(),
            entity.getConfidence() != null ? entity.getConfidence().name() : null,
            entity.getReviewStatus() != null ? entity.getReviewStatus().name() : null,
            entity.getDisplayOrder() != null ? entity.getDisplayOrder() : 0,
            valueSetRefs
        );
    }

    /**
     * Convert ThresholdRange to DTO.
     */
    private DataElementDto.ThresholdDto toThresholdDto(ThresholdRange entity) {
        if (entity == null) {
            return null;
        }

        return new DataElementDto.ThresholdDto(
            entity.getAgeMin(),
            entity.getAgeMax(),
            entity.getValueMin(),
            entity.getValueMax(),
            entity.getComparator(),
            entity.getUnit()
        );
    }

    /**
     * Convert GlobalConstraints to DTO.
     */
    private MeasureDto.GlobalConstraintsDto toGlobalConstraintsDto(GlobalConstraints entity) {
        if (entity == null) {
            return null;
        }

        return new MeasureDto.GlobalConstraintsDto(
            entity.getAgeMin(),
            entity.getAgeMax(),
            entity.getAgeCalculation(),
            entity.getGender() != null ? entity.getGender().name() : null,
            null, // measurementPeriodType not in entity
            null  // measurementPeriodAnchor not in entity
        );
    }

    /**
     * Convert MeasureValueSet entity to DTO.
     */
    public MeasureValueSetDto toValueSetDto(MeasureValueSet entity) {
        if (entity == null) {
            return null;
        }

        return new MeasureValueSetDto(
            entity.getId(),
            entity.getOid(),
            entity.getUrl(),
            entity.getName(),
            entity.getVersion(),
            entity.getPublisher(),
            entity.getPurpose(),
            entity.getConfidence() != null ? entity.getConfidence().name() : null,
            entity.getVerified() != null && entity.getVerified(),
            entity.getSource(),
            entity.getCodes().stream()
                .map(this::toValueSetCodeDto)
                .collect(Collectors.toList())
        );
    }

    /**
     * Convert ValueSetCode entity to DTO.
     */
    public ValueSetCodeDto toValueSetCodeDto(ValueSetCode entity) {
        if (entity == null) {
            return null;
        }

        return new ValueSetCodeDto(
            entity.getId(),
            entity.getCode(),
            entity.getCodeSystem() != null ? entity.getCodeSystem().name() : entity.getSystemUri(),
            entity.getDisplay(),
            entity.getVersion()
        );
    }

    /**
     * Convert MeasureCorrection entity to DTO.
     */
    public CorrectionDto toCorrectionDto(MeasureCorrection entity) {
        if (entity == null) {
            return null;
        }

        return new CorrectionDto(
            entity.getId(),
            entity.getCorrectionType() != null ? entity.getCorrectionType().name() : null,
            entity.getUserNotes(),
            null, // author not stored in entity
            entity.getTimestamp(),
            entity.getComponentPath(),
            entity.getOriginalValue(),
            entity.getCorrectedValue()
        );
    }

    /**
     * Convert CreateMeasureRequest to Measure entity.
     */
    public Measure toEntity(CreateMeasureRequest request) {
        if (request == null) {
            return null;
        }

        Measure measure = new Measure();
        measure.setId(UUID.randomUUID().toString());
        measure.setMeasureId(request.measureId());
        measure.setTitle(request.title());
        measure.setVersion(request.version());
        measure.setSteward(request.steward());
        measure.setDescription(request.description());
        measure.setRationale(request.rationale());
        measure.setClinicalRecommendation(request.clinicalRecommendation());
        measure.setPeriodStart(request.periodStart());
        measure.setPeriodEnd(request.periodEnd());
        measure.setMeasureType(request.measureType());

        if (request.program() != null) {
            try {
                measure.setProgram(MeasureProgram.valueOf(request.program()));
            } catch (IllegalArgumentException e) {
                // Invalid program, leave null
            }
        }

        if (request.status() != null) {
            try {
                measure.setStatus(MeasureStatus.valueOf(request.status()));
            } catch (IllegalArgumentException e) {
                measure.setStatus(MeasureStatus.IN_PROGRESS);
            }
        } else {
            measure.setStatus(MeasureStatus.IN_PROGRESS);
        }

        if (request.globalConstraints() != null) {
            measure.setGlobalConstraints(toGlobalConstraintsEntity(request.globalConstraints()));
        }

        return measure;
    }

    /**
     * Apply partial updates from UpdateMeasureRequest to existing Measure entity.
     */
    public void updateEntity(Measure entity, UpdateMeasureRequest request) {
        if (request == null || entity == null) {
            return;
        }

        if (request.measureId() != null) {
            entity.setMeasureId(request.measureId());
        }
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.version() != null) {
            entity.setVersion(request.version());
        }
        if (request.steward() != null) {
            entity.setSteward(request.steward());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        if (request.rationale() != null) {
            entity.setRationale(request.rationale());
        }
        if (request.clinicalRecommendation() != null) {
            entity.setClinicalRecommendation(request.clinicalRecommendation());
        }
        if (request.periodStart() != null) {
            entity.setPeriodStart(request.periodStart());
        }
        if (request.periodEnd() != null) {
            entity.setPeriodEnd(request.periodEnd());
        }
        if (request.measureType() != null) {
            entity.setMeasureType(request.measureType());
        }
        if (request.program() != null) {
            try {
                entity.setProgram(MeasureProgram.valueOf(request.program()));
            } catch (IllegalArgumentException e) {
                // Invalid program, ignore
            }
        }
        if (request.status() != null) {
            try {
                entity.setStatus(MeasureStatus.valueOf(request.status()));
            } catch (IllegalArgumentException e) {
                // Invalid status, ignore
            }
        }
        if (request.overallConfidence() != null) {
            try {
                entity.setOverallConfidence(ConfidenceLevel.valueOf(request.overallConfidence()));
            } catch (IllegalArgumentException e) {
                // Invalid confidence, ignore
            }
        }
        if (request.globalConstraints() != null) {
            entity.setGlobalConstraints(toGlobalConstraintsEntity(request.globalConstraints()));
        }
    }

    /**
     * Convert GlobalConstraintsRequest to entity.
     */
    private GlobalConstraints toGlobalConstraintsEntity(CreateMeasureRequest.GlobalConstraintsRequest request) {
        if (request == null) {
            return null;
        }

        GlobalConstraints gc = new GlobalConstraints();
        gc.setAgeMin(request.ageMin());
        gc.setAgeMax(request.ageMax());
        gc.setAgeCalculation(request.ageCalculation());

        if (request.gender() != null) {
            try {
                gc.setGender(Gender.valueOf(request.gender()));
            } catch (IllegalArgumentException e) {
                // Invalid gender, leave null
            }
        }

        return gc;
    }

    /**
     * Convert GlobalConstraintsRequest to entity (for update).
     */
    private GlobalConstraints toGlobalConstraintsEntity(UpdateMeasureRequest.GlobalConstraintsRequest request) {
        if (request == null) {
            return null;
        }

        GlobalConstraints gc = new GlobalConstraints();
        gc.setAgeMin(request.ageMin());
        gc.setAgeMax(request.ageMax());
        gc.setAgeCalculation(request.ageCalculation());

        if (request.gender() != null) {
            try {
                gc.setGender(Gender.valueOf(request.gender()));
            } catch (IllegalArgumentException e) {
                // Invalid gender, leave null
            }
        }

        return gc;
    }

    /**
     * Convert ValidationTrace to DTO.
     */
    public ValidationTraceDto toValidationTraceDto(MeasureEvaluatorService.ValidationTrace trace) {
        if (trace == null) {
            return null;
        }

        return new ValidationTraceDto(
            trace.getPatientId(),
            trace.getPatientName(),
            trace.getPatientGender(),
            trace.getNarrative(),
            trace.getFinalOutcome(),
            trace.getPreCheckResults().stream()
                .map(this::toPreCheckResultDto)
                .collect(Collectors.toList()),
            trace.getPopulationResults().stream()
                .map(this::toPopulationResultDto)
                .collect(Collectors.toList()),
            trace.getHowClose()
        );
    }

    private ValidationTraceDto.PreCheckResultDto toPreCheckResultDto(MeasureEvaluatorService.EvaluationResult result) {
        return new ValidationTraceDto.PreCheckResultDto(
            result.getCheckType(),
            result.isMet(),
            result.getDescription()
        );
    }

    private ValidationTraceDto.PopulationResultDto toPopulationResultDto(MeasureEvaluatorService.PopulationResult result) {
        return new ValidationTraceDto.PopulationResultDto(
            result.getPopulationType(),
            result.isMet(),
            result.getNodes().stream()
                .map(this::toValidationNodeDto)
                .collect(Collectors.toList())
        );
    }

    private ValidationTraceDto.ValidationNodeDto toValidationNodeDto(MeasureEvaluatorService.ValidationNode node) {
        return new ValidationTraceDto.ValidationNodeDto(
            node.getId(),
            node.getTitle(),
            node.getType(),
            node.getDescription(),
            node.getStatus(),
            node.getFacts() != null ? node.getFacts().stream()
                .map(this::toValidationFactDto)
                .collect(Collectors.toList()) : null,
            node.getChildren() != null ? node.getChildren().stream()
                .map(this::toValidationNodeDto)
                .collect(Collectors.toList()) : null
        );
    }

    private ValidationTraceDto.ValidationFactDto toValidationFactDto(MeasureEvaluatorService.ValidationFact fact) {
        return new ValidationTraceDto.ValidationFactDto(
            fact.getCode(),
            fact.getDisplay(),
            fact.getDate(),
            fact.getSource()
        );
    }
}
