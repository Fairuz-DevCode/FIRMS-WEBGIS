export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  // In browser, relative URL works for both Docker Nginx proxy and Vite dev proxy
  if (typeof window !== 'undefined') {
    return '';
  }
  return 'http://localhost:5000';
};
