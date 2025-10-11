export type ExtractedError = { name: string; message: string; stack?: string };

export function extractErrorInfo(error: unknown): ExtractedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === 'string') {
    return { name: 'Error', message: error };
  }
  return { name: 'UnknownError', message: String(error) };
}

export function toErrorPayload(error: unknown): { name: string; message: string; stack?: string } {
  return extractErrorInfo(error);
}
