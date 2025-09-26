// Use the current protocol (http/https) and hostname for dynamic configuration
const getBaseUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // If we're in development (localhost or IP address)
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return `http://${hostname}:8010`;
  }
  
  // In production with domain name
  return `${protocol}//${hostname}`;
};

export const API_URL = getBaseUrl();