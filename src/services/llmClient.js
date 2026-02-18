/**
 * Unified LLM Client
 *
 * Provides a single interface for calling multiple LLM providers (Anthropic, OpenAI, Google, Custom).
 * Supports vision-based extraction, conversation history, and optional Zod schema validation.
 *
 * This eliminates code duplication across aiExtractor.ts, aiAssistant.ts, and MeasureCreator.tsx.
 *
 * Supports two modes:
 * 1. Direct mode (default): Calls LLM APIs directly from the browser (requires API keys in frontend)
 * 2. Backend proxy mode: Routes calls through the backend server (API keys stored server-side)
 */

                             

// =============================================================================
// TYPES
// =============================================================================

                                                                       

                                  
                  
                    
                  
 

                             
                                        
                  
 

                                    
                                
                        

                                                                                        
                

                                                                       
                  

                                                                        
                        

                                                              
                      

                                                                   
                          

                                                          
                    

                                   
                     

                                                                                
                                 

                                                                      
                     

                                                                      
                            

                                                                                   
                                                      
 

                              
                              
                  

                                                
                      
 

// =============================================================================
// API ENDPOINTS
// =============================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Default models for each provider
export const DEFAULT_MODELS                                                 = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-1.5-pro',
};

// =============================================================================
// PROVIDER-SPECIFIC IMPLEMENTATIONS
// =============================================================================

/**
 * Call Anthropic (Claude) API
 * Supports vision via images parameter
 */
async function callAnthropic(options                   )                       {
  const { apiKey, model, systemPrompt, userPrompt, messages, images, maxTokens = 8000 } = options;

  // Build message content
  let messageContent     ;

  if (images && images.length > 0) {
    // Vision mode: images + text
    const contentBlocks        = [];

    for (const imageBase64 of images) {
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: imageBase64,
        },
      });
    }

    contentBlocks.push({
      type: 'text',
      text: userPrompt || '',
    });

    messageContent = contentBlocks;
  } else {
    messageContent = userPrompt || '';
  }

  // Build messages array
  const apiMessages = messages
    ? messages.filter(m => m.role !== 'system').map(m => ({ role: m.role                        , content: m.content }))
    : [{ role: 'user'         , content: messageContent }];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

/**
 * Call OpenAI (GPT) API
 * Supports vision via images parameter (for gpt-4o and similar models)
 */
async function callOpenAI(options                   )                       {
  const { apiKey, model, systemPrompt, userPrompt, messages, images, maxTokens = 8000, jsonMode } = options;

  // Build message content
  let userContent     ;

  if (images && images.length > 0) {
    // Vision mode: images + text for GPT-4o
    const contentParts        = [];

    for (const imageBase64 of images) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imageBase64}`,
          detail: 'high',
        },
      });
    }

    contentParts.push({
      type: 'text',
      text: userPrompt || '',
    });

    userContent = contentParts;
  } else {
    userContent = userPrompt || '';
  }

  // Build messages array
  const apiMessages        = [];

  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }

  if (messages) {
    apiMessages.push(...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    })));
  } else {
    apiMessages.push({ role: 'user', content: userContent });
  }

  const body      = {
    model,
    max_tokens: maxTokens,
    messages: apiMessages,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
  };
}

/**
 * Call Google (Gemini) API
 * Supports vision via images parameter
 */
async function callGoogle(options                   )                       {
  const { apiKey, model, systemPrompt, userPrompt, messages, images, maxTokens = 8000, jsonMode } = options;

  const url = `${GOOGLE_API_URL}/${model}:generateContent?key=${apiKey}`;

  // Build content parts
  const parts        = [];

  // Add images if provided (vision mode)
  if (images && images.length > 0) {
    for (const imageBase64 of images) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: imageBase64,
        },
      });
    }
  }

  // Build text content
  if (messages) {
    // Conversation mode: combine system prompt with first user message
    const systemText = systemPrompt ? `${systemPrompt}\n\n` : '';
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    parts.push({ text: systemText + conversationText });
  } else {
    // Single prompt mode
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
    parts.push({ text: fullPrompt || '' });
  }

  const body      = {
    contents: [{ parts }],
    generationConfig: {
      maxOutputTokens: maxTokens,
    },
  };

  if (jsonMode) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokensUsed: data.usageMetadata?.totalTokenCount,
  };
}

/**
 * Call Custom/Local LLM API (OpenAI-compatible format)
 */
async function callCustom(options                   )                       {
  const { apiKey, model, systemPrompt, userPrompt, messages, maxTokens = 8000, customConfig } = options;

  if (!customConfig?.baseUrl) {
    throw new Error('Custom LLM base URL is required');
  }

  const url = `${customConfig.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const effectiveApiKey = customConfig.apiKey || apiKey;

  const headers                         = {
    'Content-Type': 'application/json',
  };
  if (effectiveApiKey) {
    headers['Authorization'] = `Bearer ${effectiveApiKey}`;
  }

  // Build messages array
  const apiMessages        = [];

  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }

  if (messages) {
    apiMessages.push(...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    })));
  } else if (userPrompt) {
    apiMessages.push({ role: 'user', content: userPrompt });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: customConfig.modelName || model,
      max_tokens: maxTokens,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Custom LLM API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
  };
}

