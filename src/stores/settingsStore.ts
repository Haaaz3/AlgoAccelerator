/**
 * Settings Store
 *
 * Manages application settings including LLM provider configuration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LLMProvider = 'anthropic' | 'openai' | 'google';

export interface LLMProviderConfig {
  id: LLMProvider;
  name: string;
  description: string;
  models: { id: string; name: string }[];
  defaultModel: string;
}

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Claude models - excellent at structured extraction',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (faster)' },
    ],
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    description: 'GPT models - widely used and capable',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (faster)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    description: 'Gemini models - strong reasoning capabilities',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (faster)' },
    ],
    defaultModel: 'gemini-1.5-pro',
  },
];

interface SettingsState {
  // LLM Configuration
  selectedProvider: LLMProvider;
  selectedModel: string;
  apiKeys: Record<LLMProvider, string>;
  useAIExtraction: boolean;

  // Legacy (for backwards compatibility)
  anthropicApiKey: string;

  // Actions
  setSelectedProvider: (provider: LLMProvider) => void;
  setSelectedModel: (model: string) => void;
  setApiKey: (provider: LLMProvider, key: string) => void;
  setUseAIExtraction: (use: boolean) => void;

  // Legacy action
  setAnthropicApiKey: (key: string) => void;
  clearApiKey: () => void;

  // Helpers
  getActiveApiKey: () => string;
  getActiveProvider: () => LLMProviderConfig;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      selectedProvider: 'anthropic',
      selectedModel: 'claude-sonnet-4-20250514',
      apiKeys: {
        anthropic: '',
        openai: '',
        google: '',
      },
      useAIExtraction: true,
      anthropicApiKey: '', // Legacy

      setSelectedProvider: (provider) => {
        const providerConfig = LLM_PROVIDERS.find(p => p.id === provider);
        set({
          selectedProvider: provider,
          selectedModel: providerConfig?.defaultModel || ''
        });
      },

      setSelectedModel: (model) => set({ selectedModel: model }),

      setApiKey: (provider, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
          // Keep legacy anthropicApiKey in sync
          ...(provider === 'anthropic' ? { anthropicApiKey: key } : {}),
        }));
      },

      setUseAIExtraction: (use) => set({ useAIExtraction: use }),

      // Legacy actions for backwards compatibility
      setAnthropicApiKey: (key) => {
        set((state) => ({
          anthropicApiKey: key,
          apiKeys: { ...state.apiKeys, anthropic: key },
        }));
      },

      clearApiKey: () => {
        const provider = get().selectedProvider;
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: '' },
          ...(provider === 'anthropic' ? { anthropicApiKey: '' } : {}),
        }));
      },

      getActiveApiKey: () => {
        const state = get();
        return state.apiKeys[state.selectedProvider] || '';
      },

      getActiveProvider: () => {
        const state = get();
        return LLM_PROVIDERS.find(p => p.id === state.selectedProvider) || LLM_PROVIDERS[0];
      },
    }),
    {
      name: 'measure-accelerator-settings',
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        apiKeys: state.apiKeys,
        useAIExtraction: state.useAIExtraction,
        anthropicApiKey: state.anthropicApiKey,
      }),
      // Migration to handle old data format
      migrate: (persistedState: any, version: number) => {
        if (persistedState.anthropicApiKey && !persistedState.apiKeys?.anthropic) {
          return {
            ...persistedState,
            apiKeys: {
              anthropic: persistedState.anthropicApiKey,
              openai: '',
              google: '',
            },
          };
        }
        return persistedState;
      },
      version: 1,
    }
  )
);
