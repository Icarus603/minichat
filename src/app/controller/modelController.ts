import { getConfig, saveConfig } from '../../core/configManager.js';
import {
  getReasoningEffortOptions,
  listAvailableModels,
  supportsReasoningEffort,
  type ReasoningEffort,
} from '../../core/modelCatalog.js';

export async function loadModelPickerState() {
  const config = getConfig();
  if (!config) {
    return { config: null, models: [] };
  }

  const models = await listAvailableModels(config);
  return { config, models };
}

export function shouldOpenEffortStage(modelId: string): boolean {
  const config = getConfig();
  return Boolean(config && supportsReasoningEffort(config, modelId));
}

export function getModelEffortOptions(modelId: string): ReasoningEffort[] {
  const config = getConfig();
  return config ? getReasoningEffortOptions(config, modelId) : [];
}

export function applyModelSelection(modelId: string, reasoningEffort?: ReasoningEffort): string {
  const config = getConfig();
  if (!config) {
    return '';
  }

  saveConfig({
    ...config,
    model: modelId,
    reasoningEffort,
  });

  return reasoningEffort
    ? `Switched model to ${modelId} (${reasoningEffort} effort).`
    : `Switched model to ${modelId}.`;
}
