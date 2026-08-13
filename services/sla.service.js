// services/sla.service.js
// ERPNext-inspired SLA (Service Level Agreement) Calculation Service
// Handles PDPA 30-day statutory SLA deadlines, pausing during 'Awaiting Additional Info',
// and SLA breach reporting.

/**
 * PDPA Statutory SLA limit in days (Default 30 calendar days according to Section 30 of PDPA B.E. 2562)
 */
export const DEFAULT_SLA_DAYS = 30;

/**
 * States where SLA calculation is active (ticking down)
 */
export const SLA_ACTIVE_STATES = [
  'Complete',
  'Assigned',
  'Data Collection',
  'Data Owner Review',
  'DPO or Legal Review',
  'Redaction Required',
  'Approval Pending',
  'Fee Notification',
  'Ready for Delivery'
];

/**
 * States where SLA calculation is paused (clock stopped)
 */
export const SLA_PAUSED_STATES = [
  'Awaiting Additional Information',
  'Awaiting Identity Evidence',
  'Awaiting Payment'
];

/**
 * States where SLA is completed or terminated (clock stops permanently)
 */
export const SLA_CLOSED_STATES = [
  'Approved',
  'Delivered',
  'Receipt Confirmed',
  'Denied',
  'No Data Found',
  'Withdrawn',
  'Disposed for Incomplete Information',
  'Closed'
];

/**
 * Calculate the target SLA deadline date from a given start date
 * @param {string|Date} startDate - Date when SLA started ticking
 * @param {number} totalDays - Total days allowed (default 30)
 * @returns {string} - ISO string representing deadline date
 */
export function calculateSLADate(startDate = new Date(), totalDays = DEFAULT_SLA_DAYS) {
  const start = new Date(startDate);
  const deadline = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
  return deadline.toISOString();
}

/**
 * Calculate remaining SLA days and days used
 * @param {string|Date} startDate - When SLA started
 * @param {string|Date} deadlineDate - SLA deadline date
 * @param {boolean} isPaused - Whether SLA clock is currently paused
 * @param {number} storedRemainingDays - Previous remaining days if paused
 * @returns {{ slaRemainingDays: number, slaDaysUsed: number, isBreached: boolean }}
 */
export function calculateRemainingDays(startDate, deadlineDate, isPaused = false, storedRemainingDays = null) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : now;
  
  if (isPaused && storedRemainingDays !== null) {
    const daysUsed = Math.max(0, DEFAULT_SLA_DAYS - storedRemainingDays);
    return {
      slaRemainingDays: storedRemainingDays,
      slaDaysUsed: daysUsed,
      isBreached: storedRemainingDays < 0
    };
  }

  if (!deadlineDate) {
    return {
      slaRemainingDays: DEFAULT_SLA_DAYS,
      slaDaysUsed: 0,
      isBreached: false
    };
  }

  const deadline = new Date(deadlineDate);
  const diffTime = deadline.getTime() - now.getTime();
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysUsed = Math.max(0, DEFAULT_SLA_DAYS - remainingDays);

  return {
    slaRemainingDays: remainingDays,
    slaDaysUsed: daysUsed,
    isBreached: remainingDays < 0
  };
}

/**
 * Update request SLA metadata based on its current and previous status
 * @param {Object} request - Request object
 * @param {string} newStatus - The target status
 * @returns {Object} - Updated request object with new SLA fields
 */
export function updateRequestSLA(request, newStatus) {
  const updated = { ...request, status: newStatus };
  const oldStatus = request.status;
  
  // 1. If transitioning to 'Complete' for the first time, initialize SLA clock
  if (newStatus === 'Complete' && !updated.slaStartDate) {
    updated.slaStartDate = new Date().toISOString();
    updated.slaDeadlineDate = calculateSLADate(updated.slaStartDate, DEFAULT_SLA_DAYS);
    updated.slaRemainingDays = DEFAULT_SLA_DAYS;
    updated.slaDaysUsed = 0;
    updated.slaPaused = false;
    
    updated.slaEvents = updated.slaEvents || [];
    updated.slaEvents.push({
      event: 'SLA_STARTED',
      timestamp: new Date().toISOString(),
      details: 'เริ่มนับกรอบระยะเวลาการดำเนินการตามกฎหมาย 30 วัน'
    });
  }
  
  // 2. If entering a paused state, set slaPaused = true
  if (SLA_PAUSED_STATES.includes(newStatus)) {
    updated.slaPaused = true;
    updated.slaEvents = updated.slaEvents || [];
    updated.slaEvents.push({
      event: 'SLA_PAUSED',
      timestamp: new Date().toISOString(),
      details: `หยุดพักเวลานับ SLA ชั่วคราว (${newStatus})`
    });
  }
  
  // 3. If resuming from a paused state into an active state
  if (SLA_PAUSED_STATES.includes(oldStatus) && SLA_ACTIVE_STATES.includes(newStatus)) {
    updated.slaPaused = false;
    updated.slaEvents = updated.slaEvents || [];
    updated.slaEvents.push({
      event: 'SLA_RESUMED',
      timestamp: new Date().toISOString(),
      details: `กลับมานับเวลา SLA ต่อ (${newStatus})`
    });
  }

  // 4. Calculate updated remaining days if SLA has started
  if (updated.slaStartDate && !SLA_CLOSED_STATES.includes(newStatus)) {
    const calc = calculateRemainingDays(
      updated.slaStartDate,
      updated.slaDeadlineDate,
      updated.slaPaused,
      updated.slaRemainingDays
    );
    updated.slaRemainingDays = calc.slaRemainingDays;
    updated.slaDaysUsed = calc.slaDaysUsed;
    updated.isBreached = calc.isBreached;
  }

  return updated;
}

/**
 * Generate aggregate SLA analytics report for DPO dashboard
 * @param {Array<Object>} requests - Array of request objects
 * @returns {Object} - Aggregate SLA metrics
 */
export function calculateOrgSLAReport(requests = []) {
  let totalActive = 0;
  let totalBreached = 0;
  let totalDaysUsedSum = 0;
  let completedCount = 0;
  
  const statusBreakdown = {};
  
  requests.forEach(req => {
    const status = req.status || 'Draft';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    
    if (SLA_ACTIVE_STATES.includes(status)) {
      totalActive++;
      if (req.slaRemainingDays < 0 || req.isBreached) {
        totalBreached++;
      }
    }
    
    if (SLA_CLOSED_STATES.includes(status) && typeof req.slaDaysUsed === 'number') {
      totalDaysUsedSum += req.slaDaysUsed;
      completedCount++;
    }
  });

  const averageResolutionDays = completedCount > 0
    ? parseFloat((totalDaysUsedSum / completedCount).toFixed(1))
    : 0;

  const breachRatePercent = totalActive > 0
    ? parseFloat(((totalBreached / totalActive) * 100).toFixed(1))
    : 0;

  return {
    totalRequests: requests.length,
    totalActive,
    totalBreached,
    breachRatePercent,
    averageResolutionDays,
    statusBreakdown
  };
}
