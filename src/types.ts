// PDPA Access Request Management System Type Definitions

export interface Organization {
  id: string;
  nameTh: string;
  nameEn: string;
  logoUrl?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export type Role = 'admin' | 'intake' | 'owner' | 'dpo' | 'approver' | 'auditor';

export interface User {
  id: string;
  orgId: string; // Tenant Identifier
  username: string;
  fullNameTh: string;
  fullNameEn: string;
  email: string;
  role: Role; // Primary role for legacy compatibility
  roles: Role[]; // Multi-role support
  department?: string;
  mfaEnabled: boolean;
  sodWarnings?: string[]; // SOD compliance flags
}

export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Received'
  | 'Identity Verification'
  | 'Awaiting Identity Evidence'
  | 'Completeness Review'
  | 'Awaiting Additional Information'
  | 'Complete'
  | 'Assigned'
  | 'Data Collection'
  | 'Data Owner Review'
  | 'DPO or Legal Review'
  | 'Redaction Required'
  | 'Approval Pending'
  | 'Fee Notification'
  | 'Awaiting Payment'
  | 'Approved'
  | 'Partially Approved'
  | 'Denied'
  | 'No Data Found'
  | 'Ready for Delivery'
  | 'Delivered'
  | 'Receipt Confirmed'
  | 'Withdrawn'
  | 'Disposed for Incomplete Information'
  | 'Closed'
  | 'Legal Hold'
  | 'Archived'
  | 'Destroyed';

export type RequesterType = 'self' | 'representative';
export type DeliveryMethod = 'pickup' | 'registered_mail' | 'secure_download' | 'sftp';
export type AssuranceLevel = 'low' | 'medium' | 'high';

export interface Requester {
  firstName: string;
  lastName: string;
  idNumber: string; // Encrypted or masked
  email: string;
  phone: string;
  address?: string;
}

export interface Representative {
  firstName: string;
  lastName: string;
  idNumber: string; // Encrypted or masked
  email: string;
  phone: string;
  address?: string;
  scopeOfAuthority: string;
  validFrom: string;
  validTo: string;
}

export interface IdentityVerification {
  status: 'pending' | 'verified' | 'rejected';
  assuranceLevel: AssuranceLevel;
  method: 'otp_email' | 'otp_phone' | 'document_check' | 'video_verification' | 'in_person';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string; // e.g., image/png, application/pdf
  isMasked: boolean;
  watermarkApplied: boolean;
  uploadedAt: string;
  fileUrl: string; // Base64 or object URL mock
  retentionExpiryDate?: string;
}

export interface DataCollectionTask {
  id: string;
  systemName: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'found' | 'not_found' | 'not_applicable';
  completedAt?: string;
  completedBy?: string;
  resultsDescription?: string;
  uploadedFiles: Attachment[];
  queryUsed?: string;
  dataLineage?: string; // Source system details
}

export interface RedactionRecord {
  id: string;
  itemId: string;
  itemRedacted: string; // e.g., "Full Name of other person", "Signature"
  reason: string;
  operator: string;
  timestamp: string;
  previewUrlBefore: string;
  previewUrlAfter: string;
}

export interface Decision {
  result: 'approved' | 'partially_approved' | 'denied' | 'no_data' | 'withdrawn' | 'disposed';
  reasons: string[]; // Legal reasons or policies
  legalBasisText?: string;
  dpoRecommendation?: string;
  dpoCheckedAt?: string;
  dpoName?: string;
  approverOpinion?: string;
  approvedAt?: string;
  approverName?: string;
}

export interface FeeCalculation {
  noFee: boolean;
  paperPages: number;
  computerPages: number;
  certificationsCount: number;
  otherCosts: { item: string; cost: number }[];
  totalCalculated: number;
  reasonForFee?: string;
  isApproved: boolean;
  paymentStatus: 'pending' | 'paid' | 'waived';
  paymentReceiptNo?: string;
  paidAt?: string;
}

export interface SLAConfig {
  completenessCheckDays: number;
  deficiencyResponseDays: number;
  processingDays: number;
  extensionDays: number;
  retentionYears: number;
}

export interface ComplianceConfig {
  id: string;
  version: number;
  effectiveDate: string;
  publishedDate: string;
  sla: SLAConfig;
  feeRates: {
    paperCopyRate: number; // Max 1 THB
    computerPrintRate: number; // Max 3 THB
    certificationRate: number; // Max 5 THB
  };
  disclaimerText: string;
  rejectionReasons: { code: string; labelTh: string; labelEn: string }[];
  updatedBy: string;
  updatedAt: string;
  changeReason: string;
}

export interface SLAEvent {
  id: string;
  type: 'pause' | 'resume' | 'extend' | 'breach';
  timestamp: string;
  reason: string;
  operator: string;
}

export interface StatusHistory {
  status: RequestStatus;
  changedAt: string;
  changedBy: string;
  comment?: string;
}

export interface MessageThread {
  id: string;
  sender: 'user' | 'staff';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface Request {
  id: string;
  orgId: string; // Tenant Identifier
  uuid: string;
  trackingNo: string;
  requesterType: RequesterType;
  requester: Requester;
  representative?: Representative;
  contactChannel: 'web' | 'office' | 'post' | 'email' | 'e-service';
  refNo?: string; // Reference number from original channel if post/email/e-service
  status: RequestStatus;
  submissionDate: string;
  receivedDate?: string;
  completenessCheckedDate?: string;
  slaStartDate?: string;
  slaDeadlineDate?: string;
  slaExtended: boolean;
  slaExtensionReason?: string;
  slaExtendedBy?: string;
  slaRemainingDays: number;
  slaDaysUsed: number;
  slaPaused: boolean;
  slaPausedAt?: string;
  slaEvents: SLAEvent[];
  statusHistory: StatusHistory[];
  identityVerification: IdentityVerification;
  requestDetails: {
    requestType: 'access' | 'copy' | 'access_and_copy';
    description: string;
    targetSystems: string[];
    timeframeStart?: string;
    timeframeEnd?: string;
    deliveryMethod: DeliveryMethod;
  };
  attachments: Attachment[];
  dataCollectionTasks: DataCollectionTask[];
  redactionRecords: RedactionRecord[];
  decision?: Decision;
  feeCalculation: FeeCalculation;
  messageThread: MessageThread[];
  legalHold: boolean;
  retentionExpiryDate?: string;
  destroyedDate?: string;
  destroyedBy?: string;
  destroyedWitness?: string;
}

export interface AuditLog {
  id: string;
  orgId: string; // Tenant Identifier
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string; // e.g. "VIEW_FILE", "UPDATE_STATUS", "EXPORT_REPORT"
  requestId?: string;
  requestTrackingNo?: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  checksum: string; // Mock digital integrity checksum
}

export interface DocumentTemplate {
  id: string;
  nameTh: string;
  nameEn: string;
  subjectTemplate: string;
  bodyTemplate: string;
  version: string;
  confidentialityLevel: 'SECRET' | 'CONFIDENTIAL' | 'NORMAL';
}
