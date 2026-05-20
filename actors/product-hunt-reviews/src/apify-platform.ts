import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_INPUT_PATHS = [
  "apify_storage/key_value_stores/default/INPUT.json",
  "storage/key_value_stores/default/INPUT.json",
  "INPUT.json",
  ".actor/INPUT.json"
];

function getApiBaseUrl() {
  return (
    process.env.APIFY_API_PUBLIC_BASE_URL ??
    process.env.APIFY_API_BASE_URL ??
    "https://api.apify.com"
  );
}

function isApifyCloudRun() {
  return Boolean(
    process.env.APIFY_IS_AT_HOME &&
      process.env.APIFY_TOKEN &&
      process.env.ACTOR_DEFAULT_KEY_VALUE_STORE_ID &&
      process.env.ACTOR_DEFAULT_DATASET_ID
  );
}

async function readLocalInput<T>() {
  if (process.env.ACTOR_INPUT?.trim()) {
    return JSON.parse(process.env.ACTOR_INPUT) as T;
  }

  for (const candidate of LOCAL_INPUT_PATHS) {
    try {
      const raw = await readFile(path.resolve(candidate), "utf8");
      return JSON.parse(raw) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return undefined;
}

export async function getInput<T>() {
  if (!isApifyCloudRun()) {
    return readLocalInput<T>();
  }

  const keyValueStoreId = process.env.ACTOR_DEFAULT_KEY_VALUE_STORE_ID;
  const inputKey = process.env.ACTOR_INPUT_KEY ?? "INPUT";
  const token = process.env.APIFY_TOKEN;
  const response = await fetch(
    `${getApiBaseUrl()}/v2/key-value-stores/${keyValueStoreId}/records/${encodeURIComponent(inputKey)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Failed to read actor input: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function writeLocalDatasetItems(items: unknown[]) {
  const datasetDir = path.resolve("storage/datasets/default");
  await mkdir(datasetDir, { recursive: true });

  await Promise.all(
    items.map((item, index) => {
      const fileName = `${String(index + 1).padStart(9, "0")}.json`;
      return writeFile(
        path.join(datasetDir, fileName),
        `${JSON.stringify(item, null, 2)}\n`
      );
    })
  );
}

export async function pushData(items: unknown | unknown[]) {
  const normalizedItems = Array.isArray(items) ? items : [items];

  if (!process.env.APIFY_IS_AT_HOME) {
    await writeLocalDatasetItems(normalizedItems);
    return;
  }

  const datasetId = process.env.ACTOR_DEFAULT_DATASET_ID;
  const token = process.env.APIFY_TOKEN;

  if (!datasetId || !token) {
    await writeLocalDatasetItems(normalizedItems);
    return;
  }

  const response = await fetch(`${getApiBaseUrl()}/v2/datasets/${datasetId}/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(normalizedItems)
  });

  if (!response.ok) {
    throw new Error(`Failed to push dataset items: ${response.status}`);
  }
}

export const log = {
  info(message: string, data?: unknown) {
    if (data === undefined) {
      console.log(message);
      return;
    }

    console.log(message, JSON.stringify(data));
  },
  warning(message: string, data?: unknown) {
    if (data === undefined) {
      console.warn(message);
      return;
    }

    console.warn(message, JSON.stringify(data));
  },
  error(message: string, data?: unknown) {
    if (data === undefined) {
      console.error(message);
      return;
    }

    console.error(message, JSON.stringify(data));
  }
};
