// H-1B LCA Sponsorship Reference & Built-in Match Engine
// NOTE: H-1B data below is INDICATIVE and based on publicly reported LCA filing
// patterns. It is NOT legal advice. Always verify current sponsorship policy
// directly with the employer and a licensed immigration attorney before making
// any visa-related decisions.

export const H1B_COMPANY_DATABASE = {
  'google': {
    name: 'Google LLC',
    sponsorshipStatus: 'Heavy H-1B sponsor',
    filingVolume: 'Very high (consistently a top LCA filer)',
    typicalSalary: '$145k–$185k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'Day-1 PERM reported',
    insights: 'Google consistently appears among the largest H-1B LCA filers in the US and is widely reported as STEM OPT friendly for entry-level software, data, and product roles.'
  },
  'meta': {
    name: 'Meta Platforms, Inc.',
    sponsorshipStatus: 'Heavy H-1B sponsor',
    filingVolume: 'Very high',
    typicalSalary: '$140k–$180k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'PERM sponsorship reported',
    insights: 'Meta files a large volume of H-1B petitions annually and is generally reported as welcoming to STEM OPT candidates for product, data, and engineering roles.'
  },
  'amazon': {
    name: 'Amazon.com Services LLC',
    sponsorshipStatus: 'Heavy H-1B sponsor',
    filingVolume: 'Very high (top LCA filer)',
    typicalSalary: '$130k–$165k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'PERM process commonly initiated early',
    insights: 'Amazon is consistently one of the largest H-1B LCA filers in the US and is widely reported as open to F-1 OPT graduates.'
  },
  'microsoft': {
    name: 'Microsoft Corporation',
    sponsorshipStatus: 'Heavy H-1B sponsor',
    filingVolume: 'Very high',
    typicalSalary: '$135k–$170k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'Day-1 PERM reported',
    insights: 'Microsoft is a consistently high-volume H-1B filer and generally reported as sponsoring for PM, software, and data roles across US offices.'
  },
  'apple': {
    name: 'Apple Inc.',
    sponsorshipStatus: 'Frequent H-1B sponsor',
    filingVolume: 'High',
    typicalSalary: '$145k–$190k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'PERM sponsorship reported',
    insights: 'Apple files H-1B petitions regularly for hardware, software, and product roles; sponsorship is evaluated on a case-by-case basis.'
  },
  'bytedance': {
    name: 'ByteDance Inc. / TikTok',
    sponsorshipStatus: 'Frequent H-1B sponsor',
    filingVolume: 'High',
    typicalSalary: '$135k–$175k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'PERM support reported',
    insights: 'ByteDance / TikTok has been an active H-1B filer for product, algorithm, and data roles in San Jose, LA, and NYC.'
  },
  'goldman sachs': {
    name: 'Goldman Sachs & Co.',
    sponsorshipStatus: 'Moderate–High H-1B sponsor',
    filingVolume: 'Moderate–High',
    typicalSalary: '$110k–$140k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'PERM often after 1–2 years',
    insights: 'Goldman Sachs sponsors H-1B for quantitative, technology, and financial analyst roles, generally after some tenure.'
  },
  'mckinsey': {
    name: 'McKinsey & Company',
    sponsorshipStatus: 'Frequent H-1B sponsor',
    filingVolume: 'Moderate–High',
    typicalSalary: '$120k–$160k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'PERM support reported',
    insights: 'McKinsey sponsors H-1B for business technology and data roles; sponsorship is typically reviewed per hire.'
  },
  'nvidia': {
    name: 'NVIDIA Corporation',
    sponsorshipStatus: 'Heavy H-1B sponsor',
    filingVolume: 'Very high',
    typicalSalary: '$150k–$200k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'Day-1 PERM reported',
    insights: 'NVIDIA files a large volume of H-1B petitions and is widely reported as STEM OPT friendly for AI, software, and hardware roles.'
  },
  'salesforce': {
    name: 'Salesforce, Inc.',
    sponsorshipStatus: 'Frequent H-1B sponsor',
    filingVolume: 'High',
    typicalSalary: '$130k–$165k base (typical range)',
    optStemAccepted: true,
    greenCardPolicy: 'PERM support reported',
    insights: 'Salesforce files H-1B petitions across US locations for product, engineering, and customer-success roles.'
  }
};

