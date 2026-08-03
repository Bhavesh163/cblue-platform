import { QualificationEvaluationService } from './qualification-evaluation.service';

describe('QualificationEvaluationService credential provenance', () => {
  it('does not treat document categories as corporate endorsement without verification provenance', () => {
    const service = new QualificationEvaluationService(
      {} as never,
      {} as never,
      {} as never,
    );

    const evidence = (
      service as never as {
        buildEvidenceInput: (value: unknown) => Record<string, unknown>;
      }
    ).buildEvidenceInput({
      fixer: { yearsExperience: 10 },
      documents: [
        {
          id: 'certificate-1',
          documentType: 'project-completion-certificate',
          evidenceStatus: 'VALIDATED',
          extractedFields: { projectValue: 1000000 },
        },
        {
          id: 'certificate-2',
          documentType: 'project-completion-certificate',
          evidenceStatus: 'VALIDATED',
          extractedFields: { projectValue: 1000000 },
        },
      ],
    });

    expect(evidence.corporateEvidenceVerified).toBe(false);
    expect(evidence.corporateEndorsedCompletionCertificateCount).toBe(0);
    expect(evidence.millionBahtCompletionCertificateCount).toBe(0);
  });

  it('counts only verified corporate completion evidence toward the corporate ceiling', () => {
    const service = new QualificationEvaluationService(
      {} as never,
      {} as never,
      {} as never,
    );

    const evidence = (
      service as never as {
        buildEvidenceInput: (value: unknown) => Record<string, unknown>;
      }
    ).buildEvidenceInput({
      fixer: { yearsExperience: 10 },
      documents: [
        {
          id: 'certificate-1',
          documentType: 'project-completion-certificate',
          evidenceStatus: 'VALIDATED',
          extractedFields: { projectValue: 1000000 },
          credentialVerifications: [
            {
              status: 'VERIFIED',
              issuerType: 'SET_LISTED_COMPANY',
              issuerName: 'Example Public Company',
              projectValueBaht: 1000000,
              corporateEndorsement: true,
              verifiedAt: new Date('2026-08-02T00:00:00.000Z'),
            },
          ],
        },
        {
          id: 'certificate-2',
          documentType: 'project-completion-certificate',
          evidenceStatus: 'VALIDATED',
          extractedFields: { projectValue: 1000000 },
          credentialVerifications: [
            {
              status: 'VERIFIED',
              issuerType: 'GOVERNMENT',
              issuerName: 'Example Agency',
              projectValueBaht: 1000000,
              corporateEndorsement: true,
              verifiedAt: new Date('2026-08-02T00:00:00.000Z'),
            },
          ],
        },
      ],
    });

    expect(evidence.corporateEvidenceVerified).toBe(true);
    expect(evidence.corporateEndorsedCompletionCertificateCount).toBe(2);
    expect(evidence.millionBahtCompletionCertificateCount).toBe(2);
  });
});
