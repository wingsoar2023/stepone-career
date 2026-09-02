const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];
let browserExe = null;
for (const p of edgePaths) {
  if (fs.existsSync(p)) { browserExe = p; break; }
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 55%, #020617 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 100px 70px 0 70px;
    position: relative;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(99, 102, 241, 0.2);
    border: 1.5px solid rgba(129, 140, 248, 0.5);
    color: #a5b4fc;
    padding: 12px 28px;
    border-radius: 99px;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  h1 {
    font-size: 66px;
    font-weight: 900;
    color: #ffffff;
    text-align: center;
    line-height: 1.15;
    margin-bottom: 18px;
    text-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  h1 span {
    background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p.sub {
    font-size: 32px;
    font-weight: 600;
    color: #94a3b8;
    text-align: center;
    margin-bottom: 70px;
  }
  .phone-mockup {
    width: 880px;
    height: 1360px;
    background: #ffffff;
    border-radius: 54px 54px 0 0;
    box-shadow: 0 -20px 80px rgba(0,0,0,0.6), 0 0 0 12px #334155;
    padding: 48px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
`;

// Screen 1: ATS Resume Matcher
const html1 = `<!DOCTYPE html><html><head><meta charset='utf-8'><style>${baseStyles}
  .score-card {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 36px;
    padding: 36px;
    display: flex;
    align-items: center;
    gap: 36px;
  }
  .score-circle {
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: conic-gradient(#10b981 0% 88%, #e2e8f0 88% 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 25px rgba(16,185,129,0.3);
  }
  .score-inner {
    width: 124px;
    height: 124px;
    background: #fff;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .score-num { font-size: 46px; font-weight: 900; color: #10b981; line-height: 1; }
  .score-label { font-size: 16px; font-weight: 700; color: #64748b; }
  .kw-box { display: flex; flex-direction: column; gap: 14px; flex: 1; }
  .badge-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .badge-g { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 8px 16px; border-radius: 12px; font-size: 20px; font-weight: 800; }
  .badge-r { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 8px 16px; border-radius: 12px; font-size: 20px; font-weight: 800; }
  .bullet-card {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 30px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .bullet-title { font-size: 24px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; }
  .bullet-text { font-size: 22px; color: #334155; line-height: 1.5; font-weight: 600; }
  .btn-action {
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    color: white;
    padding: 24px;
    border-radius: 24px;
    text-align: center;
    font-size: 26px;
    font-weight: 800;
    box-shadow: 0 12px 30px rgba(79,70,229,0.4);
  }
</style></head>
<body>
  <div class='tag'>🎯 ATS Resume Intelligence</div>
  <h1>Instant <span>ATS Match</span> &amp; Bullets</h1>
  <p class='sub'>Pinpoint gap keywords and craft quantified resume impact</p>
  <div class='phone-mockup'>
    <div class='score-card'>
      <div class='score-circle'>
        <div class='score-inner'>
          <div class='score-num'>88%</div>
          <div class='score-label'>MATCH</div>
        </div>
      </div>
      <div class='kw-box'>
        <div style='font-size:24px;font-weight:800;color:#0f172a;'>Associate PM · Google</div>
        <div class='badge-row'>
          <div class='badge-g'>✓ SQL &amp; Python</div>
          <div class='badge-g'>✓ A/B Testing</div>
          <div class='badge-r'>✕ Kafka</div>
          <div class='badge-r'>✕ Agile Scrum</div>
        </div>
      </div>
    </div>
    <div class='bullet-card'>
      <div class='bullet-title'>✨ AI Generated Impact Bullets (STAR)</div>
      <div class='bullet-text'>• Led cross-functional sprint to build a real-time analytics dashboard in React &amp; SQL, increasing user onboarding retention by <strong>18.4%</strong>.</div>
      <div class='bullet-text'>• Formulated multivariate A/B testing framework across 50,000+ active sessions, reducing funnel latency by <strong>320ms</strong>.</div>
    </div>
    <div class='btn-action'>🚀 Copy Tailored Bullets to Resume</div>
  </div>
</body></html>`;

// Screen 2: STAR Interview Cheat Sheet
const html2 = `<!DOCTYPE html><html><head><meta charset='utf-8'><style>${baseStyles}
  .q-card {
    background: #eef2ff;
    border: 2px solid #c7d2fe;
    border-radius: 28px;
    padding: 28px;
  }
  .q-title { font-size: 26px; font-weight: 800; color: #3730a3; margin-bottom: 8px; }
  .q-sub { font-size: 20px; color: #4338ca; font-weight: 600; }
  .star-box {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .star-row {
    background: #f8fafc;
    border-left: 6px solid #4f46e5;
    border-radius: 18px;
    padding: 20px 24px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .star-letter {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #4f46e5;
    color: white;
    font-size: 22px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .star-desc { font-size: 20px; color: #1e293b; font-weight: 600; line-height: 1.45; }
  .pitch-card {
    background: #ecfdf5;
    border: 2px solid #a7f3d0;
    border-radius: 28px;
    padding: 26px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pitch-left { display: flex; flex-direction: column; gap: 6px; }
  .pitch-title { font-size: 24px; font-weight: 800; color: #065f46; }
  .pitch-sub { font-size: 18px; color: #047857; font-weight: 600; }
  .rec-btn {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: #10b981;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 8px 20px rgba(16,185,129,0.4);
  }
</style></head>
<body>
  <div class='tag'>🎤 Behavioral &amp; Speech Coach</div>
  <h1>Master the <span>STAR Method</span></h1>
  <p class='sub'>Generate customized interview cards &amp; practice 60s speech pitches</p>
  <div class='phone-mockup'>
    <div class='q-card'>
      <div class='q-title'>Q: Tell me about a time you handled conflict.</div>
      <div class='q-sub'>Targeting: Leadership &amp; Engineering Agility</div>
    </div>
    <div class='star-box'>
      <div class='star-row'><div class='star-letter'>S</div><div class='star-desc'><strong>Situation:</strong> Team disagreed on database migration schema during tight 3-week deadline.</div></div>
      <div class='star-row'><div class='star-letter'>T</div><div class='star-desc'><strong>Task:</strong> Align team on PostgreSQL schema without delaying deployment schedule.</div></div>
      <div class='star-row'><div class='star-letter'>A</div><div class='star-desc'><strong>Action:</strong> Set up quick benchmark comparison matrix &amp; proposed hybrid RLS design.</div></div>
      <div class='star-row'><div class='star-letter'>R</div><div class='star-desc'><strong>Result:</strong> Reached consensus in 24h and shipped release 2 days ahead of target.</div></div>
    </div>
    <div class='pitch-card'>
      <div class='pitch-left'>
        <div class='pitch-title'>🎙️ Speech Pitch Coach (Local AI)</div>
        <div class='pitch-sub'>Live WPM Pace &amp; Filler Word Counter</div>
      </div>
      <div class='rec-btn'>▶</div>
    </div>
  </div>
</body></html>`;

// Screen 3: Kanban & H-1B Sponsor Intel
const html3 = `<!DOCTYPE html><html><head><meta charset='utf-8'><style>${baseStyles}
  .h1b-banner {
    background: #f0fdf4;
    border: 2px solid #86efac;
    border-radius: 24px;
    padding: 22px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .h1b-title { font-size: 24px; font-weight: 800; color: #166534; }
  .h1b-badge { background: #15803d; color: #fff; padding: 6px 16px; border-radius: 99px; font-size: 18px; font-weight: 800; }
  .kanban-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .col-box {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 26px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .col-header { font-size: 20px; font-weight: 800; color: #475569; display: flex; justify-content: space-between; }
  .job-card {
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .job-company { font-size: 22px; font-weight: 900; color: #0f172a; }
  .job-role { font-size: 18px; font-weight: 600; color: #64748b; }
  .job-tag { display: inline-flex; background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 8px; font-size: 15px; font-weight: 700; width: fit-content; }
  .offer-card {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 2px solid #10b981;
    border-radius: 22px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style></head>
<body>
  <div class='tag'>💼 H-1B Intel &amp; Job Tracker</div>
  <h1>Track Jobs &amp; <span>H-1B Sponsors</span></h1>
  <p class='sub'>Verified US Department of Labor LCA filing history for target employers</p>
  <div class='phone-mockup'>
    <div class='h1b-banner'>
      <div class='h1b-title'>🏛️ US DOL LCA Verified Database</div>
      <div class='h1b-badge'>OPT / STEM Eligible</div>
    </div>
    <div class='kanban-grid'>
      <div class='col-box'>
        <div class='col-header'><span>INTERVIEWING (3)</span><span>⏳</span></div>
        <div class='job-card'>
          <div class='job-company'>Stripe</div>
          <div class='job-role'>Product Analyst</div>
          <div class='job-tag'>Top H-1B Sponsor</div>
        </div>
        <div class='job-card'>
          <div class='job-company'>Amazon</div>
          <div class='job-role'>Software Engineer I</div>
          <div class='job-tag'>STEM OPT Friendly</div>
        </div>
      </div>
      <div class='col-box'>
        <div class='col-header'><span>OFFERS (1)</span><span>🎉</span></div>
        <div class='offer-card'>
          <div style='font-size:24px;font-weight:900;color:#065f46;'>🎉 Google</div>
          <div style='font-size:20px;font-weight:700;color:#047857;'>Associate PM</div>
          <div style='font-size:26px;font-weight:900;color:#059669;'>$128,000 / yr</div>
          <div style='font-size:16px;font-weight:700;color:#065f46;'>H-1B Cap-Exempt &amp; E-Verify</div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;

fs.writeFileSync('scripts/screen1.html', html1);
fs.writeFileSync('scripts/screen2.html', html2);
fs.writeFileSync('scripts/screen3.html', html3);

const out1 = path.resolve('StepOne - Google Play package/screenshot-1-matcher.png');
const out2 = path.resolve('StepOne - Google Play package/screenshot-2-interview.png');
const out3 = path.resolve('StepOne - Google Play package/screenshot-3-tracker.png');

console.log('Rendering screenshot 1...');
execSync(`"${browserExe}" --headless --disable-gpu --screenshot="${out1}" --window-size=1080,1920 --hide-scrollbars "file:///${path.resolve('scripts/screen1.html').replace(/\\/g, '/')}"`);

console.log('Rendering screenshot 2...');
execSync(`"${browserExe}" --headless --disable-gpu --screenshot="${out2}" --window-size=1080,1920 --hide-scrollbars "file:///${path.resolve('scripts/screen2.html').replace(/\\/g, '/')}"`);

console.log('Rendering screenshot 3...');
execSync(`"${browserExe}" --headless --disable-gpu --screenshot="${out3}" --window-size=1080,1920 --hide-scrollbars "file:///${path.resolve('scripts/screen3.html').replace(/\\/g, '/')}"`);

console.log('All 3 Retina Screenshots (1080x1920) successfully generated!');
 
