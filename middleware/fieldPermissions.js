// middleware/fieldPermissions.js
// ERPNext-inspired Field-Level Permission System
// Masks or removes sensitive fields from API responses based on user role
// Decision: Applied server-side — frontend never receives data it shouldn't see

/**
 * Field permission rules by role.
 * Keys under 'deny': dot-notation paths to mask with '****'
 * 'readOnly': true means the role cannot write (enforced separately in routes)
 * 'allowAll': true means no restrictions
 */
const FIELD_PERMISSION_RULES = {
  superadmin: {
    allowAll: true
  },
  admin: {
    allowAll: true
  },
  dpo: {
    allowAll: true
  },
  approver: {
    deny: [], // Can see all, but cannot edit most fields (enforced at route level)
    readOnly: false
  },
  intake: {
    deny: [
      'requester.idNumber',
      'representative.idNumber',
      'requester.phone',         // Mask phone for intake (only first 3 digits)
    ],
    maskPhone: ['requester.phone', 'representative.phone'],
    readOnly: false
  },
  owner: {
    deny: [
      'requester.idNumber',
      'representative.idNumber',
    ],
    readOnly: false
  },
  auditor: {
    deny: [
      'requester.idNumber',
      'representative.idNumber',
    ],
    readOnly: true // Auditors can never write — enforced at route level too
  }
};

/**
 * Get nested value by dot-notation path
 * @param {object} obj
 * @param {string} path  e.g. 'requester.idNumber'
 * @returns {*}
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Set nested value by dot-notation path
 * @param {object} obj
 * @param {string} path
 * @param {*} value
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (acc && acc[key] === undefined) acc[key] = {};
    return acc?.[key];
  }, obj);
  if (target && lastKey) {
    target[lastKey] = value;
  }
}

/**
 * Apply field-level permissions to a single request object.
 * Mutates a deep clone — does NOT modify the original.
 *
 * @param {object} requestData  The full request object from DB
 * @param {string} role         The acting user's role
 * @returns {object}            Sanitized copy safe to send to client
 */
export function applyFieldPermissions(requestData, role) {
  if (!requestData || typeof requestData !== 'object') return requestData;

  const rules = FIELD_PERMISSION_RULES[role];

  // Unknown role or explicit allowAll: return as-is
  if (!rules || rules.allowAll) return requestData;

  // Deep clone to avoid mutating original DB data
  const sanitized = JSON.parse(JSON.stringify(requestData));

  // Apply deny rules — mask with ****
  if (Array.isArray(rules.deny)) {
    for (const fieldPath of rules.deny) {
      const currentValue = getNestedValue(sanitized, fieldPath);
      if (currentValue !== undefined && currentValue !== null) {
        setNestedValue(sanitized, fieldPath, '****');
      }
    }
  }

  // Apply phone masking — show only first 3 digits e.g. "081****"
  if (Array.isArray(rules.maskPhone)) {
    for (const fieldPath of rules.maskPhone) {
      const phoneValue = getNestedValue(sanitized, fieldPath);
      if (phoneValue && typeof phoneValue === 'string' && phoneValue !== '****') {
        const masked = phoneValue.substring(0, 3) + '****';
        setNestedValue(sanitized, fieldPath, masked);
      }
    }
  }

  return sanitized;
}

/**
 * Apply permissions to an array of requests
 * @param {object[]} requests
 * @param {string} role
 * @returns {object[]}
 */
export function applyFieldPermissionsToList(requests, role) {
  if (!Array.isArray(requests)) return requests;
  return requests.map(r => applyFieldPermissions(r, role));
}

/**
 * Express middleware factory — wraps a route's response.
 * Attaches applyFieldPermissions helper to res.locals for use in handlers.
 * Usage: router.use(fieldPermissionMiddleware)
 */
export function fieldPermissionMiddleware(req, res, next) {
  const role = req.user?.role || 'auditor'; // Default to most restrictive
  res.locals.sanitize = (data) => {
    if (Array.isArray(data)) return applyFieldPermissionsToList(data, role);
    return applyFieldPermissions(data, role);
  };
  res.locals.userRole = role;
  next();
}

/**
 * Check if a role has write access (used in route-level guards)
 * @param {string} role
 * @returns {boolean}
 */
export function isReadOnly(role) {
  const rules = FIELD_PERMISSION_RULES[role];
  return rules?.readOnly === true;
}
