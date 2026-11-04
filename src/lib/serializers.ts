// ============================================================
// DTO serializers — map Prisma results to API shapes
// ============================================================

import type { Prisma } from "@prisma/client";

// ---------- Auth user ----------

export const userWithBuilderInclude = {
  builderProfile: true,
} satisfies Prisma.UserInclude;

type UserWithBuilder = Prisma.UserGetPayload<{ include: typeof userWithBuilderInclude }>;

export function toAuthUser(u: UserWithBuilder) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    city: u.city,
    avatarUrl: u.avatarUrl,
    isVerified: u.isVerified,
    builderProfile: u.builderProfile,
    createdAt: u.createdAt.toISOString(),
  };
}

export const propertyListInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true, isMain: true } },
  seller: { select: { id: true, name: true, isVerified: true } },
  builder: { select: { id: true, companyName: true, isVerified: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.PropertyInclude;

export const propertyDetailInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  amenities: { select: { name: true } },
  seller: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isVerified: true,
      createdAt: true,
      role: true,
    },
  },
  builder: { select: { id: true, companyName: true, isVerified: true } },
  project: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.PropertyInclude;

type PropertyWithList = Prisma.PropertyGetPayload<{ include: typeof propertyListInclude }>;
type PropertyWithDetail = Prisma.PropertyGetPayload<{ include: typeof propertyDetailInclude }>;

export function toCard(p: PropertyWithList) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    type: p.type,
    price: p.price,
    city: p.city,
    state: p.state,
    locality: p.locality,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    carpetArea: p.carpetArea,
    builtUpArea: p.builtUpArea,
    plotArea: p.plotArea,
    constructionStatus: p.constructionStatus,
    availability: p.availability,
    status: p.status,
    verificationStatus: p.verificationStatus,
    featured: p.featured,
    views: p.views,
    createdAt: p.createdAt.toISOString(),
    mainImage: (p.images.find((i) => i.isMain) ?? p.images[0])?.url ?? null,
    sellerVerified: p.seller.isVerified,
    sellerName: p.seller.name,
    projectName: p.project?.name ?? null,
    builderName: p.builder?.companyName ?? null,
  };
}

export function toDetail(p: PropertyWithDetail, similar: PropertyWithList[] = []) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    type: p.type,
    price: p.price,
    negotiable: p.negotiable,
    city: p.city,
    state: p.state,
    locality: p.locality,
    address: p.address,
    latitude: p.latitude,
    longitude: p.longitude,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    carpetArea: p.carpetArea,
    builtUpArea: p.builtUpArea,
    plotArea: p.plotArea,
    furnishing: p.furnishing,
    parking: p.parking,
    floorInfo: p.floorInfo,
    facing: p.facing,
    constructionStatus: p.constructionStatus,
    possessionDate: p.possessionDate,
    ageOfProperty: p.ageOfProperty,
    reraNumber: p.reraNumber,
    rejectionReason: p.rejectionReason,
    availability: p.availability,
    status: p.status,
    verificationStatus: p.verificationStatus,
    featured: p.featured,
    views: p.views,
    createdAt: p.createdAt.toISOString(),
    images: p.images.map((i) => ({ id: i.id, url: i.url, isMain: i.isMain, sortOrder: i.sortOrder })),
    amenities: p.amenities.map((a) => a.name),
    seller: {
      id: p.seller.id,
      name: p.seller.name,
      phone: p.seller.phone,
      email: p.seller.email,
      isVerified: p.seller.isVerified,
      memberSince: p.seller.createdAt.toISOString(),
      role: p.seller.role,
    },
    builder: p.builder ? { id: p.builder.id, companyName: p.builder.companyName, isVerified: p.builder.isVerified } : null,
    project: p.project,
    similar: similar.map(toCard),
  };
}

// ---------- Projects ----------

export const projectListInclude = {
  builder: { select: { companyName: true, isVerified: true } },
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true } },
} satisfies Prisma.ProjectInclude;

export const projectDetailInclude = {
  builder: {
    select: { id: true, companyName: true, isVerified: true, description: true, city: true, website: true },
  },
  images: { orderBy: { sortOrder: "asc" as const } },
  units: {
    where: { status: "PUBLISHED" },
    include: propertyListInclude,
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWithList = Prisma.ProjectGetPayload<{ include: typeof projectListInclude }>;
type ProjectWithDetail = Prisma.ProjectGetPayload<{ include: typeof projectDetailInclude }>;

export function projectToCard(p: ProjectWithList) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city,
    state: p.state,
    locality: p.locality,
    propertyType: p.propertyType,
    configuration: p.configuration,
    priceMin: p.priceMin,
    priceMax: p.priceMax,
    totalUnits: p.totalUnits,
    availableUnits: p.availableUnits,
    construction: p.construction,
    possessionDate: p.possessionDate,
    reraNumber: p.reraNumber,
    status: p.status,
    featured: p.featured,
    builderName: p.builder.companyName,
    builderVerified: p.builder.isVerified,
    mainImage: p.images[0]?.url ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export function projectToDetail(p: ProjectWithDetail) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    city: p.city,
    state: p.state,
    locality: p.locality,
    propertyType: p.propertyType,
    configuration: p.configuration,
    priceMin: p.priceMin,
    priceMax: p.priceMax,
    totalUnits: p.totalUnits,
    availableUnits: p.availableUnits,
    reraNumber: p.reraNumber,
    construction: p.construction,
    possessionDate: p.possessionDate,
    amenities: p.amenities,
    status: p.status,
    featured: p.featured,
    rejectionReason: p.rejectionReason,
    builderName: p.builder.companyName,
    builderVerified: p.builder.isVerified,
    createdAt: p.createdAt.toISOString(),
    images: p.images.map((i) => ({ id: i.id, url: i.url, caption: i.caption })),
    units: p.units.map(toCard),
    builder: p.builder,
  };
}

