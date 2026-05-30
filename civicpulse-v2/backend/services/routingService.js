/**
 * routingService.js
 * Auto-routes issues to the correct KMC department by category.
 * Also exports ROUTING_MAP used by the Issue model pre-save hook.
 *
 * Place in: backend/services/routingService.js
 */

const ROUTING_MAP = {
  road: {
    department: 'Public Works Department (PWD)',
    eta:        '3–5 working days',
    code:       'PWD',
    deadlineDays: 5,   // default deadline days if none specified
  },
  water: {
    department: 'KMC Water Supply Department',
    eta:        '2–4 working days',
    code:       'KMC_WATER',
    deadlineDays: 4,
  },
  waste: {
    department: 'Sanitation & Solid Waste Dept',
    eta:        '1–2 working days',
    code:       'SANITATION',
    deadlineDays: 2,
  },
  electricity: {
    department: 'CESC / KMC Lighting Division',
    eta:        '2–3 working days',
    code:       'CESC',
    deadlineDays: 3,
  },
  encroachment: {
    department: 'KMC Enforcement Team',
    eta:        '5–7 working days',
    code:       'ENFORCEMENT',
    deadlineDays: 7,
  },
  other: {
    department: 'KMC General Grievance Cell',
    eta:        '7 working days',
    code:       'GENERAL',
    deadlineDays: 7,
  },
};

/**
 * Auto-compute priority escalation based on upvote count and issue age.
 * Called by a periodic job to upgrade priority if issue is going viral or old.
 */
const computePriority = (upvotes, createdAt, currentPriority) => {
  const ageHours = (Date.now() - new Date(createdAt)) / 3600000;
  if (upvotes >= 50 || ageHours > 72) return 'critical';
  if (upvotes >= 20 || ageHours > 48) return 'high';
  return currentPriority;
};

/**
 * Get the default deadline date for a category.
 * Used when assigning without a manual deadline.
 */
const getDefaultDeadline = (category) => {
  const days = ROUTING_MAP[category]?.deadlineDays || 7;
  return new Date(Date.now() + days * 24 * 3600 * 1000);
};

module.exports = { ROUTING_MAP, computePriority, getDefaultDeadline };