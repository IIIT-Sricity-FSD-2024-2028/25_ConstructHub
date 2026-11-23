import { CompanyRecord } from './companies.repository';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Legacy records without an approval field count as approved. */
export function getApprovalStatus(company?: Pick<CompanyRecord, 'approvalStatus'> | null): ApprovalStatus {
  return (company?.approvalStatus as ApprovalStatus) || 'approved';
}

/**
 * Returns a human-readable reason if users of this company must not use the platform right now,
 * or null if access is allowed.
 */
export function companyAccessBlockReason(company?: CompanyRecord | null): string | null {
  if (!company) return 'Company workspace not found. Access denied.';
  const approval = getApprovalStatus(company);
  if (approval === 'pending') {
    return 'Your company registration is awaiting approval by the platform administrator. You will be able to sign in once it is approved.';
  }
  if (approval === 'rejected') {
    const why = company.approvalReason ? ` Reason: ${company.approvalReason}` : '';
    return `Your company registration was not approved.${why} Please contact the platform administrator.`;
  }
  if (company.status === 'inactive') {
    return 'Company workspace is inactive. Access denied.';
  }
  return null;
}
