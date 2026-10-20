export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      cache: 'no-store',
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK',
      'Could not reach the local server. Your changes are still here. Retry when it is running.',
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.error?.code ?? 'UNKNOWN',
      data.error?.message ?? 'Something went wrong. Please retry.',
    );
  return data as T;
}
