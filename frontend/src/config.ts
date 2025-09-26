// Get the current hostname and port from the browser
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  // If we're accessing via localhost, use the mapped port (8010)
  // Otherwise, use the container's port (8000)
  const port = hostname === 'localhost' ? '8010' : '8000';
  return `http://${hostname}:${port}`;
};

export const API_URL = getBaseUrl();