import { parseRequestedServices } from './multilingual-service-request-parser';

const expectedFiveServices = [
  { canonicalKey: 'fitout', quantity: 1000, unit: 'sqm' },
  { canonicalKey: 'reinstatement', quantity: 100, unit: 'sqm' },
  { canonicalKey: 'construction', quantity: 100, unit: 'sqm' },
  { canonicalKey: 'website', quantity: 10, unit: 'page' },
  { canonicalKey: 'chatbot', quantity: 100, unit: 'faq' },
];

describe('parseRequestedServices', () => {
  it('extracts the exact reported Thai multi-service request', () => {
    const description =
      'ต้องการทีมงานสำหรับดำเนินการออกแบบและตกแต่งภายในสำนักงานขนาด 1,000 ตร.ม., ' +
      'งานรื้อถอนและปรับสภาพพื้นที่เดิมขนาด 100 ตร.ม., ' +
      'งานก่อสร้างอาคารสำนักงานขนาด 100 ตร.ม., ' +
      'งานพัฒนาเว็บไซต์จำนวน 10 หน้า และ' +
      'งานพัฒนาแชตบอตตอบคำถามถาม-ตอบ (FAQ) จำนวน 100 ข้อ';

    expect(parseRequestedServices(description)).toEqual(
      expectedFiveServices.map((expected) => expect.objectContaining(expected)),
    );
  });

  it.each([
    'I want office fit out 1000 m2, reinstatement 100 m², construction 100 sq.m., website development 10 pages and chatbot development 100 FAQs.',
    '办公室装修1000平方米、场地恢复100平方米、办公楼建设100平方米、网站开发10页以及FAQ机器人开发100问答',
    '辦公室裝修1000平方米、場地復原100平方米、辦公樓建設100平方米、網站開發10頁以及FAQ機器人開發100問答',
  ])(
    'extracts equivalent multilingual service lines from %s',
    (description) => {
      expect(parseRequestedServices(description)).toEqual(
        expectedFiveServices.map((expected) =>
          expect.objectContaining(expected),
        ),
      );
    },
  );

  it('supports quantities before services and compact Thai conjunctions', () => {
    const result = parseRequestedServices(
      '1000ตร.ม.ตกแต่งภายในและ100ตร.ม.ก่อสร้างอาคารพร้อม10หน้าพัฒนาเว็บไซต์',
    );

    expect(result).toEqual([
      expect.objectContaining({
        canonicalKey: 'fitout',
        quantity: 1000,
        unit: 'sqm',
      }),
      expect.objectContaining({
        canonicalKey: 'construction',
        quantity: 100,
        unit: 'sqm',
      }),
      expect.objectContaining({
        canonicalKey: 'website',
        quantity: 10,
        unit: 'page',
      }),
    ]);
  });

  it('normalizes Thai and full-width digits', () => {
    expect(
      parseRequestedServices('ตกแต่งภายใน ๑๐๐ ตร.ม. และเว็บไซต์ １０ หน้า'),
    ).toEqual([
      expect.objectContaining({
        canonicalKey: 'fitout',
        quantity: 100,
        unit: 'sqm',
      }),
      expect.objectContaining({
        canonicalKey: 'website',
        quantity: 10,
        unit: 'page',
      }),
    ]);
  });

  it('caps extracted lines at thirty', () => {
    const description = Array.from(
      { length: 35 },
      (_, index) => `website development ${index + 1} pages`,
    ).join(', ');

    expect(parseRequestedServices(description)).toHaveLength(30);
  });

  it('skips unrelated text rather than inventing a service', () => {
    expect(parseRequestedServices('coffee catering 100 guests')).toEqual([]);
  });

  it('extracts every line from a multi-service request with common English typos', () => {
    expect(
      parseRequestedServices(
        'office fitotu 1000 m2, reinstatment 100 m2, office building constrction 100 m2, website devlopment 10 pages, chat bot developmnt 100 FAQs',
      ),
    ).toEqual([
      expect.objectContaining({
        canonicalKey: 'fitout',
        quantity: 1000,
        unit: 'sqm',
      }),
      expect.objectContaining({
        canonicalKey: 'reinstatement',
        quantity: 100,
        unit: 'sqm',
      }),
      expect.objectContaining({
        canonicalKey: 'construction',
        quantity: 100,
        unit: 'sqm',
      }),
      expect.objectContaining({
        canonicalKey: 'website',
        quantity: 10,
        unit: 'page',
      }),
      expect.objectContaining({
        canonicalKey: 'chatbot',
        quantity: 100,
        unit: 'faq',
      }),
    ]);
  });
  it('recovers unlisted but unambiguous service typos near quantities', () => {
    expect(parseRequestedServices('fitotu 1000 m2, 網站開収 10 頁')).toEqual([
      expect.objectContaining({
        canonicalKey: 'fitout',
        quantity: 1000,
        unit: 'sqm',
      }),
      expect.objectContaining({
        canonicalKey: 'website',
        quantity: 10,
        unit: 'page',
      }),
    ]);
  });
});