export function lookupH1bDatabase(jdText) {
  const lowerJd = (jdText || '').toLowerCase();
  for (const key of Object.keys(H1B_COMPANY_DATABASE)) {
    if (lowerJd.includes(key)) {
      return H1B_COMPANY_DATABASE[key];
    }
  }
  return {
    name: 'Standard US Employer / Startup',
    sponsorshipStatus: 'Varies by company',
    filingVolume: 'Unknown — verify per company',
    typicalSalary: '$85k–$125k base (typical entry-level range)',
    optStemAccepted: true,
    greenCardPolicy: 'Varies by company size and policy',
    insights: 'Most US tech and data employers accept F-1 OPT / STEM OPT (up to 36 months of work authorization). H-1B sponsorship policies vary widely; always confirm directly with the employer.'
  };
}

const STOPWORDS = new Set(
  'a an and are as at be but by for from has have if in into is it its of on or such that the their then there these they this to was were will with would can could should may might must not no nor only own same so than too very just also'
    .split(' ')
);

function tokenize(text) {
  return (String(text || '').toLowerCase().match(/[a-z][a-z0-9+.#-]{1,}/g) || [])
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Deterministic keyword-overlap match score between the JD and the user profile.
export function computeMatchScore(jdText, profileData) {
  const jdTokens = [...new Set(tokenize(jdText))];
  if (!jdTokens.length) return 0;

  const profileText = [
    profileData?.targetRole,
    profileData?.major,
    profileData?.skills,
    profileData?.projects,
    profileData?.summary
  ].join(' ');
  const profileTokens = new Set(tokenize(profileText));
  if (!profileTokens.size) return 10; // profile not filled in yet

  const matched = jdTokens.filter((t) => profileTokens.has(t));
  return Math.round((matched.length / jdTokens.length) * 100);
}

function topKeywords(jdText, n = 6) {
  const counts = {};
  tokenize(jdText).forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

const safe = (v, d) => (v && String(v).trim()) ? String(v).trim() : d;

function buildAchievement(projects) {
  const raw = String(projects || '').trim();
  if (!raw) return null;
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = (lines[0] || '').replace(/^[-•*◆◦\d.)\s]+/, '').trim();
  if (!first) return null;
  // Take up to the first complete sentence (period followed by whitespace),
  // otherwise truncate to ~240 chars at a word boundary.
  const sentenceMatch = first.match(/^(.{30,}?\.\s)/);
  let snippet = sentenceMatch ? sentenceMatch[1].trim() : first;
  if (snippet.length > 240) {
    const cut = snippet.slice(0, 240);
    const lastSpace = cut.lastIndexOf(' ');
    snippet = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  }
  return snippet.replace(/[.。]+$/, '') + '.';
}

function buildEnglishLetter({ tone, name, role, education, major, gradYear, skills, summary, achievement }) {
  const opening = {
    Confident: `I am writing to express my strong interest in the ${role} position. As a ${major} graduate of ${education} (${gradYear}), I combine analytical rigor with hands-on product execution.`,
    Formal: `I am writing to respectfully express my interest in the ${role} position. As a ${major} graduate of ${education} (${gradYear}), I have developed a solid foundation in analysis, collaboration, and user-centered delivery.`,
    Concise: `I would like to apply for the ${role} position. I am a ${major} graduate of ${education} (${gradYear}) with strong analytical and execution skills.`,
    Learner: `I am excited to apply for the ${role} position. As a recent ${major} graduate of ${education} (${gradYear}), I combine a fast-learning mindset with a strong drive to contribute from day one.`
  };

  const achievementPara = achievement
    ? `A recent highlight of my experience: ${achievement}`
    : `Across my academic and project work, I have developed a practical toolkit that I am eager to apply to real product challenges.`;

  const optPara = tone === 'Learner'
    ? `I learn new tools quickly, am eligible for F-1 OPT / STEM OPT for up to 36 months without immediate sponsorship, and would welcome the chance to contribute immediately.`
    : `I am eligible to work in the US on F-1 OPT / STEM OPT for up to 36 months without requiring immediate sponsorship, and I would welcome the opportunity to discuss how I can contribute to your team.`;

  const paragraphs = [opening[tone] || opening.Confident, achievementPara];
  if (summary) paragraphs.push(summary);
  paragraphs.push(`My core toolkit includes ${skills}. ${optPara}`);
  paragraphs.push('Thank you for your time and consideration.');
  paragraphs.push(`Sincerely,\n${name}`);

  if (tone === 'Concise') {
    return `Dear Hiring Manager,\n\n${paragraphs.slice(1, -1).join('\n\n')}\n\nBest regards,\n${name}`;
  }
  return `Dear Hiring Manager,\n\n${paragraphs.join('\n\n')}`;
}

function buildZhLetter({ name, role, education, major, gradYear, skills, summary, achievement }) {
  const achievementPara = achievement
    ? `在我的过往经历中，有一项值得一提的成果：${achievement}`
    : `在学业与项目实践中，我积累了扎实的分析与执行能力，渴望将其应用到真实的业务问题中。`;

  const paragraphs = [
    `我写此信旨在表达我对 ${role} 岗位的强烈求职意向。作为毕业于 ${education} 的 ${major} 专业学生（${gradYear}），我兼备数据分析与产品执行能力。`,
    achievementPara
  ];
  if (summary) paragraphs.push(summary);
  paragraphs.push(`我的核心工具库包括 ${skills}。我拥有 F-1 OPT / STEM OPT 留美工作资格（长达 36 个月合法工作期），并乐于为团队贡献价值。`);
  paragraphs.push('感谢您的宝贵时间与考量。');
  paragraphs.push(`此致，\n${name}`);

  return `尊敬的招聘经理：\n\n${paragraphs.join('\n\n')}`;
}

function buildBullets({ major, skills, summary, achievement }) {
  const bullets = [];
  if (achievement) {
    const text = achievement.charAt(0).toUpperCase() + achievement.slice(1);
    bullets.push(`• ${text}${text.endsWith('.') ? '' : '.'}`);
  }
  const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3).join(', ');
  if (skillList) {
    bullets.push(`• Hands-on proficiency in ${skillList}, with a record of applying them to real product and data problems.`);
  }
  if (summary) {
    const firstSentence = summary.split(/[.!?]/)[0].trim();
    bullets.push(`• ${firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)}${firstSentence.endsWith('.') ? '' : '.'}`);
  } else {
    bullets.push('• Eligible for F-1 OPT / STEM OPT work authorization (up to 36 months) and ready to contribute from day one.');
  }
  return bullets;
}

export async function analyzeJdWithAi({ jdText, profileData, tone = 'Confident', currentLang = 'en' }) {
  const companyInfo = lookupH1bDatabase(jdText);
  const matchScore = computeMatchScore(jdText, profileData);

  const data = {
    name: safe(profileData?.name, 'Alex Rivera'),
    role: safe(profileData?.targetRole, 'Associate Product Manager'),
    education: safe(profileData?.education, 'UC Berkeley (B.S.)'),
    major: safe(profileData?.major, 'Business Administration & Data Science'),
    gradYear: safe(profileData?.gradYear, 'Class of 2026'),
    skills: safe(profileData?.skills, 'SQL, Figma, Python, Agile, User Research'),
    summary: safe(profileData?.summary, ''),
    achievement: buildAchievement(profileData?.projects)
  };

  const coverLetterEnglish = buildEnglishLetter({ tone, ...data });
  const coverLetterNative = currentLang === 'zh' ? buildZhLetter(data) : null;

  const bullets = buildBullets(data);
  const keywords = topKeywords(jdText);

  return {
    matchScore,
    companyInfo,
    coverLetterEnglish,
    coverLetterNative,
    bullets,
    recommendations: [
      `Quantify each achievement in your resume with concrete numbers (users, % growth, $ impact).`,
      `Mirror the exact keywords from the job description${keywords.length ? ` (${keywords.join(', ')})` : ''} in your resume and LinkedIn headline.`,
      `State your OPT / STEM OPT work authorization status clearly in your resume and LinkedIn profile.`
    ]
  };
}
