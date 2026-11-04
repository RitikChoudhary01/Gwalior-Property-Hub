// ============================================================
// Gwalior Property Hub domain constants — single source of truth for roles,
// statuses, cities, amenities and option lists used across
// forms, filters and dashboards.
// ============================================================

export const ROLES = {
  BUYER: "BUYER",
  SELLER: "SELLER",
  BUILDER: "BUILDER",
  TEAM: "TEAM",
  ADMIN: "ADMIN",
} as const;

export type Role = keyof typeof ROLES;

export const ROLE_LABELS: Record<string, string> = {
  BUYER: "Buyer",
  SELLER: "Property Owner",
  BUILDER: "Builder / Developer",
  TEAM: "Team Member",
  ADMIN: "Administrator",
};

export const PROPERTY_TYPES = [
  "Apartment",
  "Flat",
  "Independent House",
  "Villa",
  "Plot",
] as const;

export const FURNISHINGS = ["Unfurnished", "Semi-Furnished", "Fully-Furnished"] as const;

export const CONSTRUCTION_STATUSES = [
  { value: "READY_TO_MOVE", label: "Ready to Move" },
  { value: "UNDER_CONSTRUCTION", label: "Under Construction" },
  { value: "NEW", label: "New Launch" },
] as const;

export const PROPERTY_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending Approval" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SOLD", label: "Sold" },
] as const;

export const AVAILABILITY_STATUSES = ["AVAILABLE", "RESERVED", "SOLD"] as const;

// Legal / document verification of a listing — deliberately separate from
// listing quality checks (status) and identity checks (User.isVerified).
export const VERIFICATION_STATUSES = [
  { value: "NONE", label: "Not verified" },
  { value: "REQUESTED", label: "Verification requested" },
  { value: "VERIFIED", label: "GPH Verified" },
  { value: "REJECTED", label: "Verification rejected" },
] as const;

export const REQUIREMENT_STATUSES = [
  { value: "NEW", label: "New", tone: "bg-sky-100 text-sky-800" },
  { value: "MATCHED", label: "Matched", tone: "bg-teal-100 text-teal-800" },
  { value: "CONTACTED", label: "Contacted", tone: "bg-amber-100 text-amber-800" },
  { value: "QUALIFIED", label: "Qualified", tone: "bg-violet-100 text-violet-800" },
  { value: "CONVERTED", label: "Converted", tone: "bg-emerald-100 text-emerald-800" },
  { value: "LOST", label: "Lost", tone: "bg-rose-100 text-rose-800" },
] as const;

export const REQUIREMENT_PURPOSES = [
  { value: "BUY", label: "Buy" },
  { value: "RENT", label: "Rent" },
] as const;

export const LEAD_STATUSES = [
  { value: "NEW", label: "New", tone: "bg-sky-100 text-sky-800" },
  { value: "CONTACTED", label: "Contacted", tone: "bg-amber-100 text-amber-800" },
  { value: "QUALIFIED", label: "Qualified", tone: "bg-violet-100 text-violet-800" },
  { value: "SITE_VISIT_SCHEDULED", label: "Visit Scheduled", tone: "bg-teal-100 text-teal-800" },
  { value: "SITE_VISIT_COMPLETED", label: "Visit Completed", tone: "bg-cyan-100 text-cyan-800" },
  { value: "NEGOTIATION", label: "Negotiation", tone: "bg-orange-100 text-orange-800" },
  { value: "BOOKING", label: "Booking", tone: "bg-lime-100 text-lime-800" },
  { value: "CONVERTED", label: "Converted", tone: "bg-emerald-100 text-emerald-800" },
  { value: "LOST", label: "Lost", tone: "bg-rose-100 text-rose-800" },
] as const;

export const VISIT_STATUSES = [
  { value: "REQUESTED", label: "Requested", tone: "bg-amber-100 text-amber-800" },
  { value: "CONFIRMED", label: "Confirmed", tone: "bg-emerald-100 text-emerald-800" },
  { value: "RESCHEDULED", label: "Rescheduled", tone: "bg-sky-100 text-sky-800" },
  { value: "COMPLETED", label: "Completed", tone: "bg-stone-200 text-stone-700" },
  { value: "CANCELLED", label: "Cancelled", tone: "bg-rose-100 text-rose-800" },
] as const;

