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

export function propertyWorkflowActionMetadata(
  action: string,
  propertyTitle: string,
  reference: string,
) {
  const title = String(propertyTitle || '').trim() || 'Property';
  const orderReference = String(reference || '').trim();
  const prefix = `${title} \u00b7 Order: ${orderReference}:`;
  const normalizedAction = String(action || '').trim().toLowerCase();
  const notificationsByAction: Record<
    string,
    { customer: string; lister: string }
  > = {
    accept: {
      customer:
        `${prefix} The selected lister accepted your inquiry. Please complete the processing fee or use Free Pass.`,
      lister:
        `${prefix} You accepted the property inquiry. Please wait for the customer to complete the processing fee or use Free Pass.`,
    },
    'partner-accept': {
      customer:
        `${prefix} The selected lister accepted your inquiry. Please complete the processing fee or use Free Pass.`,
      lister:
        `${prefix} You accepted the property inquiry. Please wait for the customer to complete the processing fee or use Free Pass.`,
    },
    fee: {
      customer:
        `${prefix} Free Pass or fee processing is complete. Chat is active; send the meeting invitation when ready.`,
      lister:
        `${prefix} The customer completed Free Pass or fee processing. Chat is active; please wait for the meeting invitation.`,
    },
    'fee-proceed': {
      customer:
        `${prefix} Fee processing is complete. Chat is active; send the meeting invitation when ready.`,
      lister:
        `${prefix} The customer completed fee processing. Chat is active; please wait for the meeting invitation.`,
    },
    'free-pass': {
      customer:
        `${prefix} Free Pass is complete. Chat is active; send the meeting invitation when ready.`,
      lister:
        `${prefix} The customer completed Free Pass. Chat is active; please wait for the meeting invitation.`,
    },
    'viewing-invite': {
      customer:
        `${prefix} Meeting invitation sent. Please wait for the selected lister to confirm.`,
      lister:
        `${prefix} The customer sent a meeting invitation. Please review and confirm the meeting.`,
    },
    'viewing-confirmation': {
      customer:
        `${prefix} The selected lister confirmed the meeting. You may now rate the lister.`,
      lister:
        `${prefix} Meeting confirmed. You may now rate the customer.`,
    },
    'viewing-confirm': {
      customer:
        `${prefix} The selected lister confirmed the meeting. You may now rate the lister.`,
      lister:
        `${prefix} Meeting confirmed. You may now rate the customer.`,
    },
    'customer-rating': {
      customer: `${prefix} Your lister rating was submitted.`,
      lister: `${prefix} The customer submitted their rating.`,
    },
    'rate-partner': {
      customer: `${prefix} Your lister rating was submitted.`,
      lister: `${prefix} The customer submitted their rating.`,
    },
    'lister-rating': {
      customer: `${prefix} The lister submitted their customer rating.`,
      lister: `${prefix} Your customer rating was submitted.`,
    },
    'rate-customer': {
      customer: `${prefix} The lister submitted their customer rating.`,
      lister: `${prefix} Your customer rating was submitted.`,
    },
  };
  const notifications = notificationsByAction[normalizedAction];
  if (!notifications) {
    return { sourceVersion: PROPERTY_WORKFLOW_SOURCE_VERSION };
  }
  return {
    sourceVersion: PROPERTY_WORKFLOW_SOURCE_VERSION,
    audience: ['customer', 'lister'],
    notifications,
  };
}
