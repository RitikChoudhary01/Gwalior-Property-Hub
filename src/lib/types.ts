// ============================================================
// Shared API types — used by API routes and client components
// ============================================================

export type Role = "BUYER" | "SELLER" | "BUILDER" | "TEAM" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  city: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  builderProfile: {
    id: string;
    companyName: string;
    isVerified: boolean;
    logoUrl: string | null;
    description: string | null;
    website: string | null;
    reraNumber: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  } | null;
  createdAt: string;
}

export interface PropertyImageDTO {
  id: string;
  url: string;
  isMain: boolean;
  sortOrder: number;
}

export interface PropertyCardDTO {
  id: string;
  slug: string;
  title: string;
  type: string;
  price: number;
  city: string;
  state: string;
  locality: string;
  bhk: number | null;
  bathrooms: number | null;
  carpetArea: number | null;
  builtUpArea: number | null;
  plotArea: number | null;
  constructionStatus: string;
  availability: string;
  status: string;
  verificationStatus: string; // listing-level legal verification (NONE | REQUESTED | VERIFIED | REJECTED)
  featured: boolean;
  views: number;
  createdAt: string;
  mainImage: string | null;
  sellerVerified: boolean;
  sellerName: string;
  projectName: string | null;
  builderName: string | null;
}

export interface PropertyDetailDTO extends Omit<PropertyCardDTO, "mainImage"> {
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  negotiable: boolean;
  furnishing: string | null;
  parking: number;
  floorInfo: string | null;
  facing: string | null;
  possessionDate: string | null;
  ageOfProperty: string | null;
  reraNumber: string | null;
  rejectionReason: string | null;
  images: PropertyImageDTO[];
  amenities: string[];
  seller: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    isVerified: boolean;
    memberSince: string;
    role: Role;
  };
  builder: { id: string; companyName: string; isVerified: boolean } | null;
  project: { id: string; name: string; slug: string } | null;
  similar: PropertyCardDTO[];
  /** Listed price per sq ft (carpet/built-up; plot area for plots); null when no usable area. */
  pricePerSqft: number | null;
  /** Live price context for this listing's locality, from other published listings. */
  localityInsights: LocalitySnapshotDTO | null;
}

/** Locality price context shown on property detail pages. */
export interface LocalitySnapshotDTO {
  locality: string;
  city: string;
  listingCount: number;
  avgPrice: number;
  avgPricePerSqft: number | null;
  thisPricePerSqft: number | null;
  vsLocalityPct: number | null;
}

/** One locality's aggregate market stats (market pulse surfaces). */
export interface LocalityStatDTO {
  locality: string;
  city: string;
  listingCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPricePerSqft: number | null;
  pricedByAreaCount: number;
  verifiedCount: number;
  mainImage: string | null;
}

export interface InsightsResponseDTO {
  city: string | null;
  totalListings: number;
  localities: LocalityStatDTO[];
}

export interface ProjectCardDTO {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  locality: string;
  propertyType: string;
  configuration: string | null;
  priceMin: number | null;
  priceMax: number | null;
  totalUnits: number;
  availableUnits: number;
  construction: string;
  possessionDate: string | null;
  reraNumber: string | null;
  status: string;
  rejectionReason?: string | null;
  featured: boolean;
  builderName: string;
  builderVerified: boolean;
  mainImage: string | null;
  createdAt: string;
}

