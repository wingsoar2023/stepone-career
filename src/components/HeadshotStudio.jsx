import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Sparkles, Sliders, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTranslation } from '../utils/i18n';

export default function HeadshotStudio({ profileData, markStepDone, setActiveTab, currentLang }) {
  const t = (key) => getTranslation(currentLang, key);

  const [imageSrc, setImageSrc] = useState(null);
  const [bgColor, setBgColor] = useState('gradient-blue');
  const [brightness, setBrightness] = useState(105);
  const [contrast, setContrast] = useState(102);
  const [showBadge, setShowBadge] = useState(true);
  const [badgeText, setBadgeText] = useState('#OpenToWork');
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Background presets
  const bgPresets = [
    { id: 'gradient-blue', name: t('bgBlue'), bg: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)' },
    { id: 'modern-slate', name: t('bgSlate'), bg: 'linear-gradient(135deg, #334155 0%, #0F172A 100%)' },
    { id: 'warm-daylight', name: t('bgWarm'), bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE047 100%)' },
    { id: 'emerald-focus', name: t('bgEmerald'), bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
    { id: 'studio-purple', name: t('bgPurple'), bg: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)' },
    { id: 'clean-white', name: t('bgWhite'), bg: '#F8FAFC' }
  ];

  // Default sample image (SVG portrait)
  useEffect(() => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 400;
    sampleCanvas.height = 400;
    const ctx = sampleCanvas.getContext('2d');
    
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, 0, 400, 400);
    
    ctx.fillStyle = '#F87171';
    ctx.beginPath();
    ctx.arc(200, 160, 75, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(200, 360, 120, 100, 0, 0, Math.PI * 2);
    ctx.fill();

    setImageSrc(sampleCanvas.toDataURL('image/png'));
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;

      if (bgColor === 'gradient-blue') {
        const grd = ctx.createLinearGradient(0, 0, 600, 600);
        grd.addColorStop(0, '#0A66C2');
        grd.addColorStop(1, '#004182');
        ctx.fillStyle = grd;
      } else if (bgColor === 'modern-slate') {
        const grd = ctx.createLinearGradient(0, 0, 600, 600);
        grd.addColorStop(0, '#334155');
        grd.addColorStop(1, '#0F172A');
        ctx.fillStyle = grd;
      } else if (bgColor === 'warm-daylight') {
        const grd = ctx.createLinearGradient(0, 0, 600, 600);
        grd.addColorStop(0, '#FEF3C7');
        grd.addColorStop(1, '#FDE047');
        ctx.fillStyle = grd;
      } else if (bgColor === 'emerald-focus') {
        const grd = ctx.createLinearGradient(0, 0, 600, 600);
        grd.addColorStop(0, '#059669');
        grd.addColorStop(1, '#047857');
        ctx.fillStyle = grd;
      } else if (bgColor === 'studio-purple') {
        const grd = ctx.createLinearGradient(0, 0, 600, 600);
        grd.addColorStop(0, '#7C3AED');
        grd.addColorStop(1, '#4C1D95');
        ctx.fillStyle = grd;
      } else {
        ctx.fillStyle = '#F8FAFC';
      }
      ctx.fillRect(0, 0, 600, 600);

      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      const aspect = img.width / img.height;
      let drawW = 600;
      let drawH = 600;
      let offsetX = 0;
      let offsetY = 0;

      if (aspect > 1) {
        drawW = 600 * aspect;
        offsetX = -(drawW - 600) / 2;
      } else {
        drawH = 600 / aspect;
        offsetY = -(drawH - 600) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      ctx.filter = 'none';

      if (showBadge) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(300, 300, 275, Math.PI * 0.25, Math.PI * 0.75);
        ctx.lineWidth = 36;
        ctx.strokeStyle = badgeText === '#OpenToWork' ? '#059669' : '#0A66C2';
        ctx.stroke();

        ctx.font = 'bold 26px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, 300, 560);
        ctx.restore();
      }

      setPreviewUrl(canvas.toDataURL('image/png'));
    };
  }, [imageSrc, bgColor, brightness, contrast, showBadge, badgeText]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `StepOne_LinkedIn_ProfilePhoto.png`;
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.click();
    markStepDone('headshot');

    try {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch(e) {}
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Editor Controls */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '4px' }}>{t('step')} 02</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{t('headshotTitle')}</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {t('headshotDesc')}
          </p>

          {/* Upload Button */}
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
            >
              <Upload size={18} />
              {t('uploadPhoto')}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent-green)', textAlign: 'center', marginTop: '0.4rem', fontWeight: 600 }}>
              <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
              {t('privacyTag')}
            </p>
          </div>

          {/* Preset Background Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
              {t('selectBgStyle')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {bgPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setBgColor(preset.id)}
                  style={{
                    height: '46px',
                    borderRadius: 'var(--radius-md)',
                    background: preset.bg,
                    border: bgColor === preset.id ? '3px solid var(--primary)' : '1px solid var(--border-light)',
                    boxShadow: bgColor === preset.id ? '0 0 10px rgba(79, 70, 229, 0.4)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: preset.id === 'clean-white' ? '#000' : '#FFF',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {bgColor === preset.id && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Brightness & Contrast Adjustment */}
          <div style={{ marginBottom: '1.25rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <Sliders size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t('lightingEnhance')}</span>
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>{t('brightness')}</span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="140"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>{t('contrast')}</span>
                <span>{contrast}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="130"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* LinkedIn Badge Option */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-main)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t('badgeToggleTitle')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('badgeToggleDesc')}</div>
            </div>
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(e) => setShowBadge(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={handleDownload}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
          >
            <Download size={18} />
            {t('downloadPhoto')}
          </button>
        </div>

        {/* Live Preview Canvas & LinkedIn Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} color="var(--primary)" /> {t('livePreview')}
            </h3>
            
            <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: '50%', overflow: 'hidden', border: '4px solid white', boxShadow: 'var(--shadow-lg)' }}>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Simulated LinkedIn Profile Mockup */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ height: '70px', background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)' }} />
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', marginTop: '-35px', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: '3px solid white', overflow: 'hidden', background: '#DDD', flexShrink: 0 }}>
                {previewUrl && (
                  <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%' }} />
                )}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{profileData?.name || 'Alex Rivera'}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profileData?.targetRole || 'Associate Product Manager'}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{profileData?.education || 'UC Berkeley'} · United States</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              markStepDone('headshot');
              setActiveTab('matcher');
            }}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span>{t('nextMatcher')}</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
