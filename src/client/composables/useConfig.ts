import { ref } from 'vue';
import { appConfigSchema } from '../../shared/schemas';
import type { AppConfig } from '../../shared/types';

const CLIENT_DEFAULT_CONFIG: AppConfig = {
  rootGroupId: 0,
  groupTypes: [],
  showCoLeaders: true,
  showInactiveGroups: true,
  includeTags: [],
  excludeTags: [],
  relevantGroupStatusIds: [],
  inactiveGroupStatusIds: [],
  theme: 'system',
};

const config = ref<AppConfig>(CLIENT_DEFAULT_CONFIG);
const loading = ref(false);
const error = ref<string | null>(null);
const configInvalid = ref(false);

export function useConfig() {
  async function loadConfig(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/config');

      if (res.status === 404) {
        // No config file yet (first run) — use defaults, not an error
        config.value = CLIENT_DEFAULT_CONFIG;
        configInvalid.value = false;
        return;
      }

      if (res.status === 422) {
        // Config file contains invalid JSON
        config.value = CLIENT_DEFAULT_CONFIG;
        configInvalid.value = true;
        return;
      }

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data: unknown = await res.json();
      const result = appConfigSchema.safeParse(data);

      if (!result.success) {
        config.value = CLIENT_DEFAULT_CONFIG;
        configInvalid.value = true;
      } else {
        config.value = result.data;
        configInvalid.value = false;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load config';
    } finally {
      loading.value = false;
    }
  }

  async function saveConfig(newConfig: AppConfig): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server error: ${res.status}`);
      }
      config.value = (await res.json()) as AppConfig;
      configInvalid.value = false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save config';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { config, loading, error, configInvalid, loadConfig, saveConfig };
}
