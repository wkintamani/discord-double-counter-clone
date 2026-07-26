const axios = require('axios');

/**
 * Generates the Discord OAuth2 Authorization URL.
 * @param {string} guildId 
 * @returns {string}
 */
function getOAuthUrl(guildId) {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.REDIRECT_URI);
  
  // We request 'identify' scope to get user ID, username, and avatar.
  // The 'state' parameter carries the guildId back to our redirect handler.
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${guildId}`;
}

/**
 * Exchanges authorization code for an OAuth2 access token.
 * @param {string} code 
 * @returns {Promise<string>} The access token
 */
async function getOAuthToken(code) {
  const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.REDIRECT_URI,
  });

  try {
    const response = await axios.post('https://discord.com/api/oauth2/token', data.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error('[Discord API] Error exchanging OAuth code:', error.response?.data || error.message);
    throw new Error('Failed to exchange OAuth code.');
  }
}

/**
 * Fetches user profile data from Discord using their access token.
 * @param {string} accessToken 
 * @returns {Promise<object>} Discord user profile data (id, username, global_name, avatar, etc.)
 */
async function getUserInfo(accessToken) {
  try {
    const response = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('[Discord API] Error fetching user info:', error.response?.data || error.message);
    throw new Error('Failed to fetch Discord user information.');
  }
}

module.exports = {
  getOAuthUrl,
  getOAuthToken,
  getUserInfo
};
