import { ref } from 'vue';
import type { AppConfig } from '../../shared/types';

const config = ref<AppConfig | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export function useConfig() {
  async function loadConfig(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      config.value = (await res.json()) as AppConfig;
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
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save config';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { config, loading, error, loadConfig, saveConfig };
}
