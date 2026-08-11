export type ServiceGroup =
  | 'build'
  | 'digital'
  | 'household'
  | 'professional'
  | 'other';

export type ServiceUnitKind =
  | 'area'
  | 'page'
  | 'faq'
  | 'unit'
  | 'job'
  | 'room'
  | 'floor'
  | 'other';

export type CanonicalServiceDefinition = {
  key: string;
  group: ServiceGroup;
  units: ServiceUnitKind[];
  aliases: string[];
  typoAliases?: string[];
};

export type CanonicalServiceMatch = {
  key: string;
  group: ServiceGroup;
  units: ServiceUnitKind[];
  matchedAlias: string;
  confidence: number;
};

export type CanonicalServiceMention = CanonicalServiceMatch & {
  start: number;
  end: number;
};

const thaiDigitMap: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

export const normalizeServiceText = (value: string): string =>
  String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[๐-๙]/g, (digit) => thaiDigitMap[digit] || digit)
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[&/+_,;:()[\]{}"'`~!?。，“”‘’、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const compact = (value: string): string =>
  normalizeServiceText(value).replace(/[\s.-]+/g, '');

export const SERVICE_INTENT_REGISTRY: CanonicalServiceDefinition[] = [
  {
    key: 'fitout',
    group: 'build',
    units: ['area'],
    aliases: [
      'fitout',
      'fit out',
      'fit-out',
      'office fitout',
      'office fit out',
      'interior fitout',
      'interior work',
      'interior renovation',
      'tenant improvement',
      'buildout',
      'build out',
      'ตกแต่งภายใน',
      'ออกแบบและตกแต่งภายใน',
      'ตกแต่งสำนักงาน',
      'ตกแต่งออฟฟิศ',
      'งานออกแบบตกแต่งภายใน',
      'รีโนเวทภายใน',
      '装修',
      '裝修',
      '办公室装修',
      '辦公室裝修',
      '室内装修',
      '室內裝修',
      '商业装修',
      '商業裝修',
    ],
    typoAliases: ['fiiitout', 'fittout', 'fitot', 'fituot', 'fit-outt'],
  },
  {
    key: 'reinstatement',
    group: 'build',
    units: ['area'],
    aliases: [
      'reinstatement',
      'reinstate',
      'make good',
      'makegood',
      'strip out and reinstate',
      'site restoration',
      'รื้อถอนคืนสภาพ',
      'รื้อถอนและปรับสภาพพื้นที่เดิม',
      'ปรับสภาพพื้นที่เดิม',
      'คืนสภาพ',
      'ทำคืนสภาพ',
      'ส่งคืนพื้นที่',
      '恢复工程',
      '恢復工程',
      '场地恢复',
      '場地復原',
      '退租还原',
      '退租還原',
    ],
    typoAliases: ['reinstatment', 'reinstatementt', 're-instatement'],
  },
  {
    key: 'construction',
    group: 'build',
    units: ['area', 'unit'],
    aliases: [
      'construction',
      'building construction',
      'office building construction',
      'office construction',
      'civil works',
      'civil construction',
      'green construction',
      'งานก่อสร้าง',
      'งานก่อสร้างอาคาร',
      'งานก่อสร้างอาคารสำนักงาน',
      'ก่อสร้าง',
      'ก่อสร้างอาคาร',
      'ก่อสร้างเขียว',
      'งานโยธา',
      'งานโครงสร้าง',
      '建筑施工',
      '建築施工',
      '办公楼建设',
      '辦公樓建設',
      '土建工程',
      '绿色施工',
      '綠色施工',
    ],
    typoAliases: [
      'constuction',
      'constrcion',
      'constrction',
      'construcion',
      'constructionn',
      'constrution',
    ],
  },
  {
    key: 'website',
    group: 'digital',
    units: ['page', 'unit'],
    aliases: [
      'website',
      'website development',
      'web development',
      'web site',
      'webpage',
      'web page',
      'landing page',
      'ecommerce website',
      'พัฒนาเว็บไซต์',
      'งานพัฒนาเว็บไซต์',
      'ทำเว็บไซต์',
      'ทำเวบไซต์',
      'ทำเว็ปไซต์',
      'ทำเว็บ',
      'เขียนเว็บ',
      'เว็บไซต์',
      'เวบไซต์',
      'เว็ปไซต์',
      '网站开发',
      '網站開發',
      '网页开发',
      '網頁開發',
      '网页设计',
      '網頁設計',
    ],
    typoAliases: ['webiste', 'webstie', 'websit', 'webite'],
  },
  {
    key: 'chatbot',
    group: 'digital',
    units: ['faq', 'unit'],
    aliases: [
      'chatbot',
      'chat bot',
      'chatbot development',
      'faq bot',
      'faq chatbot',
      'งานพัฒนาแชตบอต',
      'พัฒนาแชตบอต',
      'พัฒนาแชทบอท',
      'แชตบอตตอบคำถาม',
      'แชตบอตตอบคำถามถาม-ตอบ',
      'ระบบตอบคำถามอัตโนมัติ',
      '聊天机器人',
      '聊天機器人',
      '聊天机器人开发',
      '聊天機器人開發',
      'faq机器人',
      'faq機器人',
      'faq机器人开发',
      'faq機器人開發',
      '智能客服',
    ],
    typoAliases: ['chat boot', 'chatboot', 'chatbt', 'chat bottt'],
  },
  {
    key: 'plumbing',
    group: 'household',
    units: ['job', 'unit', 'room'],
    aliases: [
      'plumbing',
      'plumber',
      'water pipe',
      'pipe repair',
      'water system',
      'drain clearing',
      'leak repair',
      'faucet repair',
      'toilet repair',
      'water pump',
      'ประปา',
      'งานประปา',
      'งานปประปา',
      'ระบบน้ำ',
      'ท่อน้ำ',
      'งานท่อ',
      'สุขาภิบาล',
      'ปั๊มน้ำ',
      '给排水',
      '給排水',
      '管道维修',
      '管道維修',
      '漏水维修',
      '漏水維修',
      '水泵维修',
      '水泵維修',
    ],
    typoAliases: ['plumb', 'pluming', 'plumging', 'plubming'],
  },
  {
    key: 'electrical',
    group: 'household',
    units: ['job', 'unit', 'room'],
    aliases: [
      'electrical',
      'electrician',
      'electrical wiring',
      'wiring',
      'lighting',
      'outlet repair',
      'breaker panel',
      'ไฟฟ้า',
      'งานไฟฟ้า',
      'ระบบไฟ',
      'เดินสายไฟ',
      'แสงสว่าง',
      '电气维修',
      '電氣維修',
      '电力维修',
      '電力維修',
      '照明维修',
      '照明維修',
    ],
    typoAliases: ['electrial', 'electic', 'wirring', 'wireing'],
  },
  {
    key: 'hvac',
    group: 'household',
    units: ['unit', 'job', 'room'],
    aliases: [
      'hvac',
      'air conditioning',
      'air conditioner',
      'aircon',
      'air con',
      'ac repair',
      'duct cleaning',
      'เครื่องปรับอากาศ',
      'ระบบปรับอากาศ',
      'ซ่อมแอร์',
      'ล้างแอร์',
      'แอร์',
      '空调维修',
      '空調維修',
      '暖通空调',
      '暖通空調',
    ],
    typoAliases: ['air conditoning', 'aircondition', 'aircorn'],
  },
  {
    key: 'landscaping',
    group: 'household',
    units: ['area', 'job'],
    aliases: [
      'landscaping',
      'landscape',
      'lawn care',
      'garden maintenance',
      'จัดสวน',
      'จัดภูมิทัศน์',
      'ภูมิทัศน์',
      '园林',
      '園林',
      '景观',
      '景觀',
      '草坪养护',
      '草坪養護',
    ],
    typoAliases: ['landscapping', 'landcaping'],
  },
  {
    key: 'roofing',
    group: 'household',
    units: ['area', 'job'],
    aliases: [
      'roofing',
      'roof repair',
      'roof leak',
      'waterproofing',
      'wall repair',
      'gutter cleaning',
      'หลังคา',
      'ผนัง',
      'หลังคารั่ว',
      'มุงหลังคา',
      'กันซึม',
      '屋顶维修',
      '屋頂維修',
      '墙体维修',
      '牆體維修',
      '防水工程',
    ],
    typoAliases: ['roofng', 'waterprofing'],
  },
  {
    key: 'cleaning',
    group: 'household',
    units: ['job', 'room', 'area'],
    aliases: [
      'cleaning',
      'housekeeping',
      'deep cleaning',
      'home cleaning',
      'laundry service',
      'ทำความสะอาด',
      'แม่บ้าน',
      'ซักรีด',
      '清洁',
      '清潔',
      '家政',
      '深度清洁',
      '深度清潔',
    ],
    typoAliases: ['cleanng', 'houskeeping'],
  },
  {
    key: 'handyman',
    group: 'household',
    units: ['job', 'unit', 'room'],
    aliases: [
      'handyman',
      'general maintenance',
      'home maintenance',
      'fixture installation',
      'drywall repair',
      'door repair',
      'window repair',
      'งานซ่อมบำรุงบ้าน',
      'ช่างซ่อมบ้าน',
      'ซ่อมบำรุง',
      '家居维修',
      '家居維修',
      '综合维修',
      '綜合維修',
    ],
    typoAliases: ['handiman', 'maintanance', 'maintenence'],
  },
  {
    key: 'pest-control',
    group: 'household',
    units: ['job', 'area'],
    aliases: [
      'pest control',
      'termite control',
      'extermination',
      'กำจัดปลวก',
      'กำจัดแมลง',
      'ปลวก',
      '害虫防治',
      '害蟲防治',
      '白蚁防治',
      '白蟻防治',
    ],
    typoAliases: ['pest controll', 'termite controll'],
  },
  {
    key: 'mobile-app',
    group: 'digital',
    units: ['unit', 'page'],
    aliases: [
      'mobile app',
      'mobile app development',
      'app development',
      'ios app',
      'android app',
      'พัฒนาแอปมือถือ',
      'พัฒนาแอป',
      'โมบายแอป',
      '移动应用开发',
      '移動應用開發',
      '手机应用开发',
      '手機應用開發',
    ],
    typoAliases: ['mobile ap', 'app developement'],
  },
  {
    key: 'ai-integration',
    group: 'digital',
    units: ['unit', 'job'],
    aliases: [
      'ai integration',
      'artificial intelligence integration',
      'ai system',
      'บูรณาการ ai',
      'ระบบ ai',
      'ปัญญาประดิษฐ์',
      '人工智能集成',
      '人工智慧整合',
      'ai集成',
      'ai整合',
    ],
  },
  {
    key: 'software',
    group: 'digital',
    units: ['unit', 'page', 'job'],
    aliases: [
      'software development',
      'software engineering',
      'custom software',
      'พัฒนาซอฟต์แวร์',
      'เขียนโปรแกรม',
      'ซอฟต์แวร์',
      '软件开发',
      '軟體開發',
      '软件工程',
      '軟體工程',
    ],
    typoAliases: ['sofware development', 'softwere development'],
  },
  {
    key: 'machine-learning',
    group: 'digital',
    units: ['unit', 'job'],
    aliases: [
      'machine learning',
      'ml model',
      'แมชชีนเลิร์นนิง',
      'การเรียนรู้ของเครื่อง',
      '机器学习',
      '機器學習',
    ],
    typoAliases: ['machine lerning'],
  },
  {
    key: 'consulting',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'consultant',
      'consulting',
      'ที่ปรึกษา',
      '咨询',
      '諮詢',
      '顾问',
      '顧問',
    ],
  },
  {
    key: 'solar',
    group: 'build',
    units: ['unit', 'area', 'job'],
    aliases: [
      'solar',
      'solar panel',
      'solar cell',
      'โซลาร์เซลล์',
      'แผงโซลาร์',
      'พลังงานแสงอาทิตย์',
      '太阳能',
      '太陽能',
      '光伏',
    ],
  },
  {
    key: 'ev-charging',
    group: 'build',
    units: ['unit', 'job'],
    aliases: [
      'ev charging',
      'ev charger',
      'สถานีชาร์จ ev',
      'ชาร์จรถไฟฟ้า',
      '充电桩',
      '充電樁',
      '电动车充电',
      '電動車充電',
    ],
  },
  {
    key: 'green-design',
    group: 'build',
    units: ['area', 'job'],
    aliases: [
      'green building design',
      'sustainable building design',
      'ออกแบบอาคารเขียว',
      '绿色建筑设计',
      '綠色建築設計',
    ],
  },
  {
    key: 'mep-retrofit',
    group: 'build',
    units: ['area', 'job', 'unit'],
    aliases: [
      'mep retrofit',
      'mep renovation',
      'hvac mep retrofit',
      'ระบบปรับอากาศ mep',
      'งานระบบ mep',
      '机电改造',
      '機電改造',
      '暖通改造',
    ],
  },
  {
    key: 'kitchen',
    group: 'build',
    units: ['room', 'area', 'job'],
    aliases: [
      'kitchen',
      'kitchen renovation',
      'ครัว',
      'ห้องครัว',
      'ปรับปรุงครัว',
      '厨房',
      '廚房',
      '厨房改造',
      '廚房改造',
    ],
  },
  {
    key: 'automation',
    group: 'digital',
    units: ['unit', 'job'],
    aliases: [
      'automation',
      'automation system',
      'ระบบอัตโนมัติ',
      '自动化',
      '自動化',
      '自动化系统',
      '自動化系統',
    ],
  },
  {
    key: 'environmental',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'environmental services',
      'environmental consulting',
      'บริการสิ่งแวดล้อม',
      'สิ่งแวดล้อม',
      '环境服务',
      '環境服務',
      '环保咨询',
      '環保諮詢',
    ],
  },
  {
    key: 'security-cctv',
    group: 'build',
    units: ['unit', 'job'],
    aliases: [
      'security cctv',
      'cctv',
      'security camera',
      'ระบบรักษาความปลอดภัย',
      'กล้องวงจรปิด',
      '监控系统',
      '監控系統',
      '安防系统',
      '安防系統',
    ],
  },
  {
    key: 'access-control',
    group: 'build',
    units: ['unit', 'job'],
    aliases: [
      'access control',
      'door access',
      'key card',
      'ระบบประตู',
      'คีย์การ์ด',
      '门禁系统',
      '門禁系統',
      '门卡系统',
      '門卡系統',
    ],
  },
  {
    key: 'smart-home-bms',
    group: 'build',
    units: ['unit', 'job', 'area'],
    aliases: [
      'smart home',
      'building management system',
      'bms',
      'smart building automation',
      'สมาร์ทโฮม',
      'บ้านอัจฉริยะ',
      'อาคารอัจฉริยะ',
      '智能家居',
      '樓宇自控',
      '楼宇自控',
    ],
  },
  {
    key: 'smart-agriculture',
    group: 'build',
    units: ['area', 'unit', 'job'],
    aliases: [
      'smart agriculture',
      'precision agriculture',
      'เกษตรอัจฉริยะ',
      'เกษตรแม่นยำ',
      '智慧农业',
      '智慧農業',
    ],
  },
  {
    key: 'legal',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'lawyer',
      'legal service',
      'legal',
      'ทนายความ',
      'ทนาย',
      '律师',
      '律師',
      '法律服务',
      '法律服務',
    ],
  },
  {
    key: 'accounting',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'accounting',
      'accountant',
      'bookkeeping',
      'นักบัญชี',
      'บัญชี',
      '会计',
      '會計',
      '记账',
      '記帳',
    ],
  },
  {
    key: 'audit-cpa',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'cpa',
      'audit',
      'auditor',
      'ผู้สอบบัญชี',
      'สอบบัญชี',
      '注册会计师',
      '註冊會計師',
      '审计',
      '審計',
    ],
  },
  {
    key: 'architect',
    group: 'professional',
    units: ['job', 'area'],
    aliases: [
      'architect',
      'architecture',
      'สถาปนิก',
      '建筑师',
      '建築師',
      '建筑设计',
      '建築設計',
    ],
  },
  {
    key: 'interior-designer',
    group: 'professional',
    units: ['job', 'area'],
    aliases: [
      'interior designer',
      'interior design professional',
      'มัณฑนากร',
      'นักออกแบบภายใน',
      '室内设计师',
      '室內設計師',
    ],
  },
  {
    key: 'civil-design-engineer',
    group: 'professional',
    units: ['job', 'area'],
    aliases: [
      'civil design engineer',
      'structural design engineer',
      'วิศวกรโยธาออกแบบ',
      'ออกแบบโยธา',
      '结构工程设计',
      '結構工程設計',
    ],
  },
  {
    key: 'civil-construction-engineer',
    group: 'professional',
    units: ['job', 'area'],
    aliases: [
      'civil construction engineer',
      'site civil engineer',
      'วิศวกรโยธาก่อสร้าง',
      'โยธาก่อสร้าง',
      '土木施工工程师',
      '土木施工工程師',
    ],
  },
  {
    key: 'mechanical-design-engineer',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'mechanical design engineer',
      'วิศวกรเครื่องกลออกแบบ',
      'ออกแบบเครื่องกล',
      '机械设计工程师',
      '機械設計工程師',
    ],
  },
  {
    key: 'mechanical-construction-engineer',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'mechanical construction engineer',
      'วิศวกรเครื่องกลก่อสร้าง',
      'เครื่องกลก่อสร้าง',
      '机械施工工程师',
      '機械施工工程師',
    ],
  },
  {
    key: 'electrical-design-engineer',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'electrical design engineer',
      'วิศวกรไฟฟ้าออกแบบ',
      'ออกแบบไฟฟ้า',
      '电气设计工程师',
      '電氣設計工程師',
    ],
  },
  {
    key: 'electrical-construction-engineer',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'electrical construction engineer',
      'วิศวกรไฟฟ้าก่อสร้าง',
      'ไฟฟ้าก่อสร้าง',
      '电气施工工程师',
      '電氣施工工程師',
    ],
  },
  {
    key: 'programmer',
    group: 'digital',
    units: ['job', 'unit'],
    aliases: [
      'programmer',
      'software programmer',
      'โปรแกรมเมอร์',
      '程序员',
      '程式設計師',
    ],
  },
  {
    key: 'digital-marketing',
    group: 'digital',
    units: ['job', 'unit'],
    aliases: [
      'digital marketing',
      'seo',
      'sem',
      'online marketing',
      'การตลาดดิจิทัล',
      'ตลาดออนไลน์',
      '数字营销',
      '數位行銷',
      '网络营销',
      '網路行銷',
    ],
  },
  {
    key: 'safety-officer',
    group: 'professional',
    units: ['job', 'unit'],
    aliases: [
      'safety officer',
      'hse officer',
      'ehs officer',
      'เจ้าหน้าที่ความปลอดภัย',
      'จป',
      '安全官',
      '安全员',
      '安全員',
    ],
  },
];

