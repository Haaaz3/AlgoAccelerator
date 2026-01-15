/**
 * LLM API Proxy Routes
 *
 * Proxies requests to:
 * - Anthropic Claude API
 * - OpenAI API
 * - Google Gemini API
 *
 * Benefits of proxying:
 * - API keys stored server-side (not exposed in browser)
 * - Request/response logging for debugging
 * - Rate limiting and caching (future)
 * - Usage tracking (future)
 */

import express from 'express';
import fetch from 'node-fetch';

export const llmRouter = express.Router();

// LLM Provider configurations
const PROVIDERS = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022'],
    headerKey: 'x-api-key',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    useQueryParam: true,
    queryParamKey: 'key',
  },
};

/**
 * Get API key for provider from request header or environment
 */
function getApiKey(req, provider) {
  const headerKey = `x-${provider}-api-key`;
  const envKey = `${provider.toUpperCase()}_API_KEY`;
  return req.headers[headerKey] || process.env[envKey];
}

/**
 * POST /api/llm/extract
 * Extract measure specification using LLM
 *
 * Body:
 *   - provider: 'anthropic' | 'openai' | 'google'
 *   - model: Model ID
 *   - content: Document content to extract from
 *   - systemPrompt: System prompt for extraction
 */
llmRouter.post('/extract', async (req, res, next) => {
  try {
    const { provider = 'anthropic', model, content, systemPrompt } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) {
      return res.status(400).json({
        error: `Unknown provider: ${provider}`,
        validProviders: Object.keys(PROVIDERS),
      });
    }

    const apiKey = getApiKey(req, provider);
    if (!apiKey) {
      return res.status(401).json({
        error: `${provider} API key required`,
        help: `Provide via x-${provider}-api-key header or ${provider.toUpperCase()}_API_KEY env var`,
      });
    }

    console.log(`LLM Extract request: provider=${provider}, model=${model}, contentLength=${content.length}`);

    let response;

    if (provider === 'anthropic') {
      response = await callAnthropic(apiKey, model, systemPrompt, content);
    } else if (provider === 'openai') {
      response = await callOpenAI(apiKey, model, systemPrompt, content);
    } else if (provider === 'google') {
      response = await callGoogle(apiKey, model, systemPrompt, content);
    }

    res.json(response);
  } catch (err) {
    console.error('LLM Extract error:', err);
    next(err);
  }
});

/**
 * POST /api/llm/chat
 * General chat completion endpoint
 *
 * Body:
 *   - provider: 'anthropic' | 'openai' | 'google'
 *   - model: Model ID
 *   - messages: Array of { role, content }
 *   - systemPrompt: Optional system prompt
 */
llmRouter.post('/chat', async (req, res, next) => {
  try {
    const { provider = 'anthropic', model, messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) {
      return res.status(400).json({
        error: `Unknown provider: ${provider}`,
        validProviders: Object.keys(PROVIDERS),
      });
    }

    const apiKey = getApiKey(req, provider);
    if (!apiKey) {
      return res.status(401).json({
        error: `${provider} API key required`,
      });
    }

    console.log(`LLM Chat request: provider=${provider}, model=${model}, messages=${messages.length}`);

    let response;
    const userContent = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    if (provider === 'anthropic') {
      response = await callAnthropic(apiKey, model, systemPrompt, userContent);
    } else if (provider === 'openai') {
      response = await callOpenAI(apiKey, model, systemPrompt, userContent);
    } else if (provider === 'google') {
      response = await callGoogle(apiKey, model, systemPrompt, userContent);
    }

    res.json(response);
  } catch (err) {
    console.error('LLM Chat error:', err);
    next(err);
  }
});

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(apiKey, model, systemPrompt, userContent) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    provider: 'anthropic',
    model: data.model,
    content: data.content[0]?.text || '',
    usage: {
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    },
    stopReason: data.stop_reason,
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(apiKey, model, systemPrompt, userContent) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userContent });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    provider: 'openai',
    model: data.model,
    content: data.choices[0]?.message?.content || '',
    usage: {
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    },
    stopReason: data.choices[0]?.finish_reason,
  };
}

/**
 * Call Google Gemini API
 */
async function callGoogle(apiKey, model, systemPrompt, userContent) {
  const modelId = model || 'gemini-1.5-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const contents = [];
  if (systemPrompt) {
    contents.push({
      role: 'user',
      parts: [{ text: `System instructions: ${systemPrompt}` }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I will follow these instructions.' }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userContent }],
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    provider: 'google',
    model: modelId,
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
    },
    stopReason: data.candidates?.[0]?.finishReason,
  };
}

/**
 * GET /api/llm/models
 * List available models by provider
 */
llmRouter.get('/models', (req, res) => {
  res.json({
    providers: Object.entries(PROVIDERS).map(([id, config]) => ({
      id,
      models: config.models,
    })),
  });
});
