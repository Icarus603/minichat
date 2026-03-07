import { readConfig, writeConfig } from '../../services/storage/configStore.js';
import {
  getReasoningEffortOptions,
  listAvailableModels,
  supportsReasoningEffort,
  type ReasoningEffort,
} from '../../services/llm/modelCapabilities.js';

export async function loadModelPickerState() {
  const config = readConfig();
  if (!config) {
    return { config: null, models: [] };
  }

  const models = await listAvailableModels(config);
  return { config, models };
}

export function shouldOpenEffortStage(modelId: string): boolean {
  const config = readConfig();
  return Boolean(config && supportsReasoningEffort(config, modelId));
}

export function getModelEffortOptions(modelId: string): ReasoningEffort[] {
  const config = readConfig();
  return config ? getReasoningEffortOptions(config, modelId) : [];
}

export function applyModelSelection(modelId: string, reasoningEffort?: ReasoningEffort): string {
  const config = readConfig();
  if (!config) {
    return '';
  }

  writeConfig({
    ...config,
    model: modelId,
    reasoningEffort,
  });

  return reasoningEffort
    ? `Switched model to ${modelId} (${reasoningEffort} effort).`
    : `Switched model to ${modelId}.`;
}
