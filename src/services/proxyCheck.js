const axios = require('axios');
const crypto = require('crypto');

/**
 * Generates a SHA-256 hash of the IP address for privacy compliance.
 * @param {string} ip 
 * @returns {string}
 */
function hashIp(ip) {
  // Normalize IPv6 loopback and mapped IPv4 loopback to standard IPv4 loopback for consistent local testing
  let cleanIp = ip;
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')) {
    cleanIp = '127.0.0.1';
  } else if (ip.startsWith('::ffff:')) {
    cleanIp = ip.substring(7);
  }
  return crypto.createHash('sha256').update(cleanIp).digest('hex');
}

/**
 * Checks an IP address against proxycheck.io or simulates the check if API key is set to 'mock'.
 * @param {string} ip The user's IP address
 * @param {boolean} simulateVpn Force VPN detection (for testing)
 * @param {boolean} simulateProxy Force Proxy detection (for testing)
 * @returns {Promise<object>}
 */
async function checkIp(ip, simulateVpn = false, simulateProxy = false) {
  const apiKey = process.env.PROXYCHECK_API_KEY || 'mock';
  
  // Normalize IP
  let cleanIp = ip;
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')) {
    cleanIp = '1.1.1.1'; // Use Cloudflare IP for local testing fallback
  }

  // Handle Mock/Simulation Mode
  if (apiKey.toLowerCase() === 'mock' || simulateVpn || simulateProxy) {
    console.log(`[ProxyCheck] Mock mode active. Checking IP: ${cleanIp}`);
    
    if (simulateVpn) {
      return {
        status: 'ok',
        isVpn: true,
        isProxy: false,
        type: 'VPN',
        country: 'Mockland',
        provider: 'Mock VPN Provider',
        ip: cleanIp
      };
    }

    if (simulateProxy) {
      return {
        status: 'ok',
        isVpn: false,
        isProxy: true,
        type: 'PROXY',
        country: 'Mockland',
        provider: 'Mock Proxy Provider',
        ip: cleanIp
      };
    }

    // Default mock response: residential IP
    return {
      status: 'ok',
      isVpn: false,
      isProxy: false,
      type: 'Residential',
      country: 'Localhost',
      provider: 'Local ISP',
      ip: cleanIp
    };
  }

  // Real Proxycheck.io API Call
  try {
    const url = `https://proxycheck.io/v2/${cleanIp}?key=${apiKey}&vpn=1&asn=1`;
    console.log(`[ProxyCheck] Querying Proxycheck.io for IP: ${cleanIp}`);
    
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    if (data.status !== 'ok') {
      throw new Error(data.message || 'Unknown status from proxycheck.io');
    }

    const ipData = data[cleanIp];
    if (!ipData) {
      throw new Error(`IP data not returned for IP: ${cleanIp}`);
    }

    const isProxy = ipData.proxy === 'yes';
    const isVpn = ipData.type === 'VPN' || isProxy; // proxycheck sometimes tags VPN as proxy

    return {
      status: 'ok',
      isVpn: isVpn,
      isProxy: isProxy,
      type: ipData.type || 'Residential',
      country: ipData.country || 'Unknown',
      provider: ipData.provider || 'Unknown',
      ip: cleanIp
    };
  } catch (error) {
    console.error('[ProxyCheck] Error calling proxycheck.io:', error.message);
    // Graceful fallback to Mock Residential rather than completely breaking verification on external API failure
    return {
      status: 'error',
      isVpn: false,
      isProxy: false,
      type: 'Unknown (API Fallback)',
      country: 'Fallback',
      provider: 'Fallback',
      ip: cleanIp
    };
  }
}

module.exports = {
  hashIp,
  checkIp
};
