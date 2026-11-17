export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(`${status}: ${message}`);
    this.name = 'HttpError';
    this.status = status;
  }

  static async from(response: Response): Promise<HttpError> {
    const text = await response.text();
    let message = text;
    try {
      const { error } = JSON.parse(text);
      message = (typeof error === 'string' ? error : error?.message) || text;
    } catch {
      // Not JSON: the raw text is the message
    }

    return new HttpError(response.status, message);
  }
}
