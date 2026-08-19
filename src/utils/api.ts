const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API call failed')
  }

  return response.json()
}

export async function apiCallWithAuth(endpoint: string, token: string, options: RequestInit = {}) {
  return apiCall(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
}
