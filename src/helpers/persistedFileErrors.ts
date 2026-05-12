export type PersistedFileErrorCode = "invalid_file" | "malformed_file";

export class PersistedFileError extends Error {
  code: PersistedFileErrorCode;
  fileName: string;
  recoverable = true;

  constructor(code: PersistedFileErrorCode, fileName: string, message: string) {
    super(message);
    this.name = "PersistedFileError";
    this.code = code;
    this.fileName = fileName;
  }
}

export function isPersistedFileError(
  error: unknown,
): error is PersistedFileError {
  return error instanceof PersistedFileError;
}
