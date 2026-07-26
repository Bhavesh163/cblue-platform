import { canonicalizeServiceText } from './service-intent-registry';

describe('service intent registry', () => {
  it.each([
    ['office fit out', 'fitout'],
    ['fiiitout', 'fitout'],
    ['ออกแบบและตกแต่งภายใน', 'fitout'],
    ['办公室装修', 'fitout'],
    ['รื้อถอนและปรับสภาพพื้นที่เดิม', 'reinstatement'],
    ['退租还原', 'reinstatement'],
    ['งานก่อสร้างอาคารสำนักงาน', 'construction'],
    ['办公楼建设', 'construction'],
    ['งานพัฒนาเว็บไซต์', 'website'],
    ['网站开发', 'website'],
    ['งานพัฒนาแชตบอตตอบคำถาม', 'chatbot'],
    ['FAQ机器人开发', 'chatbot'],
    ['งานปประปา', 'plumbing'],
    ['漏水维修', 'plumbing'],
    ['วิศวกรโยธาออกแบบ', 'civil-design-engineer'],
    ['结构工程设计', 'civil-design-engineer'],
  ])('canonicalizes %s as %s', (input, expected) => {
    expect(canonicalizeServiceText(input)?.key).toBe(expected);
  });

  it('rejects an ambiguous short typo instead of guessing', () => {
    expect(canonicalizeServiceText('webb')).toBeNull();
  });

  it('does not treat an unrelated cafe service as fit-out', () => {
    expect(canonicalizeServiceText('image ads coffee cafe')).not.toEqual(
      expect.objectContaining({ key: 'fitout' }),
    );
  });

  it('accepts only an unambiguous bounded Chinese character typo', () => {
    expect(canonicalizeServiceText('網站開収')?.key).toBe('website');
  });
});
