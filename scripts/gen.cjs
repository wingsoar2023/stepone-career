const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1024px;
    height: 500px;
    overflow: hidden;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: radial-gradient(circle at 20% 35%, #1e1b4b 0%, #0f172a 65%, #020617 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 45px;
    position: relative;
  }
  .ambient-glow {
    position: absolute;
    width: 450px;
    height: 450px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0) 70%);
    left: 20px;
    top: 25px;
    filter: blur(50px);
    z-index: 1;
  }
  .left-side {
    position: relative;
    z-index: 2;
    width: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ring-1 {
    position: absolute;
    width: 310px;
    height: 310px;
    border-radius: 50%;
    border: 1.5px dashed rgba(165,180,252,0.25);
  }
  .ring-2 {
    position: absolute;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    border: 1px solid rgba(129,140,248,0.35);
  }
  .icon-card {
    width: 190px;
    height: 190px;
    border-radius: 44px;
    background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 25px 50px -12px rgba(79,70,229,0.7), inset 0 1px 1px rgba(255,255,255,0.4);
  }
  .rocket-svg {
    width: 105px;
    height: 105px;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
  }
  .right-side {
    position: relative;
    z-index: 2;
    flex: 1;
    padding-left: 35px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(245,158,11,0.15);
    border: 1px solid rgba(245,158,11,0.4);
    color: #fbbf24;
    padding: 5px 14px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    width: fit-content;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 44px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.1;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
    text-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  h1 span {
    background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .sub {
    font-size: 18px;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 18px;
  }
  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
  }
  .bullet-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(16,185,129,0.2);
    border: 1px solid rgba(16,185,129,0.4);
    color: #34d399;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
  }
</style>
</head>
<body>
  <div class="ambient-glow"></div>
  <div class="left-side">
    <div class="ring-1"></div>
    <div class="ring-2"></div>
    <div class="icon-card">
      <svg class="rocket-svg" viewBox="0 0 100 100" fill="none">
        <path d="M44 76C44 76 47 88 50 92C53 88 56 76 56 76H44Z" fill="#F59E0B"/>
        <path d="M47 76C47 76 49 84 50 87C51 84 53 76 53 76H47Z" fill="#FDE047"/>
        <path d="M42 74H58V78H42V74Z" fill="#94A3B8" rx="2"/>
        <path d="M35 52C35 52 24 64 22 72C28 73 37 68 37 68L35 52Z" fill="#E2E8F0"/>
        <path d="M65 52C65 52 76 64 78 72C72 73 63 68 63 68L65 52Z" fill="#E2E8F0"/>
        <path d="M50 12C38 28 36 55 36 74H64C64 55 62 28 50 12Z" fill="#FFFFFF"/>
        <circle cx="50" cy="38" r="9" fill="#38BDF8"/>
        <circle cx="50" cy="38" r="7" fill="#0284C7"/>
        <circle cx="48" cy="36" r="2.5" fill="#BAE6FD"/>
      </svg>
    </div>
  </div>
  <div class="right-side">
    <div class="pill">🎓 Built for F-1 OPT &amp; New Grads</div>
    <h1>StepOne <span>Career</span></h1>
    <div class="sub">All-in-One AI Career Companion</div>
    <div class="feature-list">
      <div class="feature-item"><div class="bullet-icon">✓</div><span>ATS Resume Match &amp; Bullet Point Generator</span></div>
      <div class="feature-item"><div class="bullet-icon">✓</div><span>STAR Interview Flashcards &amp; Speech Coach</span></div>
      <div class="feature-item"><div class="bullet-icon">✓</div><span>H-1B Visa Sponsor Database &amp; Job Tracker</span></div>
    </div>
  </div>
</body>
</html>`;

const htmlPath = path.resolve('scripts/banner.html');
const outPngPath = path.resolve('StepOne - Google Play package/feature-graphic-1024x500.png');
fs.writeFileSync(htmlPath, html);

console.log('HTML written to', htmlPath);

const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

let browserExe = null;
for (const p of edgePaths) {
  if (fs.existsSync(p)) {
    browserExe = p;
    break;
  }
}

if (browserExe) {
  console.log('Found browser:', browserExe);
  const cmd = `"${browserExe}" --headless --disable-gpu --screenshot="${outPngPath}" --window-size=1024,500 --hide-scrollbars "file:///${htmlPath.replace(/\\\\/g, '/')}"`;
  execSync(cmd);
  fs.copyFileSync(outPngPath, 'public/feature-graphic-1024x500.png');
  console.log('High-Res vector banner successfully generated at:', outPngPath);
} else {
  console.log('No browser found, fall back.');
}
