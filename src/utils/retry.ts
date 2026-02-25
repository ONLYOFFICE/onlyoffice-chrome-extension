export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  useJitter?: boolean;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

function defaultShouldRetry(error: any, _attempt: number): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  if (error.status === 429) {
    return true;
  }

  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  return false;
}

function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  useJitter: boolean,
): number {
  const exponentialDelay = initialDelay * backoffMultiplier ** (attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  if (useJitter) {
    const jitter = Math.random() * cappedDelay * 0.25;
    return cappedDelay + jitter;
  }

  return cappedDelay;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryFetch(
  fetchFn: () => Promise<Response>,
  options: RetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    useJitter = true,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: any;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetchFn();

      if (!response.ok) {
        const error = {
          status: response.status,
          statusText: response.statusText,
          response,
        };

        if (attempt < maxRetries && shouldRetry(error, attempt)) {
          lastError = error;
          attempt++;

          const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier, useJitter);

          await sleep(delay);

          continue;
        }

        return response;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && shouldRetry(error, attempt)) {
        attempt++;

        const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier, useJitter);

        await sleep(delay);

        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    useJitter = true,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: any;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && shouldRetry(error, attempt)) {
        attempt++;

        const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier, useJitter);

        await sleep(delay);

        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