// ---------- Leads ----------

export const leadInclude = {
  assignedTo: { select: { id: true, name: true } },
  property: {
    select: {
      id: true,
      slug: true,
      title: true,
      city: true,
      locality: true,
      price: true,
      images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, isMain: true } },
      seller: { select: { name: true, role: true } },
      builder: { select: { companyName: true } },
    },
  },
  _count: { select: { activities: true, visits: true } },
} satisfies Prisma.LeadInclude;

type LeadWithRelations = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;

export function toLeadDTO(l: LeadWithRelations) {
  const img = l.property.images.find((i) => i.isMain) ?? l.property.images[0];
  return {
    id: l.id,
    reference: l.reference,
    name: l.name,
    phone: l.phone,
    email: l.email,
    budget: l.budget,
    message: l.message,
    source: l.source,
    status: l.status,
    followUpDate: l.followUpDate?.toISOString() ?? null,
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    consent: l.consent,
    assignedTo: l.assignedTo,
    buyerId: l.buyerId,
    property: {
      id: l.property.id,
      slug: l.property.slug,
      title: l.property.title,
      city: l.property.city,
      locality: l.property.locality,
      price: l.property.price,
      mainImage: img?.url ?? null,
      ownerName: l.property.builder?.companyName ?? l.property.seller.name,
      ownerRole: l.property.builder ? "BUILDER" : l.property.seller.role,
    },
    _count: l._count,
  };
}

// ---------- Site visits ----------

export const visitInclude = {
  property: {
    select: {
      id: true,
      slug: true,
      title: true,
      city: true,
      locality: true,
      images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, isMain: true } },
      seller: { select: { name: true } },
      builder: { select: { companyName: true } },
    },
  },
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.SiteVisitInclude;

type VisitWithRelations = Prisma.SiteVisitGetPayload<{ include: typeof visitInclude }>;

export function toVisitDTO(v: VisitWithRelations) {
  const img = v.property.images.find((i) => i.isMain) ?? v.property.images[0];
  return {
    id: v.id,
    preferredDate: v.preferredDate.toISOString(),
    preferredTime: v.preferredTime,
    contactName: v.contactName,
    contactPhone: v.contactPhone,
    assignedTo: v.assignedTo,
    status: v.status,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
    buyerId: v.buyerId,
    leadId: v.leadId,
    property: {
      id: v.property.id,
      slug: v.property.slug,
      title: v.property.title,
      city: v.property.city,
      locality: v.property.locality,
      mainImage: img?.url ?? null,
      ownerName: v.property.builder?.companyName ?? v.property.seller.name,
    },
  };
}

// ---------- Requirements ----------

export const requirementInclude = {
  assignedTo: { select: { id: true, name: true } },
  buyer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.RequirementInclude;

type RequirementWithRelations = Prisma.RequirementGetPayload<{ include: typeof requirementInclude }>;

export function toRequirementDTO(r: RequirementWithRelations) {
  return {
    id: r.id,
    reference: r.reference,
    name: r.name,
    phone: r.phone,
    email: r.email,
    purpose: r.purpose,
    city: r.city,
    localities: r.localities ? r.localities.split(",").map((l) => l.trim()).filter(Boolean) : [],
    propertyType: r.propertyType,
    bhk: r.bhk,
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    notes: r.notes,
    source: r.source,
    status: r.status,
    assignedTo: r.assignedTo,
    buyer: r.buyer,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// Minimal property shape used inside requirement match payloads.
export const matchPropertyInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true, isMain: true } },
} satisfies Prisma.PropertyInclude;

type MatchProperty = Prisma.PropertyGetPayload<{ include: typeof matchPropertyInclude }>;

export function toMatchPropertyDTO(p: MatchProperty) {
  const img = p.images.find((i) => i.isMain) ?? p.images[0];
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    type: p.type,
    price: p.price,
    city: p.city,
    locality: p.locality,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    carpetArea: p.carpetArea,
    builtUpArea: p.builtUpArea,
    constructionStatus: p.constructionStatus,
    availability: p.availability,
    reraNumber: p.reraNumber,
    verificationStatus: p.verificationStatus,
    mainImage: img?.url ?? null,
  };
}
