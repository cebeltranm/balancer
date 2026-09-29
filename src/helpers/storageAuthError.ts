export class StorageAuthError extends Error {
  provider: string;

  constructor(provider: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StorageAuthError";
    this.provider = provider;
  }
}

export function isStorageAuthError(error: unknown): error is StorageAuthError {
  return error instanceof Error && error.name === "StorageAuthError";
}