const normalizedDefinitions = SERVICE_INTENT_REGISTRY.flatMap((definition) =>
  [...definition.aliases, ...(definition.typoAliases || [])].map((alias) => ({
    definition,
    alias,
    normalizedAlias: normalizeServiceText(alias),
    compactAlias: compact(alias),
  })),
).sort((left, right) => right.compactAlias.length - left.compactAlias.length);

const toMatch = (
  definition: CanonicalServiceDefinition,
  matchedAlias: string,
  confidence: number,
): CanonicalServiceMatch => ({
  key: definition.key,
  group: definition.group,
  units: definition.units,
  matchedAlias,
  confidence,
});

const levenshtein = (left: string, right: string): number => {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? Math.max(left.length, right.length);
};

export const canonicalizeServiceText = (
  value: string,
): CanonicalServiceMatch | null => {
  const normalizedValue = normalizeServiceText(value);
  const compactValue = compact(value);
  if (!compactValue) return null;

  const exact = normalizedDefinitions.find(
    ({ normalizedAlias, compactAlias }) =>
      normalizedValue === normalizedAlias ||
      normalizedValue.includes(normalizedAlias) ||
      compactValue.includes(compactAlias),
  );
  if (exact) {
    return toMatch(exact.definition, exact.alias, 1);
  }

  const containsHan = /[\u3400-\u9fff]/u.test(compactValue);
  const minimumFuzzyLength = containsHan ? 4 : 5;
  if (compactValue.length < minimumFuzzyLength || compactValue.length > 48) {
    return null;
  }

  const fuzzyCandidates = normalizedDefinitions
    .filter(({ compactAlias }) => compactAlias.length >= minimumFuzzyLength)
    .map((entry) => {
      const maxLength = Math.max(
        compactValue.length,
        entry.compactAlias.length,
      );
      const confidence =
        1 - levenshtein(compactValue, entry.compactAlias) / maxLength;
      return { ...entry, confidence };
    })
    .sort((left, right) => right.confidence - left.confidence);

  const best = fuzzyCandidates[0];
  const runnerUp = fuzzyCandidates.find(
    (candidate) => candidate.definition.key !== best?.definition.key,
  );
  if (
    !best ||
    best.confidence < (containsHan ? 0.75 : 0.84) ||
    (runnerUp && best.confidence - runnerUp.confidence < 0.08)
  ) {
    return null;
  }

  return toMatch(best.definition, best.alias, best.confidence);
};