export const PROJECT_STATUSES = [
  { value: "UNDER_CONSTRUCTION", label: "Under Construction" },
  { value: "READY_TO_MOVE", label: "Ready to Move" },
  { value: "NEW_LAUNCH", label: "New Launch" },
] as const;

export const TRANSACTION_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Payment Pending",
  PARTIAL: "Partially Paid",
  PAID: "Fully Paid",
};

export const AMENITIES = [
  "Power Backup",
  "Lift",
  "Clubhouse",
  "Swimming Pool",
  "Gym",
  "Children's Play Area",
  "24x7 Security",
  "CCTV Surveillance",
  "Intercom",
  "Rainwater Harvesting",
  "Modular Kitchen",
  "Piped Gas",
  "Servant Room",
  "Balcony",
  "Corner Unit",
  "Gated Community",
  "Landscaped Gardens",
  "Jogging Track",
  "Sports Facility",
  "Car Parking",
] as const;

// Popular Indian residential cities with states and prominent localities
export const CITIES: { city: string; state: string; localities: string[] }[] = [
  {
    city: "Mumbai",
    state: "Maharashtra",
    localities: ["Bandra West", "Powai", "Andheri West", "Worli", "Chembur", "Malad West"],
  },
  {
    city: "Bengaluru",
    state: "Karnataka",
    localities: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Sarjapur Road", "Hebbal"],
  },
  {
    city: "Pune",
    state: "Maharashtra",
    localities: ["Koregaon Park", "Baner", "Kharadi", "Hinjawadi", "Wakad", "Viman Nagar"],
  },
  {
    city: "Hyderabad",
    state: "Telangana",
    localities: ["Gachibowli", "Jubilee Hills", "Kondapur", "Madhapur", "Manikonda", "Kompally"],
  },
  {
    city: "Noida",
    state: "Uttar Pradesh",
    localities: ["Sector 150", "Sector 45", "Sector 128", "Sector 137", "Sector 100"],
  },
  {
    city: "Gurugram",
    state: "Haryana",
    localities: ["Golf Course Road", "DLF Phase 2", "Sohna Road", "Sector 82", "New Gurgaon"],
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
    localities: ["Adyar", "OMR", "Velachery", "Anna Nagar", "Nungambakkam"],
  },
  {
    city: "Kolkata",
    state: "West Bengal",
    localities: ["New Town", "Salt Lake", "Ballygunge", "Alipore", "Behala"],
  },
  {
    city: "Jaipur",
    state: "Rajasthan",
    localities: ["Vaishali Nagar", "Malviya Nagar", "C-Scheme", "Mansarovar"],
  },
  {
    city: "Ahmedabad",
    state: "Gujarat",
    localities: ["Bodakdev", "Satellite", "SG Highway", "Prahlad Nagar"],
  },
];

export const BUDGET_OPTIONS = [
  { value: "2500000", label: "₹25 Lac" },
  { value: "5000000", label: "₹50 Lac" },
  { value: "7500000", label: "₹75 Lac" },
  { value: "10000000", label: "₹1 Cr" },
  { value: "15000000", label: "₹1.5 Cr" },
  { value: "20000000", label: "₹2 Cr" },
  { value: "30000000", label: "₹3 Cr" },
  { value: "50000000", label: "₹5 Cr" },
  { value: "100000000", label: "₹10 Cr" },
];

export const POSSESSION_PERIODS = [
  "Ready to Move",
  "Dec 2025",
  "Mar 2026",
  "Jun 2026",
  "Sep 2026",
  "Dec 2026",
  "Mar 2027",
  "Jun 2027",
  "Dec 2027",
];

export const VISIT_TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

export const BRAND = {
  name: "Gwalior Property Hub",
  shortName: "GPH",
  tagline: "Find a place you'll love to call home.",
  supportEmail: "support@gwaliorpropertyhub.in",
  // WhatsApp & calls: +91 70116 45976
  supportPhone: "+91 70116 45976",
  // wa.me link target for the WhatsApp enquiry button
  whatsappDigits: "917011645976",
};
