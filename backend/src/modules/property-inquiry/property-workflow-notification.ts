export const PROPERTY_WORKFLOW_SOURCE_VERSION = 'cblue-property-workflow-v1';

export function propertyInquiryNotifiedMetadata(
  propertyTitle: string,
  reference: string,
) {
  const title = String(propertyTitle || '').trim() || 'Property';
  const orderReference = String(reference || '').trim();

  return {
    sourceVersion: PROPERTY_WORKFLOW_SOURCE_VERSION,
    audience: ['customer', 'lister'],
    notifications: {
      customer: `${title} \u00b7 Order: ${orderReference}: Please wait for the selected lister to accept the inquiry.`,
      lister: `${title} \u00b7 Order: ${orderReference}: A customer selected your listing. Please accept or decline the inquiry.`,
    },
  };
}