export const findCanonicalServiceMentions = (
  value: string,
): CanonicalServiceMention[] => {
  const normalizedValue = normalizeServiceText(value);
  if (!normalizedValue) return [];

  const candidates: CanonicalServiceMention[] = [];
  for (const entry of normalizedDefinitions) {
    let offset = 0;
    while (offset < normalizedValue.length) {
      const start = normalizedValue.indexOf(entry.normalizedAlias, offset);
      if (start < 0) break;
      candidates.push({
        ...toMatch(entry.definition, entry.alias, 1),
        start,
        end: start + entry.normalizedAlias.length,
      });
      offset = start + Math.max(entry.normalizedAlias.length, 1);
    }
  }

  const selected: CanonicalServiceMention[] = [];
  for (const candidate of candidates.sort((left, right) => {
    const lengthDelta = right.end - right.start - (left.end - left.start);
    return lengthDelta || left.start - right.start;
  })) {
    if (
      selected.some(
        (existing) =>
          candidate.start < existing.end && candidate.end > existing.start,
      )
    ) {
      continue;
    }
    selected.push(candidate);
  }

  return selected.sort((left, right) => left.start - right.start);
};

export const getCanonicalServiceDefinition = (
  key: string,
): CanonicalServiceDefinition | null =>
  SERVICE_INTENT_REGISTRY.find((definition) => definition.key === key) || null;
