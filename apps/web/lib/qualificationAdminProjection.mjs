export function visibleQualificationDocuments(documents) {
  return documents.filter(
    (document) =>
      document.documentType !== "id-back" &&
      document.isActive !== false &&
      document.lifecycleState !== "DELETE_PENDING",
  );
}
