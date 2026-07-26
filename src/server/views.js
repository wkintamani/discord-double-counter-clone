/**
 * Generates the common HTML layout wrapper with premium CSS design tokens and animations.
 * @param {string} title 
 * @param {string} content 
 * @returns {string} Complete HTML string
 */
function layout(title, content) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} | Anti-Alt Guard</title>
      <!-- Google Fonts (Outfit & Inter) -->
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-color: #0b0e14;
          --card-bg: rgba(17, 24, 39, 0.7);
          --text-primary: #f3f4f6;
          --text-secondary: #9ca3af;
          --primary-color: #5865f2;
          --primary-glow: rgba(88, 101, 242, 0.4);
          --success-color: #10b981;
          --success-glow: rgba(16, 185, 129, 0.4);
          --danger-color: #ef4444;
          --danger-glow: rgba(239, 68, 68, 0.4);
          --border-color: rgba(255, 255, 255, 0.08);
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background-color: var(--bg-color);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          position: relative;
        }

        /* Ambient Glow Background Orbs */
        .ambient-glow-1 {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--primary-glow) 0%, rgba(11,14,20,0) 70%);
          top: -100px;
          left: -100px;
          z-index: 1;
          pointer-events: none;
        }

        .ambient-glow-2 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(11,14,20,0) 70%);
          bottom: -150px;
          right: -100px;
          z-index: 1;
          pointer-events: none;
        }

        .container {
          width: 100%;
          max-width: 460px;
          padding: 20px;
          z-index: 10;
        }

        .card {
          background: var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 40px 30px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        h1, h2, h3 {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .title {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .guild-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid var(--border-color);
          margin: 0 auto 20px;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
          object-fit: cover;
        }

        .user-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid var(--border-color);
          margin: 0 auto 20px;
          object-fit: cover;
        }

        .status-icon-container {
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
        }

        .status-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        .status-success {
          background: rgba(16, 185, 129, 0.1);
          border: 2px solid var(--success-color);
          color: var(--success-color);
          box-shadow: 0 0 20px var(--success-glow);
        }

        .status-danger {
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid var(--danger-color);
          color: var(--danger-color);
          box-shadow: 0 0 20px var(--danger-glow);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 14px 24px;
          border-radius: 12px;
          border: none;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .btn-primary {
          background-color: var(--primary-color);
          color: white;
          box-shadow: 0 8px 16px var(--primary-glow);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px var(--primary-glow);
          filter: brightness(1.1);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        /* Developer HUD Sandbox styles */
        .dev-hud {
          margin-top: 30px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          text-align: left;
        }

        .dev-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          color: #ff9f43;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dev-option {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 13px;
          cursor: pointer;
          user-select: none;
        }

        .dev-option input {
          margin-right: 8px;
          accent-color: #ff9f43;
          width: 16px;
          height: 16px;
        }

        .dev-desc {
          font-size: 11px;
          color: var(--text-secondary);
          margin-left: 24px;
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="ambient-glow-1"></div>
      <div class="ambient-glow-2"></div>
      
      <div class="container">
        ${content}
      </div>
    </body>
    </html>
  `;
}

/**
 * Renders the initial verification landing page.
 */
function renderLandingPage(guildName, guildIconUrl, baseOauthUrl, isMockMode, guildId) {
  const defaultIcon = 'https://discord.com/assets/f9bbda527b9c5d986b20935786cadb56.png';
  const icon = guildIconUrl || defaultIcon;

  let content = `
    <div class="card">
      <img src="${icon}" alt="${guildName} Icon" class="guild-avatar">
      <h1 class="title">Security Verification</h1>
      <p class="subtitle">To join <strong>${guildName}</strong>, please complete a fast connection check to verify you are not using a VPN, proxy, or multiple accounts.</p>
      
      <a href="${baseOauthUrl}" id="verify-btn" class="btn btn-primary">
        🔑 Authenticate with Discord
      </a>
  `;

  if (isMockMode) {
    content += `
      <div class="dev-hud">
        <div class="dev-title">🛠️ Developer Test Sandbox</div>
        <p style="font-size: 11px; color: #ff9f43; margin-bottom: 12px; line-height: 1.4;">
          This sandbox is active because your <code>PROXYCHECK_API_KEY</code> is set to <code>mock</code>. Use these options to simulate security failures:
        </p>

        <label class="dev-option">
          <input type="checkbox" id="sim-vpn" onchange="updateOAuthLink()">
          <span>Simulate VPN connection</span>
        </label>
        <div class="dev-desc">Trigger a VPN/Proxy warning block.</div>

        <label class="dev-option">
          <input type="checkbox" id="sim-proxy" onchange="updateOAuthLink()">
          <span>Simulate Proxy connection</span>
        </label>
        <div class="dev-desc">Trigger a Proxy block.</div>

        <label class="dev-option">
          <input type="checkbox" id="sim-alt" onchange="updateOAuthLink()">
          <span>Simulate Alt Account (Duplicate IP)</span>
        </label>
        <div class="dev-desc">Simulate that this IP has already verified a different account.</div>

        <label class="dev-option">
          <input type="checkbox" id="sim-device" onchange="updateOAuthLink()">
          <span>Simulate Alt Device (Duplicate Fingerprint)</span>
        </label>
        <div class="dev-desc">Simulate that this browser/device has already verified a different account.</div>
      </div>
    `;
  }

  content += `
      <script>
        const baseOauthUrl = "${baseOauthUrl}";
        const guildId = "${guildId}";
        const isMockMode = ${isMockMode};
        let realFingerprint = "";

        // Client-side browser fingerprinting (Canvas hash, Screen, Timezone, UserAgent, Memory, Cores)
        async function runFingerprint() {
          const getCanvasFp = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              ctx.textBaseline = "top";
              ctx.font = "14px 'Arial'";
              ctx.fillStyle = "#f60";
              ctx.fillRect(125,1,62,20);
              ctx.fillStyle = "#069";
              ctx.fillText("AntiAltGuard, <canvas> 1.0", 2, 15);
              return canvas.toDataURL();
            } catch (e) {
              return "";
            }
          };

          const sha256 = async (str) => {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          };

          const canvasData = getCanvasFp();
          const canvasHash = await sha256(canvasData);

          const deviceData = {
            screen: screen.width + "x" + screen.height,
            ua: navigator.userAgent,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
            lang: navigator.language || "Unknown",
            ram: navigator.deviceMemory || "Unknown",
            cores: navigator.hardwareConcurrency || "Unknown",
            canvasHash: canvasHash
          };

          const rawDataString = JSON.stringify(deviceData);
          realFingerprint = await sha256(rawDataString);
          
          deviceData.hash = realFingerprint;
          window.computedDeviceData = deviceData;
          
          updateOAuthLink();
        }

        function updateOAuthLink() {
          let simulateVpn = false;
          let simulateProxy = false;
          let simulateAlt = false;
          let simulateDevice = false;

          if (isMockMode) {
            simulateVpn = document.getElementById('sim-vpn').checked;
            simulateProxy = document.getElementById('sim-proxy').checked;
            simulateAlt = document.getElementById('sim-alt').checked;
            simulateDevice = document.getElementById('sim-device').checked;
          }

          // Build a state object matching our Node backend structure
          const stateObj = {
            guildId: guildId,
            simulateVpn: simulateVpn,
            simulateProxy: simulateProxy,
            simulateAlt: simulateAlt,
            simulateDevice: simulateDevice
          };

          // Base64 encode the state JSON to pass safely through Discord OAuth
          const stateStr = btoa(JSON.stringify(stateObj));
          
          // Re-generate the URL by replacing/appending the state parameter
          const urlObj = new URL(baseOauthUrl);
          urlObj.searchParams.set('state', stateStr);
          document.getElementById('verify-btn').href = urlObj.toString();

          // Set cookie for device fingerprint details
          let finalFpData = window.computedDeviceData;
          if (isMockMode && simulateDevice) {
            finalFpData = {
              screen: "1920x1080",
              ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              tz: "America/New_York",
              lang: "en-US",
              ram: 8,
              cores: 4,
              canvasHash: "mock_canvas_hash",
              hash: "simulated_duplicate_device_hash"
            };
          }

          if (finalFpData) {
            const cookieVal = btoa(JSON.stringify(finalFpData));
            document.cookie = "device_fp_data=" + cookieVal + "; path=/; max-age=600; SameSite=Lax";
          }
        }
        
        // Start fingerprinting
        runFingerprint();
      </script>
    </div>
  `;
  return layout(`Verify for ${guildName}`, content);
}

/**
 * Renders the successful verification status page.
 */
function renderSuccessPage(username, avatarUrl, guildName) {
  const content = `
    <div class="card">
      <div class="status-icon-container">
        <div class="status-icon status-success">✓</div>
      </div>
      
      <h1 class="title">Verification Successful!</h1>
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin: 20px 0; background: rgba(255, 255, 255, 0.03); padding: 12px 20px; border-radius: 12px; border: 1px solid var(--border-color);">
        <img src="${avatarUrl}" alt="${username}" style="width: 32px; height: 32px; border-radius: 50%;">
        <span style="font-weight: 500;">@${username}</span>
      </div>

      <p class="subtitle" style="margin-bottom: 24px;">
        Your connection was scanned and approved. The <strong>Verified Role</strong> has been assigned to you.
      </p>
      
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 10px;">
        You can now return to Discord.
      </p>
    </div>
  `;
  return layout('Verification Successful', content);
}

/**
 * Renders the error / verification failure page.
 */
function renderErrorPage(reason, username, avatarUrl, guildName) {
  let errorDetail = 'Your verification request was rejected by the system.';
  if (reason === 'vpn') {
    errorDetail = 'VPN connection detected. Please disable your VPN or proxy and try again.';
  } else if (reason === 'proxy') {
    errorDetail = 'Proxy connection detected. Please switch to a residential internet connection and try again.';
  } else if (reason === 'alt') {
    errorDetail = 'Alt account detected. This server limits the number of Discord accounts allowed per IP address.';
  } else if (typeof reason === 'string') {
    errorDetail = reason;
  }

  const content = `
    <div class="card">
      <div class="status-icon-container">
        <div class="status-icon status-danger">✕</div>
      </div>
      
      <h1 class="title" style="color: var(--danger-color);">Verification Failed</h1>
      
      ${username && avatarUrl ? `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin: 20px 0; background: rgba(255, 255, 255, 0.03); padding: 12px 20px; border-radius: 12px; border: 1px solid var(--border-color);">
        <img src="${avatarUrl}" alt="${username}" style="width: 32px; height: 32px; border-radius: 50%;">
        <span style="font-weight: 500;">@${username}</span>
      </div>` : ''}

      <p class="subtitle" style="color: var(--text-primary); font-size: 15px; margin-bottom: 24px; line-height: 1.6;">
        <strong>Reason:</strong> ${errorDetail}
      </p>
      
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 24px; padding: 10px; background: rgba(239, 68, 68, 0.05); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.1);">
        Our security policies block automated scripts, anonymizers, and multiple accounts to maintain server integrity.
      </p>

      ${guildName ? `<a href="/verify?guild_id=${guildName}" class="btn btn-primary" style="background-color: rgba(255, 255, 255, 0.1); color: var(--text-primary); box-shadow: none;" onclick="window.close(); return false;">
        Close Window
      </a>` : ''}
    </div>
  `;
  return layout('Verification Failed', content);
}

module.exports = {
  renderLandingPage,
  renderSuccessPage,
  renderErrorPage
};
