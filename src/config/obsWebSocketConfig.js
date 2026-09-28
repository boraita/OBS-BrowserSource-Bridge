/**
 * OBS WebSocket Configuration
 * Configuration for connecting to OBS via WebSocket protocol
 */

export const OBS_WEBSOCKET_CONFIG = {
  host: 'localhost',
  port: 4455,
  password: '',

  reconnectInterval: 5000,
  maxReconnectAttempts: 5,

  downstreamKeyer: {
    enabled: true,
    sourceNamePrefix: 'DSK',
  },
};

/**
 * Get WebSocket URL
 * @returns {string} WebSocket connection URL
 */
export function getWebSocketUrl() {
  return `ws://${OBS_WEBSOCKET_CONFIG.host}:${OBS_WEBSOCKET_CONFIG.port}`;
}

/**
 * Load saved WebSocket configuration from localStorage, with URL query
 * params (?wsHost=&wsPort=&wsPassword=) taking priority. The Browser
 * Source page has no Settings UI of its own and can't read the panel's
 * localStorage (separate OBS storage partition — obsproject/obs-studio#6202),
 * so its connection details have to come from its own URL instead: set them
 * once on the Browser Source's URL property in OBS.
 */
export function loadWebSocketConfig() {
  const params = new URLSearchParams(window.location.search);

  const savedHost = params.get('wsHost') || localStorage.getItem('obsWebSocketHost');
  const savedPort = params.get('wsPort') || localStorage.getItem('obsWebSocketPort');
  const savedPassword = params.get('wsPassword') || localStorage.getItem('obsWebSocketPassword');

  if (savedHost) OBS_WEBSOCKET_CONFIG.host = savedHost;
  if (savedPort) OBS_WEBSOCKET_CONFIG.port = parseInt(savedPort, 10);
  if (savedPassword) OBS_WEBSOCKET_CONFIG.password = savedPassword;
}

/**
 * Save WebSocket configuration to localStorage
 */
export function saveWebSocketConfig(host, port, password) {
  localStorage.setItem('obsWebSocketHost', host);
  localStorage.setItem('obsWebSocketPort', port.toString());
  localStorage.setItem('obsWebSocketPassword', password);

  OBS_WEBSOCKET_CONFIG.host = host;
  OBS_WEBSOCKET_CONFIG.port = port;
  OBS_WEBSOCKET_CONFIG.password = password;
}
