// Use the current protocol (http/https) and hostname for dynamic configuration
const getBaseUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // If we're in development (localhost), use the port
  if (hostname === 'localhost') {
    return `http://${hostname}:8010`;
  }
  
  // In production, don't use ports since we're using Traefik
  return `${protocol}//${hostname}`;
};

export const API_URL = getBaseUrl();