export interface ProjectDetailDTO extends Omit<ProjectCardDTO, "mainImage"> {
  description: string | null;
  amenities: string | null;
  rejectionReason: string | null;
  images: { id: string; url: string; caption: string | null }[];
  units: PropertyCardDTO[];
  builder: {
    id: string;
    companyName: string;
    isVerified: boolean;
    description: string | null;
    city: string | null;
    website: string | null;
  };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface LeadDTO {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  budget: number | null;
  message: string | null;
  source: string;
  status: string;
  followUpDate: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  consent: boolean;
  assignedTo: { id: string; name: string } | null;
  buyerId: string | null;
  property: {
    id: string;
    slug: string;
    title: string;
    city: string;
    locality: string;
    price: number;
    mainImage: string | null;
    ownerName: string;
    ownerRole: Role;
  };
  _count?: { activities: number; visits: number };
}

export interface LeadActivityDTO {
  id: string;
  type: string;
  note: string;
  createdAt: string;
  user: { id: string; name: string } | null;
}

export interface SiteVisitDTO {
  id: string;
  preferredDate: string;
  preferredTime: string;
  contactName: string;
  contactPhone: string;
  assignedTo: { id: string; name: string } | null;
  status: string;
  notes: string | null;
  createdAt: string;
  buyerId: string | null;
  leadId: string | null;
  property: {
    id: string;
    slug: string;
    title: string;
    city: string;
    locality: string;
    mainImage: string | null;
    ownerName: string;
  };
}

// Buyer requirement ("Post Your Requirement")
export interface RequirementDTO {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  purpose: string; // BUY | RENT
  city: string;
  localities: string[];
  propertyType: string;
  bhk: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  notes: string | null;
  source: string;
  status: string; // NEW | MATCHED | CONTACTED | QUALIFIED | CONVERTED | LOST
  assignedTo: { id: string; name: string } | null;
  buyer: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  // present in list responses
  matchCount?: number;
  topMatch?: string | null;
}

export interface RequirementMatchDTO {
  id: string;
  slug: string;
  title: string;
  type: string;
  price: number;
  city: string;
  locality: string;
  bhk: number | null;
  bathrooms: number | null;
  carpetArea: number | null;
  builtUpArea: number | null;
  constructionStatus: string;
  availability: string;
  reraNumber: string | null;
  verificationStatus: string;
  mainImage: string | null;
  score: number; // 0–100 match score
  reasons: string[]; // why this property matches
}

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface TransactionDTO {
  id: string;
  reference: string;
  saleValue: number;
  bookingDate: string;
  agreementRef: string | null;
  status: string;
  completionDate: string | null;
  notes: string | null;
  createdAt: string;
  property: { id: string; title: string; city: string; locality: string };
  lead: { id: string; reference: string; name: string } | null;
  buyer: { id: string; name: string } | null;
  commission: {
    id: string;
    amount: number;
    paidAmount: number;
    status: string;
    commissionType: string;
    rate: number | null;
  } | null;
}

export interface CommissionPaymentDTO {
  id: string;
  amount: number;
  paidOn: string;
  method: string;
  reference: string | null;
  createdAt: string;
}

export interface CommissionDTO {
  id: string;
  commissionType: string;
  rate: number | null;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  status: string;
  createdAt: string;
  transaction: {
    id: string;
    reference: string;
    saleValue: number;
    bookingDate: string;
    status: string;
    property: { title: string; city: string };
  };
  payments: CommissionPaymentDTO[];
}

export interface AgreementDTO {
  id: string;
  reference: string;
  partyType: "SELLER" | "BUILDER";
  commissionType: string;
  commissionRate: number | null;
  fixedFee: number | null;
  startDate: string;
  endDate: string | null;
  status: string;
  notes: string | null;
  partyName: string;
  partyId: string;
  transactionCount?: number;
}

// Role-scoped "my commissions" payload (seller/builder dashboards)
export interface MyAgreementDTO {
  id: string;
  reference: string;
  commissionType: string;
  commissionRate: number | null;
  fixedFee: number | null;
  startDate: string;
  endDate: string | null;
  status: string;
  notes: string | null;
}

export interface MyAgreementsDTO {
  partyType: "SELLER" | "BUILDER";
  agreements: MyAgreementDTO[];
  commissions: CommissionDTO[];
}

export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  city: string | null;
  createdAt: string;
  builderProfile: { id: string; companyName: string; isVerified: boolean } | null;
  _count?: { properties: number; projects: number; leads: number };
}

// Internal team member row (admin Team Management tab)
export interface TeamMemberDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  isActive: boolean;
  invitePending: boolean; // true while the invite awaits activation
  inviteToken: string | null; // exposed to ADMIN only, for copying the link
  createdAt: string;
  _count: { assignedLeads: number; openLeads: number; convertedLeads: number };
}

// Team dashboard overview payload (/api/team/overview)
export interface TeamOverviewDTO {
  stats: {
    assigned: number;
    open: number;
    dueFollowUps: number;
    upcomingVisits: number;
  };
  pipeline: { status: string; count: number }[];
  followUps: LeadDTO[];
  tasks: TeamTaskDTO[];
  activities: (LeadActivityDTO & { lead: { id: string; reference: string; name: string; propertyTitle: string } | null })[];
}

export interface TeamTaskDTO {
  id: string;
  kind: "FOLLOW_UP_DUE" | "FOLLOW_UP_TODAY" | "NEW_UNCONTACTED" | "VISIT_TO_CONFIRM" | "VISIT_UPCOMING";
  title: string;
  detail: string;
  due: string | null; // ISO date when relevant
  leadId: string | null;
  visitId: string | null;
  propertyTitle: string;
}

export interface AuditLogDTO {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string } | null;
}

// Dashboard stats
export interface BuyerStats {
  favourites: number;
  enquiries: number;
  upcomingVisits: number;
  recentProperties: PropertyCardDTO[];
}

export interface SellerStats {
  totalProperties: number;
  published: number;
  pending: number;
  sold: number;
  totalViews: number;
  totalEnquiries: number;
  upcomingVisits: number;
}

export interface BuilderStats {
  totalProjects: number;
  publishedProjects: number;
  totalUnits: number;
  availableUnits: number;
  totalEnquiries: number;
  upcomingVisits: number;
  totalViews: number;
}

export interface AdminStats {
  totalUsers: number;
  buyers: number;
  sellers: number;
  builders: number;
  pendingBuilders: number;
  activeProperties: number;
  pendingApprovals: number;
  totalLeads: number;
  qualifiedLeads: number;
  siteVisits: number;
  confirmedTransactions: number;
  commissionEarned: number;
  commissionReceived: number;
  outstandingCommission: number;
  leadsByStatus: { status: string; count: number }[];
  leadsByMonth: { month: string; count: number }[];
  propertiesByCity: { city: string; count: number }[];
}
