/**
 * Co-pilot Provider Implementations
 *
 * To swap the Co-Pilot to a different LLM (e.g. Oracle OCI Generative AI,
 * an internal proxy, or any other approved provider):
 *
 *   1. Implement a new provider function (see Oracle example below)
 *   2. Change the return value in getCopilotProvider()
 *   3. No other files need to change
 *
 * The UI, context building, and system prompt are completely decoupled from this file.
 */

import { callLLM } from './llmClient';

// =============================================================================
// Provider: Default (uses app's existing LLM client — Anthropic, OpenAI, etc.)
// =============================================================================

function createDefaultProvider(settings) {
  return {
    name: 'default',
    send: async (messages, systemPrompt) => {
      const response = await callLLM({
        provider: settings.selectedProvider,
        model: settings.selectedModel,
        apiKey: settings.apiKeys?.[settings.selectedProvider] || '',
        systemPrompt,
        messages,
        maxTokens: 1024,
        useBackendProxy: settings.useBackendProxy || false,
        backendEndpoint: 'complete',
      });
      return response.content;
    },
  };
}

// =============================================================================
// Provider: Oracle OCI Generative AI (uncomment when Oracle approval received)
// =============================================================================

// function createOracleProvider(config) {
//   return {
//     name: 'oracle-oci',
//     send: async (messages, systemPrompt) => {
//       const fullPrompt = [
//         { role: 'system', content: systemPrompt },
//         ...messages,
//       ];
//       const response = await fetch(config.endpoint, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${config.token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           compartmentId: config.compartmentId,
//           inferenceRequest: {
//             messages: fullPrompt,
//             maxTokens: 1024,
//           },
//         }),
//       });
//       if (!response.ok) throw new Error(`OCI error: ${response.status}`);
//       const data = await response.json();
//       return data.inferenceResponse.generatedTexts[0].text;
//     },
//   };
// }

// =============================================================================
// Provider: Internal Proxy (for air-gapped / approved internal endpoints)
// =============================================================================

// function createInternalProxyProvider(config) {
//   return {
//     name: 'internal-proxy',
//     send: async (messages, systemPrompt) => {
//       const response = await fetch(`${config.baseUrl}/copilot/chat`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-Internal-Token': config.token,
//         },
//         body: JSON.stringify({ messages, systemPrompt }),
//       });
//       if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
//       const data = await response.json();
//       return data.content;
//     },
//   };
// }

// =============================================================================
// ACTIVE PROVIDER SELECTION — change this function to switch providers
// =============================================================================

/**
 * Returns the active Co-Pilot provider.
 *
 * To switch providers, change the return value here:
 *   - Default:        return createDefaultProvider(settings);
 *   - Oracle OCI:     return createOracleProvider(oracleConfig);
 *   - Internal proxy: return createInternalProxyProvider(proxyConfig);
 */
export function getCopilotProvider(settings) {
  return createDefaultProvider(settings);
}
