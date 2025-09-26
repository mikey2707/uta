// Use the current hostname for dynamic configuration
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = '8010';  // Always use 8010 for API
  return `http://${hostname}:${port}`;
};

export const API_URL = getBaseUrl();