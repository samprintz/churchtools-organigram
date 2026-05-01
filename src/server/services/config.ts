import fs from 'node:fs/promises';
import path from 'node:path';
import { appConfigSchema } from '../../shared/schemas.js';
import type { AppConfig, OrgChartFile } from '../../shared/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const ORGANIGRAM_PATH = path.join(DATA_DIR, 'organigram.json');

const DEFAULT_CONFIG: AppConfig = {
  rootGroupId: 0,
  groupTypes: [],
  showCoLeaders: true,
  includeTags: [],
  excludeTags: [],
  relevantGroupStatusIds: [],
  inactiveGroupStatusId: null,
  theme: 'system',
};

export async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    const result = appConfigSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function readOrganigram(): Promise<OrgChartFile | null> {
  try {
    const raw = await fs.readFile(ORGANIGRAM_PATH, 'utf-8');
    return JSON.parse(raw) as OrgChartFile;
  } catch {
    return null;
  }
}

export async function writeOrganigram(data: OrgChartFile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ORGANIGRAM_PATH, JSON.stringify(data, null, 2));
}
