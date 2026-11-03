function isRetryable(error) {
  const status = Number(error?.status);
  if (Number.isFinite(status) && status > 0) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }
  return error instanceof TypeError || error?.name === 'AbortError' || error?.name === 'TimeoutError';
}

export async function retryTransient(operation, { attempts = 3, delayMs = 500 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}
