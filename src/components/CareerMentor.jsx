import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, User, Bot } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { useQuota } from '../context/QuotaContext';
import { useAuth } from '../context/AuthContext';

export default function CareerMentor({ profileData, markStepDone, currentLang }) {
  const t = (key) => getTranslation(currentLang, key);
  const { getQuota, consumeQuota } = useQuota();
  const { isPro } = useAuth();
  const mentorQuota = getQuota('mentorQuestions');

  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `${t('greeting')}`
    }
  ]);

  // Update initial greeting message when language changes
  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        text: `${t('greeting')}`
      }
    ]);
  }, [currentLang]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const presetQuestions = [
    t('preset1'),
    t('preset2'),
    t('preset3'),
    t('preset4'),
    t('preset5')
  ];

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim()) return;

    const allowed = await consumeQuota('mentorQuestions');
    if (!allowed) return;

    const updated = [...messages, { sender: 'user', text: textToSend }];
    setMessages(updated);
    if (!queryText) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = textToSend.toLowerCase();

      if (lower.includes('internship') || lower.includes('lack') || textToSend.includes('经验') || textToSend.includes('अनुभव')) {
        reply = currentLang === 'zh'
          ? `别担心！美国面试官更看重「解决问题的敏捷性」和「可迁移能力」，而不是单纯的年限。\n\n三步回应策略：\n1. 坦然承认："我的经验主要来自校园领导力与学术项目..."\n2. 突出成果："我曾带领团队用 Figma 设计 MVP，通过数据分析把留存率提升了 18%。"\n3. 强调热情："我学习新工具很快，渴望立刻为团队创造价值！"`
          : currentLang === 'en'
            ? `Don't worry! US tech recruiters value problem-solving agility and transferable skills over pure tenure.\n\n3-Step Response Strategy:\n1. Acknowledge: "While my experience stems primarily from campus leadership and academic projects..."\n2. Highlight Impact: "...I led a team of 4 to design a wireframe MVP in Figma, achieving an 18% retention boost through data analysis."\n3. Passion & Agility: "I learn new tools rapidly and am eager to bring immediate productivity to your team!"`
            : `Don't worry! US recruiters value problem-solving agility and transferable skills.\n\nHighlight your campus project results (such as Figma wireframing, SQL data extraction, retention improvements) and express strong learning enthusiasm!`;
      } else if (lower.includes('elevator') || lower.includes('pitch') || textToSend.includes('自我介绍')) {
        reply = currentLang === 'zh'
          ? `60 秒电梯演讲公式：【过往成绩 + 岗位匹配 + 价值主张】\n\n示例：\n"您好！我是 ${profileData?.name || 'Alex'}，${profileData?.education || '信息系统'} 专业毕业生。我的核心优势在于量化数据分析、用户研究与敏捷执行。项目中，我通过漏斗优化将用户留存提升了 18%。期待为贵团队的目标贡献力量！"`
          : `60-Second Elevator Pitch Formula: 【Past Track Record + Match + Value Prop】\n\nExample:\n"Hi! I'm ${profileData?.name || 'Alex'}, a graduate in ${profileData?.education || 'Information Systems'}. My core strengths lie in quantitative data analysis, user research, and agile execution. During my project, I boosted user retention by 18% through funnel optimization. I look forward to contributing to your team's goals today!"`;
      } else if (lower.includes('opt') || lower.includes('visa') || lower.includes('h-1b') || textToSend.includes('签证')) {
        reply = currentLang === 'zh'
          ? `礼貌回应签证赞助问题：\n"我目前拥有 F-1 OPT / STEM OPT 美国合法工作资格（最长 36 个月），短期内无需签证赞助。长期来看，随着我为团队创造价值，我非常欢迎 H-1B 赞助的机会。"`
          : `Polite Visa Sponsorship Response:\n"I am currently eligible to work in the US under F-1 OPT / STEM OPT for up to 36 months without requiring immediate visa sponsorship. In the long term, I welcome opportunities for H-1B sponsorship as I deliver impactful results to your team."`;
      } else if (lower.includes('follow-up') || lower.includes('follow up')) {
        reply = currentLang === 'zh'
          ? `礼貌的跟进邮件模板：\n"尊敬的招聘负责人：我于 [日期] 提交了 [岗位] 的申请。我非常欣赏贵团队的工作，想询问一下申请进展。如需补充任何材料请随时告知。\n此致，[你的名字]"`
          : `Polite Follow-up Template:\n"Dear [Hiring Manager], I submitted my application for the [Position] role on [Date]. I am very excited about your team's work and wanted to check in on the status of my application. Please let me know if you need any additional materials. Best regards, [Your Name]"`;
      } else {
        reply = t('goldenRules');
      }

      setMessages([...updated, { sender: 'ai', text: reply }]);
      setIsTyping(false);
      markStepDone('mentor');
    }, 900);
  };

  return (
    <div className="fade-in" style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div className="glass-card" style={{ padding: '1.5rem', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              {t('mentorTitle')}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {t('mentorDesc')}
            </p>
          </div>
        </div>

        {/* Preset Question Bubbles */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              style={{
                whiteSpace: 'nowrap',
                padding: '0.4rem 0.85rem',
                borderRadius: '99px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              💡 {q}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1rem' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              {msg.sender === 'ai' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
              )}

              <div style={{
                maxWidth: '75%',
                padding: '0.85rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-main)',
                color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-light)'
              }}>
                {msg.text}
              </div>

              {msg.sender === 'user' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={18} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} />
              </div>
              <span>{t('thinking')}</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder={t('askPlaceholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{
              flex: 1,
              padding: '0.8rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontSize: '0.9rem'
            }}
          />
          <button
            onClick={() => handleSend()}
            className="btn-primary"
            style={{ padding: '0.8rem 1.25rem' }}
          >
            <Send size={16} />
            {t('send')}
          </button>
        </div>

      </div>
    </div>
  );
}
