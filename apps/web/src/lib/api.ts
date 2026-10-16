export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;

  const defaultHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const responseData = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      isJson && responseData.error
        ? responseData.error
        : `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    (error as any).details = isJson ? responseData.details : null;
    throw error;
  }

  return responseData;
}
