/**
 * Measure Ingestion Service
 *
 * Orchestrates the complete measure ingestion process:
 * 1. Extract text from uploaded documents
 * 2. Use AI to extract structured measure data OR use direct parsing
 * 3. Build UMS from extracted data
 */

import { extractFromFiles, type ExtractionResult } from './documentLoader';
import { extractMeasureWithAI } from './aiExtractor';
import { extractMeasure as extractMeasureViaBackend } from './extractionService';
import { parseMeasureSpec } from '../utils/specParser';
import type { UniversalMeasureSpec } from '../types/ums';

export interface IngestionProgress {
  stage: 'loading' | 'extracting' | 'ai_processing' | 'building' | 'complete' | 'error';
  message: string;
  progress: number;
  details?: string;
}

export interface IngestionResult {
  success: boolean;
  ums?: UniversalMeasureSpec;
  documentInfo: {
    filesProcessed: number;
    totalCharacters: number;
    extractionErrors: string[];
  };
  aiInfo?: {
    tokensUsed?: number;
    model: string;
  };
  error?: string;
}

/**
 * Ingest measure specification files using AI extraction
 */
export async function ingestMeasureFiles(
  files: File[],
  apiKey: string,
  onProgress?: (progress: IngestionProgress) => void,
  provider: 'anthropic' | 'openai' | 'google' | 'custom' = 'anthropic',
  model?: string,
  customConfig?: { baseUrl: string; modelName: string }
): Promise<IngestionResult> {
  try {
    // Stage 1: Load and extract text from documents
    onProgress?.({
      stage: 'loading',
      message: `Loading ${files.length} file(s)...`,
      progress: 5,
    });

    const extractionResult = await extractFromFiles(files);

    console.log('[Measure Ingestion] Extraction result:', {
      documentsCount: extractionResult.documents.length,
      combinedContentLength: extractionResult.combinedContent.length,
      errors: extractionResult.errors,
      documentDetails: extractionResult.documents.map(d => ({
        filename: d.filename,
        contentLength: d.content.length,
        error: d.error,
      })),
    });

    onProgress?.({
      stage: 'extracting',
      message: `Extracted text from ${extractionResult.documents.length} document(s)`,
      progress: 20,
      details: `${extractionResult.combinedContent.length.toLocaleString()} characters extracted`,
    });

    if (!extractionResult.combinedContent || extractionResult.combinedContent.length < 100) {
      // Build a helpful error message based on what went wrong
      let errorMessage = 'Could not extract text from this PDF.';

      if (extractionResult.combinedContent.length === 0) {
        errorMessage = 'Could not extract any text from this PDF. The document may be image-based (scanned) or contain only graphics.';
      } else if (extractionResult.combinedContent.length < 100) {
        errorMessage = `Only ${extractionResult.combinedContent.length} characters were extracted from this PDF. The document may be mostly images or have embedded text that cannot be read.`;
      }

      if (extractionResult.errors.length > 0) {
        errorMessage += ` Errors: ${extractionResult.errors.join('; ')}`;
      }

      errorMessage += ' Please try a text-based PDF or paste the measure specification directly.';

      console.warn('[Measure Ingestion] Insufficient content extracted:', {
        contentLength: extractionResult.combinedContent.length,
        content: extractionResult.combinedContent.substring(0, 200),
      });

      return {
        success: false,
        documentInfo: {
          filesProcessed: files.length,
          totalCharacters: extractionResult.combinedContent.length,
          extractionErrors: extractionResult.errors,
        },
        error: errorMessage,
      };
    }

    // Stage 2: Use AI to extract structured data
    // Try backend extraction service first (routes through /api/llm/extract)
    // Falls back to direct API if backend fails

    const providerNames: Record<string, string> = {
      anthropic: 'Claude',
      openai: 'GPT',
      google: 'Gemini',
      custom: 'Custom LLM',
    };

    onProgress?.({
      stage: 'ai_processing',
      message: `Analyzing content with ${providerNames[provider] || provider} AI...`,
      progress: 30,
    });

    console.log('[Measure Ingestion] Sending to backend AI extraction:', {
      contentLength: extractionResult.combinedContent.length,
      contentPreview: extractionResult.combinedContent.substring(0, 500) + '...',
    });

    // Try backend extraction first (uses server-side API key)
    let aiResult: { success: boolean; ums?: UniversalMeasureSpec; error?: string; tokensUsed?: number };

    try {
      const backendResult = await extractMeasureViaBackend(extractionResult.combinedContent, {
        onProgress: (phase, message) => {
          onProgress?.({
            stage: 'ai_processing',
            message,
            progress: 30 + (phase === 'complete' ? 60 : 30),
          });
        },
      });

      if (backendResult.success && backendResult.ums) {
        console.log('[Measure Ingestion] Backend extraction successful');
        aiResult = {
          success: true,
          ums: backendResult.ums,
          tokensUsed: backendResult.tokensUsed,
        };
      } else {
        console.warn('[Measure Ingestion] Backend extraction failed:', backendResult.error);
        throw new Error(backendResult.error || 'Backend extraction failed');
      }
    } catch (backendError) {
      console.warn('[Measure Ingestion] Backend extraction failed, trying direct API:', backendError);

      // Fall back to direct API call if backend fails and API key is provided
      if (!apiKey) {
        return {
          success: false,
          documentInfo: {
            filesProcessed: files.length,
            totalCharacters: extractionResult.combinedContent.length,
            extractionErrors: extractionResult.errors,
          },
          error: 'Backend AI extraction failed and no frontend API key is configured. Please configure your API key in settings or ensure the backend LLM is configured.',
        };
      }

      onProgress?.({
        stage: 'ai_processing',
        message: `Backend unavailable, using direct ${providerNames[provider] || provider} API...`,
        progress: 35,
      });

      console.log('[Measure Ingestion] Falling back to direct API:', {
        provider,
        model,
      });

      aiResult = await extractMeasureWithAI(
        extractionResult.combinedContent,
        apiKey,
        (aiProgress) => {
          onProgress?.({
            stage: 'ai_processing',
            message: aiProgress.message,
            progress: 30 + (aiProgress.progress * 0.6),
          });
        },
        provider,
        model,
        customConfig,
        extractionResult.pageImages
      );
    }

    if (!aiResult.success || !aiResult.ums) {
      return {
        success: false,
        documentInfo: {
          filesProcessed: files.length,
          totalCharacters: extractionResult.combinedContent.length,
          extractionErrors: extractionResult.errors,
        },
        error: aiResult.error || 'AI extraction failed to produce valid results',
      };
    }

    // Stage 3: Finalize
    onProgress?.({
      stage: 'complete',
      message: 'Measure ingestion complete',
      progress: 100,
    });

    // Update source documents
    aiResult.ums.metadata.sourceDocuments = files.map(f => f.name);

    return {
      success: true,
      ums: aiResult.ums,
      documentInfo: {
        filesProcessed: files.length,
        totalCharacters: extractionResult.combinedContent.length,
        extractionErrors: extractionResult.errors,
      },
      aiInfo: {
        tokensUsed: aiResult.tokensUsed,
        model: model || 'default',
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    onProgress?.({
      stage: 'error',
      message: errorMessage,
      progress: 0,
    });

    return {
      success: false,
      documentInfo: {
        filesProcessed: files.length,
        totalCharacters: 0,
        extractionErrors: [errorMessage],
      },
      error: errorMessage,
    };
  }
}

