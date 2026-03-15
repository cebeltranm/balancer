import Dropbox from "./dropbox";
import HttpServerStore from "./http_server";

export const STORAGE_PROVIDER_KEY = "storage_provider";

export type StorageProviderId = "dropbox" | "httpServer" | "googleDrive";

export interface StorageProviderOption {
  id: StorageProviderId;
  label: string;
  description: string;
  available: boolean;
  planned?: boolean;
}

export function isLocalDevHost() {
  return window.location.host === "localhost:3000";
}

function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function getDefaultStorageProvider(): StorageProviderId {
  if (isLocalDevHost()) {
    return "httpServer";
  }
  return "dropbox";
}

export function getAvailableStorageProviders(): StorageProviderOption[] {
  const options: StorageProviderOption[] = [
    {
      id: "dropbox",
      label: "Dropbox",
      description: "Sync files with Dropbox.",
      available: true,
    },
    {
      id: "googleDrive",
      label: "Google Drive",
      description: "Reserved for a future storage integration.",
      available: false,
      planned: true,
    },
  ];
  if (isLocalDevHost()) {
    options.splice(1, 0, {
      id: "httpServer",
      label: "Local HTTP server",
      description: "Use the local development storage server.",
      available: true,
    });
  }
  return options;
}

export function getSelectedStorageProvider(): StorageProviderId {
  const selected = getLocalStorage()?.getItem(
    STORAGE_PROVIDER_KEY,
  ) as StorageProviderId | null;
  const options = getAvailableStorageProviders();
  if (
    selected &&
    options.some(
      (option) => option.id === selected && option.available && !option.planned,
    )
  ) {
    return selected;
  }
  return getDefaultStorageProvider();
}

export function setSelectedStorageProvider(type: StorageProviderId) {
  const option = getAvailableStorageProviders().find(
    (provider) => provider.id === type,
  );
  if (option?.available && !option.planned) {
    getLocalStorage()?.setItem(STORAGE_PROVIDER_KEY, type);
    return;
  }
  getLocalStorage()?.setItem(STORAGE_PROVIDER_KEY, getDefaultStorageProvider());
}

export function getStorage() {
  switch (getSelectedStorageProvider()) {
    case "httpServer":
      return isLocalDevHost() ? new HttpServerStore() : new Dropbox();
    case "googleDrive":
    case "dropbox":
    default:
      return new Dropbox();
  }
}
