import { ref } from 'vue';
import type { OrgChartFile } from '../../shared/types';

const organigram = ref<OrgChartFile | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export function useOrganigram() {
  async function loadOrganigram(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/organigram');
      if (res.status === 404) {
        organigram.value = null;
        return;
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      organigram.value = (await res.json()) as OrgChartFile;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load organigram';
    } finally {
      loading.value = false;
    }
  }

  async function fetchPreview(): Promise<OrgChartFile> {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/fetch', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server error: ${res.status}`);
      }
      const body = (await res.json()) as { data: OrgChartFile };
      return body.data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch from ChurchTools';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function saveOrganigram(data: OrgChartFile): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/organigram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server error: ${res.status}`);
      }
      organigram.value = data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save organigram';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function uploadFromFile(file: File): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as OrgChartFile;
      await saveOrganigram(data);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to upload file';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function downloadJson(): void {
    if (!organigram.value) return;
    const blob = new Blob([JSON.stringify(organigram.value, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organigram.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    organigram,
    loading,
    error,
    loadOrganigram,
    fetchPreview,
    saveOrganigram,
    uploadFromFile,
    downloadJson,
  };
}
