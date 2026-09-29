export interface ComplaintFilterItem {
  priority?: string | null;
  classification?: string | null;
  classificationReason?: string | null;
  duplicateOfId?: string | number | null;
  status?: string | null;
  description?: string | null;
}

/**
 * Checks if a complaint is flagged as DUPLICATE / COPIED by AI or has duplicateOfId.
 */
export const isDuplicateClassification = (item: ComplaintFilterItem): boolean => {
  const cl = String(item.classification || '').toUpperCase().trim();
  const hasDupId =
    item.duplicateOfId !== null &&
    item.duplicateOfId !== undefined &&
    String(item.duplicateOfId).trim() !== '' &&
    String(item.duplicateOfId).trim() !== '0' &&
    String(item.duplicateOfId).trim() !== 'null' &&
    String(item.duplicateOfId).trim() !== 'undefined';
  return cl === 'DUPLICATE' || cl === 'COPIED' || hasDupId;
};

/**
 * Checks if a complaint is flagged as FAKE / INVALID / SPAM / MISMATCH by AI or is REJECTED.
 */
export const isFakeClassification = (item: ComplaintFilterItem): boolean => {
  const cl = String(item.classification || '').toUpperCase().trim();
  const st = String(item.status || '').toUpperCase().trim();
  const desc = String(item.description || '').toLowerCase();
  return (
    cl === 'FAKE' ||
    cl === 'INVALID' ||
    cl === 'SPAM' ||
    cl === 'MISMATCH_SUSPICIOUS' ||
    cl === 'MISMATCH' ||
    st === 'REJECTED' ||
    desc.includes('test complaint') ||
    desc.includes('fake') ||
    desc.includes('spam')
  );
};

/**
 * Items that are Fake, Invalid, or Duplicate should not pollute active priority queues.
 */
export const isExcludedFromPriority = (item: ComplaintFilterItem): boolean => {
  return isFakeClassification(item) || isDuplicateClassification(item);
};

/**
 * Checks if a complaint is VERY HIGH / CRITICAL / URGENT priority.
 */
export const isVeryHighPriority = (item: ComplaintFilterItem): boolean => {
  if (isExcludedFromPriority(item)) return false;
  const p = String(item.priority || '').toUpperCase().trim();
  const desc = String(item.description || '').toLowerCase();
  return (
    p === 'VERY_HIGH' ||
    p === 'VERY HIGH' ||
    p === 'CRITICAL' ||
    p === 'URGENT' ||
    desc.includes('आपातकालीन') ||
    desc.includes('खतरा') ||
    desc.includes('urgent') ||
    desc.includes('critical')
  );
};

/**
 * Checks if a complaint is HIGH priority.
 */
export const isHighPriority = (item: ComplaintFilterItem): boolean => {
  if (isExcludedFromPriority(item)) return false;
  if (isVeryHighPriority(item)) return false;
  const p = String(item.priority || '').toUpperCase().trim();
  const desc = String(item.description || '').toLowerCase();
  return (
    p === 'HIGH' ||
    p === 'HIGH PRIORITY' ||
    desc.includes('गंभीर') ||
    desc.includes('भारी') ||
    desc.includes('severe')
  );
};

/**
 * Checks if a complaint is LOW / ROUTINE / MINOR priority.
 */
export const isLowPriority = (item: ComplaintFilterItem): boolean => {
  if (isExcludedFromPriority(item)) return false;
  if (isVeryHighPriority(item) || isHighPriority(item)) return false;
  const p = String(item.priority || '').toUpperCase().trim();
  const desc = String(item.description || '').toLowerCase();
  return (
    p === 'LOW' ||
    p === 'LOW PRIORITY' ||
    p === 'ROUTINE' ||
    p === 'MINOR' ||
    desc.includes('सामान्य') ||
    desc.includes('मामूली') ||
    desc.includes('low')
  );
};

/**
 * Checks if a complaint is MEDIUM priority.
 */
export const isMediumPriority = (item: ComplaintFilterItem): boolean => {
  if (isExcludedFromPriority(item)) return false;
  return !isVeryHighPriority(item) && !isHighPriority(item) && !isLowPriority(item);
};

/**
 * Checks if a complaint NEEDS VERIFICATION (blur, fog, low light, glare, smudge, obstructed lens).
 */
export const isNeedsVerificationClassification = (item: ComplaintFilterItem): boolean => {
  if (isFakeClassification(item) || isDuplicateClassification(item)) return false;
  const cl = String(item.classification || '').toUpperCase().trim();
  const st = String(item.status || '').toUpperCase().trim();
  return (
    cl === 'NEEDS_VERIFICATION' ||
    cl === 'VERIFICATION' ||
    st === 'VERIFICATION' ||
    st === 'UNDER_REVIEW' ||
    st === 'UNDER REVIEW'
  );
};

/**
 * Checks if a complaint is GENUINE (not fake, not duplicate, not needing verification).
 */
export const isGenuineClassification = (item: ComplaintFilterItem): boolean => {
  return (
    !isFakeClassification(item) &&
    !isDuplicateClassification(item) &&
    !isNeedsVerificationClassification(item)
  );
};
