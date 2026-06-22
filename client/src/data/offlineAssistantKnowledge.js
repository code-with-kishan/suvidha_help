const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const routeGuides = {
  '/login': [
    'Step 1: Enter Full Name.',
    'Step 2: Enter 10-digit Mobile Number.',
    'Step 3: Enter Email Address.',
    'Step 4: Enter 12-digit Aadhaar Number.',
    'Step 5: Click Send OTP.',
    'Step 6: Enter OTP and click Verify OTP.'
  ],
  '/services': [
    'Step 1: Select the local issue type.',
    'Step 2: Describe what is happening in your area.',
    'Step 3: Click Submit Issue Report.',
    'Step 4: Save the generated reference ID.'
  ],
  '/complaints': [
    'Step 1: Select the escalation category.',
    'Step 2: Explain why the issue needs stronger follow-up.',
    'Step 3: Click Submit Escalation.',
    'Step 4: Save the reference ID for tracking.'
  ],
  '/payment': [
    'Step 1: Select the support payment category.',
    'Step 2: Enter the payment amount.',
    'Step 3: Click Create Support Payment.',
    'Step 4: Mark Success or Failed.',
    'Step 5: Download receipt if available.'
  ],
  '/status-tracking': [
    'Step 1: Open the issue tracking page.',
    'Step 2: Enter your issue or escalation reference ID.',
    'Step 3: Submit to view latest status.'
  ],
  '/upload-documents': [
    'Step 1: Select the evidence type.',
    'Step 2: Upload the supporting file.',
    'Step 3: Submit and confirm upload status.'
  ]
};

const generalAnswers = [
  {
    test: (q) => /(hello|hi|hey|hii|namaste|नमस्ते)/.test(q),
    answer: 'Hello 👋 I am Community Hero assistant. I can guide you step-by-step for reporting issues, escalating cases, uploading evidence, payments, tracking, and login.'
  },
  {
    test: (q) => /(how are you|कैसे हो|कैसी हो)/.test(q),
    answer: 'I am great and ready to help you. Tell me which page you are on, and I will give exact steps.'
  },
  {
    test: (q) => /(who are you|what are you|तुम कौन हो|आप कौन हैं)/.test(q),
    answer:
      'I am Suvidha, your offline assistant. I work without API calls and use preloaded website guidance for service help.'
  },
  {
    test: (q) => /(where|kahan|कहाँ).*login|login.*where/.test(q),
    answer: 'Open Community Login from the side navigation. Then follow steps: Name → Mobile → Email → Aadhaar → Send OTP → Verify OTP.'
  },
  {
    test: (q) => /(keyboard|keypad|typing|type|toggle keyboard|कीबोर्ड)/.test(q),
    answer: 'Use the Toggle Keyboard button on forms. In this chat, click Toggle Keyboard to open the unique on-screen keyboard for typing.'
  },
  {
    test: (q) => /(offline|internet|network)/.test(q),
    answer: 'This assistant runs fully offline with pre-stored guidance. No external API is required for chat responses.'
  }
];

const pageHint = (path) => {
  if (path.startsWith('/services')) return 'services';
  if (path.startsWith('/complaints')) return 'escalations';
  if (path.startsWith('/payment')) return 'payment';
  if (path.startsWith('/status-tracking')) return 'tracking';
  if (path.startsWith('/upload-documents')) return 'documents';
  if (path.startsWith('/login')) return 'login';
  return 'dashboard';
};

const guideByQuery = (q, path) => {
  if (/(login|otp|aadhaar|mobile|email)/.test(q)) return routeGuides['/login'];
  if (/(service|request|report issue|new issue)/.test(q)) return routeGuides['/services'];
  if (/(complaint|issue|problem)/.test(q)) return routeGuides['/complaints'];
  if (/(payment|bill|receipt)/.test(q)) return routeGuides['/payment'];
  if (/(track|status)/.test(q)) return routeGuides['/status-tracking'];
  if (/(document|upload)/.test(q)) return routeGuides['/upload-documents'];

  const matchingRoute = Object.keys(routeGuides).find((key) => path.startsWith(key));
  if (matchingRoute) return routeGuides[matchingRoute];
  return null;
};

export const getOfflineAssistantReply = ({ query, currentPath = '/' }) => {
  const q = normalize(query);
  if (!q) {
    return 'Please type your question. Example: how to report an issue step by step.';
  }

  const general = generalAnswers.find((item) => item.test(q));
  if (general) return general.answer;

  const strictSteps = guideByQuery(q, currentPath);
  if (strictSteps?.length) {
    return `Strict Steps:\n${strictSteps.map((step) => `• ${step}`).join('\n')}`;
  }

  return `I can help with strict steps for login, issue reporting, escalations, payments, tracking, and evidence upload. You are currently on the ${pageHint(currentPath)} page. Ask: "how do I fill this form?".`;
};

export const offlineAssistantQuickPrompts = [
  'How to report an issue?',
  'How to escalate a local problem?',
  'How to make a support payment?',
  'How to complete login with OTP?',
  'Hi'
];
