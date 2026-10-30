/** Error carrying the field-level problems returned by the API for a 400 response. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ field: string, message: string }[]} [issues]
   */
  constructor(message, issues = []) {
    super(message);
    this.name = 'ApiError';
    this.issues = issues;
  }
}

/**
 * POSTs JSON and returns the parsed response, or throws an `ApiError`.
 * @param {string} path
 * @param {unknown} body
 */
export async function postJson(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body: handled below.
  }

  if (response.ok && data) return data;
  if (response.status === 429) {
    throw new ApiError('Too many requests. Please wait a minute and try again.');
  }
  throw new ApiError(
    data?.message ?? 'Please check the highlighted fields.',
    Array.isArray(data?.issues) ? data.issues : [],
  );
}
