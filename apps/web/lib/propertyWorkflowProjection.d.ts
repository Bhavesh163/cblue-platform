/**
 * Server-owned property workflow location and file projection. See
 * ./propertyWorkflowProjection.js for the policy and implementation.
 */
export declare function propertyModalLocation(item: {
  latitude?: number | null;
  longitude?: number | null;
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  addressLine?: string | null;
  locationPresentation?: {
    mode?: 'gps' | 'administrative';
    coordinates?: { latitude?: number | null; longitude?: number | null } | null;
    modalDisplay?: string;
    summaryDisplay?: string;
  };
} | null | undefined): string;

export declare function propertySummaryLocation(item: {
  latitude?: number | null;
  longitude?: number | null;
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  addressLine?: string | null;
  locationPresentation?: {
    mode?: 'gps' | 'administrative';
    coordinates?: { latitude?: number | null; longitude?: number | null } | null;
    modalDisplay?: string;
    summaryDisplay?: string;
  };
} | null | undefined): string;

export declare function propertyFileUrls(item: {
  uploadedFiles?: Array<{ url?: string } | string>;
  attachments?: Array<{ url?: string } | string>;
  listing?: { attachments?: Array<{ url?: string } | string> };
  propertyImages?: Array<string | { url?: string }>;
} | null | undefined): string[];
