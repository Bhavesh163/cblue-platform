import {
  CanonicalServiceMention,
  ServiceUnitKind,
  canonicalizeServiceText,
  findCanonicalServiceMentions,
  getCanonicalServiceDefinition,
} from './service-intent-registry';

export type ParsedRequestedService = {
  canonicalKey: string;
  quantity: number;
  unit: string;
  unitKind: ServiceUnitKind;
  sourceIndex: number;
  sourceText: string;
  confidence: number;
};

type QuantityMention = {
  quantity: number;
  unit: string;
  unitKind: ServiceUnitKind;
  start: number;
  end: number;
  segment: number;
};

const thaiDigits: Record<string, string> = {
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

const replaceNumberAdjacentUnit = (
  value: string,
  aliases: string,
  canonicalUnit: string,
): string =>
  value
    .replace(
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${aliases})`, 'giu'),
      `$1 ${canonicalUnit}`,
    )
    .replace(
      new RegExp(`(?:${aliases})\\s*(\\d+(?:\\.\\d+)?)`, 'giu'),
      `${canonicalUnit} $1`,
    );

const normalizeRequestText = (value: string): string => {
  let normalized = String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[๐-๙]/g, (digit) => thaiDigits[digit] || digit)
    .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, '');

  normalized = replaceNumberAdjacentUnit(
    normalized,
    'ตาราง\\s*เมตร|ตร\\.?\\s*ม\\.?|平方米|平方公尺|平米|m\\s*[²2]|sq\\.?\\s*m\\.?|square\\s*met(?:er|re)s?',
    'sqm',
  );
  normalized = replaceNumberAdjacentUnit(
    normalized,
    'pages?|หน้า|页|頁',
    'page',
  );
  normalized = replaceNumberAdjacentUnit(
    normalized,
    'faqs?|ข้อ|คำถาม|问答|問答|問題|问题',
    'faq',
  );
  normalized = replaceNumberAdjacentUnit(normalized, 'units?|ชุด', 'unit');
  normalized = replaceNumberAdjacentUnit(normalized, 'jobs?|งาน', 'job');
  normalized = replaceNumberAdjacentUnit(
    normalized,
    'rooms?|ห้อง|房间|房間',
    'room',
  );
  normalized = replaceNumberAdjacentUnit(
    normalized,
    'floors?|ชั้น|楼层|樓層',
    'floor',
  );

  return normalized
    .replace(/[，；、]/g, (separator) => (separator === '、' ? '、' : ','))
    .replace(/\s+/g, ' ')
    .trim();
};
const unitKindByToken: Record<string, ServiceUnitKind> = {
  sqm: 'area',
  page: 'page',
  faq: 'faq',
  unit: 'unit',
  job: 'job',
  room: 'room',
  floor: 'floor',
};

const defaultUnit = (unitKind: ServiceUnitKind): string => {
  if (unitKind === 'area') return 'sqm';
  if (unitKind === 'other') return 'unit';
  return unitKind;
};

const segmentAt = (value: string, index: number): number => {
  let segment = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (/[,\n;、]/.test(value[cursor] || '')) segment += 1;
  }
  return segment;
};

const extractQuantities = (value: string): QuantityMention[] => {
  const quantities: QuantityMention[] = [];
  const pattern =
    /(?<!\d)(\d+(?:\.\d+)?)\s*(sqm|page|faq|unit|job|room|floor)?(?!\d)/giu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    const quantity = Number(match[1]);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity >= 1_000_000) {
      continue;
    }
    const unit = String(match[2] || '').toLowerCase();
    quantities.push({
      quantity,
      unit: unit || 'unit',
      unitKind: unitKindByToken[unit] || 'other',
      start: match.index,
      end: pattern.lastIndex,
      segment: segmentAt(value, match.index),
    });
  }
  return quantities;
};

const mentionDistance = (
  quantity: QuantityMention,
  service: CanonicalServiceMention,
): number => {
  if (quantity.end <= service.start) return service.start - quantity.end;
  if (service.end <= quantity.start) return quantity.start - service.end;
  return 0;
};

const isCompatible = (
  quantity: QuantityMention,
  service: CanonicalServiceMention,
): boolean => {
  if (quantity.unitKind === 'other') return true;
  return service.units.includes(quantity.unitKind);
};

type SegmentedServiceMention = CanonicalServiceMention & { segment: number };

const inferSegmentTypoMentions = (
  value: string,
  exactMentions: SegmentedServiceMention[],
): SegmentedServiceMention[] => {
  const inferred: SegmentedServiceMention[] = [];
  const boundaries = [0];
  for (let index = 0; index < value.length; index += 1) {
    if (/[,\n;、]/.test(value[index] || '')) boundaries.push(index + 1);
  }
  boundaries.push(value.length + 1);

  for (let segment = 0; segment < boundaries.length - 1; segment += 1) {
    if (exactMentions.some((mention) => mention.segment === segment)) continue;
    const start = boundaries[segment] ?? 0;
    const end = Math.max(start, (boundaries[segment + 1] ?? value.length) - 1);
    const candidateText = value
      .slice(start, end)
      .replace(/\d+(?:\.\d+)?/g, ' ')
      .replace(/\b(?:sqm|page|faq|unit|job|room|floor)\b/giu, ' ')
      .replace(
        /\b(?:want|need|require|team|carry|out|for|please|project|service|work)\b/giu,
        ' ',
      )
      .replace(/(?:ต้องการ|ทีมงาน|สำหรับ|ดำเนินการ|ขนาด|จำนวน)/gu, ' ')
      .replace(/(?:需要|要求|项目|項目|工程|数量|數量)/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const match = canonicalizeServiceText(candidateText);
    if (!match || match.confidence >= 1) continue;
    inferred.push({
      ...match,
      start,
      end,
      segment,
    });
  }

  return inferred;
};
export const parseRequestedServices = (
  description: string,
  maxItems = 30,
): ParsedRequestedService[] => {
  if (!description || maxItems <= 0) return [];
  const normalized = normalizeRequestText(description);
  const quantities = extractQuantities(normalized);
  const exactMentions: SegmentedServiceMention[] = findCanonicalServiceMentions(
    normalized,
  ).map((mention) => ({
    ...mention,
    segment: segmentAt(normalized, mention.start),
  }));
  const mentions = [
    ...exactMentions,
    ...inferSegmentTypoMentions(normalized, exactMentions),
  ].sort((left, right) => left.start - right.start);
  if (mentions.length === 0 || quantities.length === 0) return [];

  const assignments: Array<{
    quantityIndex: number;
    serviceIndex: number;
    distance: number;
    sameSegment: boolean;
  }> = [];

  quantities.forEach((quantity, quantityIndex) => {
    mentions.forEach((service, serviceIndex) => {
      if (!isCompatible(quantity, service)) return;
      assignments.push({
        quantityIndex,
        serviceIndex,
        distance: mentionDistance(quantity, service),
        sameSegment: quantity.segment === service.segment,
      });
    });
  });

  assignments.sort((left, right) => {
    if (left.sameSegment !== right.sameSegment) {
      return left.sameSegment ? -1 : 1;
    }
    return left.distance - right.distance;
  });

  const assignedQuantities = new Set<number>();
  const assignedServices = new Set<number>();
  const chosen = new Map<number, number>();
  for (const assignment of assignments) {
    if (
      assignedQuantities.has(assignment.quantityIndex) ||
      assignedServices.has(assignment.serviceIndex)
    ) {
      continue;
    }
    assignedQuantities.add(assignment.quantityIndex);
    assignedServices.add(assignment.serviceIndex);
    chosen.set(assignment.quantityIndex, assignment.serviceIndex);
  }

  for (
    let quantityIndex = 0;
    quantityIndex < quantities.length;
    quantityIndex += 1
  ) {
    if (chosen.has(quantityIndex)) continue;
    const fallback = assignments.find(
      (assignment) => assignment.quantityIndex === quantityIndex,
    );
    if (fallback) chosen.set(quantityIndex, fallback.serviceIndex);
  }

  return [...chosen.entries()]
    .map(([quantityIndex, serviceIndex]) => {
      const quantity = quantities[quantityIndex];
      const service = mentions[serviceIndex];
      if (!quantity || !service) return null;
      const definition = getCanonicalServiceDefinition(service.key);
      const unitKind =
        quantity.unitKind === 'other'
          ? definition?.units[0] || 'unit'
          : quantity.unitKind;
      return {
        canonicalKey: service.key,
        quantity: quantity.quantity,
        unit: defaultUnit(unitKind),
        unitKind,
        sourceIndex: Math.min(quantity.start, service.start),
        sourceText: normalized.slice(
          Math.min(quantity.start, service.start),
          Math.max(quantity.end, service.end),
        ),
        confidence: service.confidence,
      } satisfies ParsedRequestedService;
    })
    .filter((item): item is ParsedRequestedService => Boolean(item))
    .sort((left, right) => left.sourceIndex - right.sourceIndex)
    .slice(0, Math.min(maxItems, 30));
};

export { normalizeRequestText };