// =============================================================================
// BACKEND PROXY
// =============================================================================

/**
 * Call LLM through the backend proxy.
 * API keys are stored server-side, not exposed to the browser.
 */
async function callLLMViaBackend(options                   )                       {
  const { provider, model, systemPrompt, userPrompt, images, maxTokens, backendEndpoint = 'complete' } = options;

  const endpoint = `/api/llm/${backendEndpoint}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      model,
      systemPrompt,
      userPrompt,
      images,
      maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.content || errorData.message || `Backend LLM error: ${response.status}`);
  }

  const data = await response.json();

  // Check if the response contains an error
  if (data.content?.startsWith('Error:')) {
    throw new Error(data.content);
  }

  return {
    content: data.content,
    tokensUsed: data.tokensUsed,
  };
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Call an LLM with the given options.
 * Automatically routes to the appropriate provider implementation.
 * If useBackendProxy is true, routes through the backend server.
 */
export async function callLLM(options                   )                       {
  const { provider, apiKey, customConfig, useBackendProxy } = options;

  // Use backend proxy if requested
  if (useBackendProxy) {
    return callLLMViaBackend(options);
  }

  // Direct mode: validate API key (except for custom where it might be optional)
  if (provider !== 'custom' && !apiKey) {
    throw new Error(`API key is required for ${provider} provider`);
  }

  if (provider === 'custom' && !customConfig?.baseUrl) {
    throw new Error('Custom LLM base URL is required');
  }

  switch (provider) {
    case 'anthropic':
      return callAnthropic(options);
    case 'openai':
      return callOpenAI(options);
    case 'google':
      return callGoogle(options);
    case 'custom':
      return callCustom(options);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Call an LLM and parse the response as JSON.
 * Automatically extracts JSON from markdown code blocks if needed.
 */
export async function callLLMForJSON             (options                   )                                                            {
  // Enable JSON mode for providers that support it
  const jsonOptions = {
    ...options,
    jsonMode: options.provider === 'openai' || options.provider === 'google',
  };

  const response = await callLLM(jsonOptions);
  const content = response.content;

  // Try to parse as JSON
  let parsed   ;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonContent = jsonMatch ? jsonMatch[1] : content;

    // Try to find a JSON object in the content
    const objectMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      parsed = JSON.parse(objectMatch[0]);
    } else {
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  return {
    content: parsed,
    raw: content,
    tokensUsed: response.tokensUsed,
  };
}

/**
 * Call an LLM and validate the response against a Zod schema.
 * Returns typed data or throws a validation error.
 */
export async function callLLMWithSchema   (
  options                   ,
  schema              
)                                                            {
  const { content, raw, tokensUsed } = await callLLMForJSON         (options);

  // Validate against schema
  const result = schema.safeParse(content);
  if (!result.success) {
    const errorMessages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`LLM response validation failed: ${errorMessages}`);
  }

  return {
    content: result.data,
    raw,
    tokensUsed,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider             , customConfig                  )         {
  if (provider === 'custom') {
    return customConfig?.modelName || 'default';
  }
  return DEFAULT_MODELS[provider];
}

/**
 * Check if a provider supports vision
 */
export function supportsVision(provider             , model        )          {
  switch (provider) {
    case 'anthropic':
      // All Claude 3+ models support vision
      return model.includes('claude-3') || model.includes('claude-sonnet-4') || model.includes('claude-opus-4');
    case 'openai':
      // GPT-4o and GPT-4 Vision models support vision
      return model.includes('gpt-4o') || model.includes('gpt-4-vision') || model.includes('gpt-4-turbo');
    case 'google':
      // Gemini Pro Vision and Gemini 1.5+ support vision
      return model.includes('gemini-pro-vision') || model.includes('gemini-1.5');
    case 'custom':
      // Unknown - assume no vision support
      return false;
  }
}

// =============================================================================
// BACKEND PROVIDER INFO
// =============================================================================

;                                     
             
                      
                       
 

;                                          
                                   
                          
 

/**
 * Fetch available LLM providers from the backend.
 * This shows which providers are configured server-side.
 */
export async function getBackendProviders()                                    {
  const response = await fetch('/api/llm/providers');
  if (!response.ok) {
    throw new Error(`Failed to fetch LLM providers: ${response.status}`);
  }
  return response.json();
}
