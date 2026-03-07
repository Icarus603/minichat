import OpenAI from 'openai';
import type { Config } from './configManager.js';

export type ModelOption = {
  id: string;
  description: string;
};

export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

const CODEX_REASONING_EFFORTS: Record<string, ReasoningEffort[]> = {
  'gpt-5.3-codex': ['low', 'medium', 'high', 'xhigh'],
  'gpt-5.4': ['low', 'medium', 'high', 'xhigh'],
  'gpt-5.2-codex': ['low', 'medium', 'high', 'xhigh'],
  'gpt-5.1-codex-max': ['low', 'medium', 'high', 'xhigh'],
  'gpt-5.2': ['low', 'medium', 'high', 'xhigh'],
  'gpt-5.1-codex-mini': ['medium', 'high'],
};

const API_REASONING_EFFORTS: Record<string, ReasoningEffort[]> = {
  'gpt-5.2': ['none', 'low', 'medium', 'high', 'xhigh'],
  'gpt-5.2-pro': ['medium', 'high', 'xhigh'],
  'gpt-5-pro': ['high'],
  'gpt-5.1': ['none', 'low', 'medium', 'high'],
  'gpt-5.1-mini': ['low', 'medium', 'high'],
  'gpt-5.1-nano': ['low', 'medium', 'high'],
};

// Mirrors the default visible picker models in the official Codex repo.
const CODEX_CHATGPT_MODELS: ModelOption[] = [
  { id: 'gpt-5.3-codex', description: 'Latest frontier agentic coding model.' },
  { id: 'gpt-5.4', description: 'Latest frontier agentic coding model.' },
  { id: 'gpt-5.2-codex', description: 'Frontier agentic coding model.' },
  { id: 'gpt-5.1-codex-max', description: 'Codex-optimized flagship for deep and fast reasoning.' },
  { id: 'gpt-5.2', description: 'Latest frontier model with improvements across knowledge, reasoning and coding.' },
  { id: 'gpt-5.1-codex-mini', description: 'Optimized for codex. Cheaper, faster, but less capable.' },
];

const API_MODEL_DESCRIPTIONS: Record<string, string> = {
  'gpt-5.4': 'Latest frontier agentic coding model.',
  'gpt-5.3-codex': 'Latest frontier agentic coding model.',
  'gpt-5.2': 'Latest frontier model with improvements across knowledge, reasoning and coding.',
  'gpt-5.2-codex': 'Frontier agentic coding model.',
  'gpt-5.1-codex-max': 'Codex-optimized flagship for deep and fast reasoning.',
  'gpt-5.1-codex-mini': 'Optimized for codex. Cheaper, faster, but less capable.',
  'gpt-4.1': 'Strong general-purpose model for coding and chat.',
  'gpt-4.1-mini': 'Faster lower-cost general-purpose model.',
  'gpt-4o': 'Omni model for fast interactive conversations.',
  'gpt-4o-mini': 'Small, fast, low-cost omni model.',
  'o3': 'High-end reasoning model for difficult tasks.',
  'o3-pro': 'Stronger reasoning model for demanding work.',
  'o3-mini': 'Smaller reasoning model balancing cost and quality.',
  'o4-mini': 'Fast reasoning model optimized for speed and price.',
};

const DEEPSEEK_MODELS: ModelOption[] = [
  { id: 'deepseek-chat', description: 'General chat mode on DeepSeek-V3.2.' },
  { id: 'deepseek-reasoner', description: 'Reasoning mode on DeepSeek-V3.2.' },
];

type OpenRouterModelResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    description?: string;
  }>;
};

function isLikelyApiChatModel(id: string): boolean {
  if (!id.startsWith('gpt-') && !id.startsWith('o')) {
    return false;
  }

  const blocked = [
    'audio',
    'realtime',
    'transcribe',
    'tts',
    'image',
    'embedding',
    'moderation',
    'search',
    'omni-moderation',
    'whisper',
    'dall',
  ];

  return !blocked.some(fragment => id.includes(fragment));
}

function isLikelyOpenRouterChatModel(id: string): boolean {
  if (!id.startsWith('openai/')) {
    return false;
  }

  if (id.includes(':')) {
    return false;
  }

  if (id.includes('safeguard')) {
    return false;
  }

  const rawModelId = id.slice('openai/'.length);
  return isLikelyApiChatModel(rawModelId);
}

export function filterOpenRouterModelIds(ids: string[]): string[] {
  return ids.filter(isLikelyOpenRouterChatModel);
}

export function getChatGPTManagedModels(currentModel = ''): ModelOption[] {
  return withCurrentModel(CODEX_CHATGPT_MODELS, currentModel);
}

function normalizeModelId(modelId: string): string {
  return modelId.startsWith('openai/') ? modelId.slice('openai/'.length) : modelId;
}

export function supportsReasoningEffort(config: Config, modelId: string): boolean {
  return getReasoningEffortOptions(config, modelId).length > 0;
}

export function getReasoningEffortOptions(config: Config, modelId: string): ReasoningEffort[] {
  const id = normalizeModelId(modelId);

  if (!config.apiKey) {
    return CODEX_REASONING_EFFORTS[id] ?? [];
  }

  if (config.provider === 'deepseek') {
    return [];
  }

  return API_REASONING_EFFORTS[id] ?? [];
}

function withCurrentModel(options: ModelOption[], currentModel: string): ModelOption[] {
  if (!currentModel || options.some(option => option.id === currentModel)) {
    return options;
  }

  return [
    { id: currentModel, description: 'Current model.' },
    ...options,
  ];
}

export async function listAvailableModels(config: Config): Promise<ModelOption[]> {
  if (!config.apiKey) {
    return getChatGPTManagedModels(config.model);
  }

  if (config.provider === 'deepseek') {
    return withCurrentModel(DEEPSEEK_MODELS, config.model);
  }

  if (config.provider === 'openrouter') {
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      throw new Error(`Failed to load OpenRouter models (${response.status})`);
    }

    const payload = await response.json() as OpenRouterModelResponse;
    const allowedIds = new Set(
      filterOpenRouterModelIds(
        (payload.data ?? [])
          .map(model => model.id)
          .filter((id): id is string => typeof id === 'string')
      )
    );
    const options = (payload.data ?? [])
      .filter(model => typeof model.id === 'string' && allowedIds.has(model.id))
      .map(model => ({
        id: model.id!,
        description: model.description?.trim() || model.name?.trim() || 'Available via OpenRouter.',
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return withCurrentModel(options, config.model);
  }

  const client = new OpenAI({ apiKey: config.apiKey });
  const page = await client.models.list();
  const ids = page.data
    .map(model => model.id)
    .filter(isLikelyApiChatModel);

  const uniqueIds = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
  const orderedIds = [
    ...Object.keys(API_MODEL_DESCRIPTIONS).filter(id => uniqueIds.includes(id)),
    ...uniqueIds.filter(id => !(id in API_MODEL_DESCRIPTIONS)),
  ];

  const options = orderedIds.map(id => ({
    id,
    description: API_MODEL_DESCRIPTIONS[id] ?? 'Available to your API key.',
  }));

  return withCurrentModel(options, config.model);
}
