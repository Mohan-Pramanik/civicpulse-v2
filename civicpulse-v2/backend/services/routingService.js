const ROUTING_MAP = {
  road:          { department: 'Public Works Department (PWD)',     eta: '3–5 working days', code: 'PWD'  },
  water:         { department: 'KMC Water Supply Department',       eta: '2–4 working days', code: 'KMC_WATER' },
  waste:         { department: 'Sanitation & Solid Waste Dept',     eta: '1–2 working days', code: 'SANITATION' },
  electricity:   { department: 'CESC / KMC Lighting Division',      eta: '2–3 working days', code: 'CESC' },
  encroachment:  { department: 'KMC Enforcement Team',              eta: '5–7 working days', code: 'ENFORCEMENT' },
  other:         { department: 'KMC General Grievance Cell',        eta: '7 working days',   code: 'GENERAL' }
};

// Auto-compute priority from upvote count and age
const computePriority = (upvotes, createdAt, currentPriority) => {
  const ageHours = (Date.now() - new Date(createdAt)) / 3600000;
  if (upvotes >= 50 || ageHours > 72) return 'critical';
  if (upvotes >= 20 || ageHours > 48) return 'high';
  return currentPriority;
};

module.exports = { ROUTING_MAP, computePriority };
