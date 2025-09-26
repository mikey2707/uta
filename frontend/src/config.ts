// Get the current hostname from the browser
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:8010`;  // Always use 8010 for API
};

export const API_URL = getBaseUrl();