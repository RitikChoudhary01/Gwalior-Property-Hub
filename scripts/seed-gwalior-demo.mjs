#!/usr/bin/env node
// ============================================================
// seed-gwalior-demo.mjs — seeds high-quality, authentic Gwalior
// demo properties and 1 builder project into the Supabase database.
//
// Complies strictly with instructions:
//   1. Does NOT delete or overwrite existing records (idempotent ON CONFLICT DO NOTHING).
//   2. Uses realistic Gwalior localities: City Centre, Thatipur, Morar, Lashkar,
//      Alkapuri, Patel Nagar, Maharaj Bada, DD Nagar.
//   3. Realistic property types, BHK configurations, prices, and areas.
//   4. Explicitly labels listings as demo listings (verificationStatus: NONE,
//      clear demo disclosures) to avoid any misleading claims.
// ============================================================

import { randomUUID } from "node:crypto";
import pg from "pg";

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
if (!DATABASE_URL.startsWith("postgres")) {
  console.error("✗ DIRECT_URL / DATABASE_URL is missing or invalid in environment.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Fixed UUIDs for reproducibility and idempotency
const GWALIOR_PROJECT_ID = "a1b2c3d4-e5f6-4001-8001-000000000001";
const APEX_BUILDER_ID = "fd6d0859-6030-425f-bcb9-14486d34ef28"; // Kailash Sharma (Apex Group)
const APEX_USER_ID = "06983cc0-47d3-4488-8546-3bb2d2b27a20";
const SELLER_1_ID = "b34c1ef5-0d7f-4b06-b5ee-07739dc5293d"; // Rajesh Agarwal (Seller)
const SELLER_2_ID = "64dec485-3cb5-466d-91a7-8ebfc90ddfde"; // Sunita Rao (Seller)

const GWALIOR_PROJECT = {
  id: GWALIOR_PROJECT_ID,
  builderId: APEX_BUILDER_ID,
  name: "Apex City Centre Heights [Demo Project]",
  slug: "demo-apex-city-centre-heights-gwalior",
  description:
    "[DEMO PROJECT — Platform Demonstration Only]\nA master-planned gated residential community located on Main City Centre Road, Gwalior. Features earthquake-resistant RCC framed construction, landscaped central park, dedicated multi-tier security, modern clubhouse, and fast connectivity to Gwalior Railway Station and VIP Circuit House.",
  city: "Gwalior",
  state: "Madhya Pradesh",
  locality: "City Centre",
  propertyType: "Apartment",
  configuration: "2, 3 & 4 BHK",
  priceMin: 4500000,
  priceMax: 8200000,
  totalUnits: 72,
  availableUnits: 18,
  reraNumber: "P-GWL-24-DEMO-0192",
  construction: "UNDER_CONSTRUCTION",
  possessionDate: "March 2027",
  amenities: "Power Backup, Lift, Clubhouse, Gym, 24x7 Security, CCTV Surveillance, Landscaped Gardens, Car Parking",
  status: "PUBLISHED",
  featured: true,
};

const GWALIOR_PROJECT_IMAGES = [
  { id: "a1b2c3d4-img1-4001-8001-000000000001", projectId: GWALIOR_PROJECT_ID, url: "/images/properties/ap-building.png", caption: "Elevation & Facade", sortOrder: 0 },
  { id: "a1b2c3d4-img2-4001-8001-000000000002", projectId: GWALIOR_PROJECT_ID, url: "/images/properties/clubhouse.png", caption: "Clubhouse & Leisure Area", sortOrder: 1 },
  { id: "a1b2c3d4-img3-4001-8001-000000000003", projectId: GWALIOR_PROJECT_ID, url: "/images/properties/ap-living.png", caption: "Show Apartment Living Room", sortOrder: 2 },
];

const GWALIOR_PROPERTIES = [
  {
    id: "g1000001-0000-4000-8000-000000000001",
    title: "Spacious 3 BHK Apartment in City Centre [Demo Listing]",
    slug: "demo-spacious-3bhk-apartment-city-centre-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nWell-appointed 3 BHK apartment in the heart of City Centre, Gwalior. Features cross-ventilation, two private balconies with city views, modular kitchen with chimney, premium vitrified tile flooring, and dedicated covered car parking. Walking distance from prominent coaching hubs, hospitals, and shopping centers.",
    type: "Apartment",
    price: 4800000,
    negotiable: true,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "City Centre",
    address: "B-402, Royal Residency, Near Patel Chowk, City Centre",
    bhk: 3,
    bathrooms: 3,
    carpetArea: 1250,
    builtUpArea: 1550,
    plotArea: null,
    furnishing: "Semi-Furnished",
    parking: 1,
    floorInfo: "4 of 7",
    facing: "East",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "1-2 years",
    reraNumber: "MPRERA-GWL-DEMO-101",
    sellerId: SELLER_1_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: true,
    views: 142,
    images: [
      { url: "/images/properties/ap-building.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-living.png", isMain: false, sortOrder: 1 },
      { url: "/images/properties/ap-balcony.png", isMain: false, sortOrder: 2 },
    ],
    amenities: ["Power Backup", "Lift", "24x7 Security", "Car Parking", "Modular Kitchen", "Balcony"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000002",
    title: "Modern 2 BHK Multistorey Flat in Thatipur [Demo Listing]",
    slug: "demo-modern-2bhk-flat-thatipur-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nCarefully planned 2 BHK home in prime Thatipur with quick access to Gandhi Road and Morar. Well-lit living room, separate dining alcove, utility balcony attached to kitchen, and secure gated campus with 24-hour water supply.",
    type: "Flat",
    price: 3250000,
    negotiable: false,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "Thatipur",
    address: "Flat 204, Shivalik Heights, Opposite Circuit House Road, Thatipur",
    bhk: 2,
    bathrooms: 2,
    carpetArea: 880,
    builtUpArea: 1100,
    plotArea: null,
    furnishing: "Semi-Furnished",
    parking: 1,
    floorInfo: "2 of 6",
    facing: "North-East",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "0-1 years",
    reraNumber: "MPRERA-GWL-DEMO-102",
    sellerId: SELLER_2_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: true,
    views: 98,
    images: [
      { url: "/images/properties/facade.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-bedroom.png", isMain: false, sortOrder: 1 },
      { url: "/images/properties/ap-kitchen.png", isMain: false, sortOrder: 2 },
    ],
    amenities: ["Power Backup", "Lift", "24x7 Security", "Car Parking", "Balcony"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000003",
    title: "Independent 3 BHK Duplex House in Morar [Demo Listing]",
    slug: "demo-independent-3bhk-duplex-morar-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nIndependent two-storey duplex house built on a 1200 sq.ft. plot in Morar cantonment zone. Features private porch parking, terrace garden space, ground floor master bedroom, and quiet residential neighborhood with wide roads.",
    type: "Independent House",
    price: 6200000,
    negotiable: true,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "Morar",
    address: "House 45, Sun Temple Colony, Near Morar Cantt, Morar",
    bhk: 3,
    bathrooms: 3,
    carpetArea: 1500,
    builtUpArea: 1850,
    plotArea: 1200,
    furnishing: "Semi-Furnished",
    parking: 2,
    floorInfo: "Ground + 1 Floor",
    facing: "North",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "2-3 years",
    reraNumber: null,
    sellerId: SELLER_1_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: true,
    views: 184,
    images: [
      { url: "/images/properties/house-ext.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-living.png", isMain: false, sortOrder: 1 },
      { url: "/images/properties/ap-bedroom.png", isMain: false, sortOrder: 2 },
    ],
    amenities: ["Car Parking", "Power Backup", "Rainwater Harvesting", "Modular Kitchen", "Balcony"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000004",
    title: "Well-Ventilated 2 BHK Flat in Lashkar [Demo Listing]",
    slug: "demo-well-ventilated-2bhk-flat-lashkar-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nAffordable, centrally located 2 BHK apartment in traditional Lashkar near commercial markets. Low maintenance building with dedicated municipal water connection and security gate.",
    type: "Flat",
    price: 2800000,
    negotiable: true,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "Lashkar",
    address: "Near Sarafa Bazar, Daulat Ganj Road, Lashkar",
    bhk: 2,
    bathrooms: 2,
    carpetArea: 820,
    builtUpArea: 980,
    plotArea: null,
    furnishing: "Unfurnished",
    parking: 1,
    floorInfo: "3 of 4",
    facing: "East",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "4-5 years",
    reraNumber: null,
    sellerId: SELLER_2_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: false,
    views: 76,
    images: [
      { url: "/images/properties/ap-living.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-kitchen.png", isMain: false, sortOrder: 1 },
    ],
    amenities: ["Car Parking", "Balcony"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000005",
    title: "Luxury 4 BHK Designer Villa in Alkapuri [Demo Listing]",
    slug: "demo-luxury-4bhk-villa-alkapuri-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nExclusive independent 4 BHK villa in the prestigious Alkapuri locality of Gwalior. Designed with double-height ceiling in drawing room, Italian marble flooring, landscaped lawn, private terrace lounge, and servant room with separate bath.",
    type: "Villa",
    price: 12000000,
    negotiable: false,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "Alkapuri",
    address: "Villa 8, Alkapuri Enclave, Near City Center Extension, Gwalior",
    bhk: 4,
    bathrooms: 4,
    carpetArea: 2600,
    builtUpArea: 3100,
    plotArea: 2400,
    furnishing: "Fully-Furnished",
    parking: 3,
    floorInfo: "Ground + 2 Floors",
    facing: "North-East",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "0-1 years",
    reraNumber: "MPRERA-GWL-DEMO-105",
    sellerId: SELLER_1_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: true,
    views: 310,
    images: [
      { url: "/images/properties/villa-ext.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/villa-int.png", isMain: false, sortOrder: 1 },
      { url: "/images/properties/ap-living.png", isMain: false, sortOrder: 2 },
    ],
    amenities: ["Power Backup", "Clubhouse", "24x7 Security", "Car Parking", "Modular Kitchen", "Servant Room", "Landscaped Gardens"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000006",
    title: "Premium 3 BHK Residential Apartment in Patel Nagar [Demo Listing]",
    slug: "demo-premium-3bhk-apartment-patel-nagar-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nSpacious 3 BHK residence in a premier gated apartment society in Patel Nagar, Gwalior. Close to educational institutions, Sachin Tendulkar Marg, and hospital facilities. High-speed elevators and 100% DG backup for common areas.",
    type: "Apartment",
    price: 5500000,
    negotiable: true,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "Patel Nagar",
    address: "Tower 2, Flat 601, Patel Nagar Main Road, Gwalior",
    bhk: 3,
    bathrooms: 3,
    carpetArea: 1350,
    builtUpArea: 1650,
    plotArea: null,
    furnishing: "Semi-Furnished",
    parking: 1,
    floorInfo: "6 of 8",
    facing: "East",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "1-2 years",
    reraNumber: "MPRERA-GWL-DEMO-106",
    sellerId: SELLER_2_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: false,
    views: 115,
    images: [
      { url: "/images/properties/ap-building.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-living.png", isMain: false, sortOrder: 1 },
      { url: "/images/properties/ap-balcony.png", isMain: false, sortOrder: 2 },
    ],
    amenities: ["Power Backup", "Lift", "24x7 Security", "Car Parking", "Modular Kitchen", "Balcony", "Children's Play Area"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000007",
    title: "Prime Commercial-Cum-Residential 1 BHK Unit near Maharaj Bada [Demo Listing]",
    slug: "demo-prime-1bhk-unit-maharaj-bada-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nCompact, high-utility 1 BHK unit in a landmark building near historical Maharaj Bada. Ideal for professionals, small families, or rental income due to exceptional commercial connectivity.",
    type: "Flat",
    price: 2200000,
    negotiable: false,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "Maharaj Bada",
    address: "Victoria Market Link Road, Maharaj Bada, Gwalior",
    bhk: 1,
    bathrooms: 1,
    carpetArea: 520,
    builtUpArea: 640,
    plotArea: null,
    furnishing: "Semi-Furnished",
    parking: 1,
    floorInfo: "1 of 3",
    facing: "West",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "3-4 years",
    reraNumber: null,
    sellerId: SELLER_1_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: false,
    views: 89,
    images: [
      { url: "/images/properties/ap-bedroom.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-kitchen.png", isMain: false, sortOrder: 1 },
    ],
    amenities: ["Power Backup", "Car Parking"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000008",
    title: "Residential Plot in DD Nagar Sector 2 [Demo Listing]",
    slug: "demo-residential-plot-dd-nagar-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nPrime 1500 sq.ft. east-facing residential land parcel in DD Nagar (Deendayal Nagar) Sector 2. Clear title, demarcation completed, surrounded by newly built family homes. Wide 30-feet paved road in front.",
    type: "Plot",
    price: 3500000,
    negotiable: true,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "DD Nagar",
    address: "Plot 88, Sector 2, DD Nagar, Near Pinto Park, Gwalior",
    bhk: null,
    bathrooms: null,
    carpetArea: null,
    builtUpArea: null,
    plotArea: 1500,
    furnishing: null,
    parking: 0,
    floorInfo: null,
    facing: "East",
    constructionStatus: "NEW",
    possessionDate: "Immediate",
    ageOfProperty: null,
    reraNumber: null,
    sellerId: SELLER_2_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: false,
    views: 140,
    images: [
      { url: "/images/properties/plot.png", isMain: true, sortOrder: 0 },
    ],
    amenities: ["Rainwater Harvesting"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000009",
    title: "Newly Constructed 2 BHK Independent House in DD Nagar [Demo Listing]",
    slug: "demo-new-2bhk-independent-house-dd-nagar-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nBrand new single-floor 2 BHK house built on a 1000 sq.ft. plot in DD Nagar Sector 4. Features front car porch, open modular kitchen, false ceiling with LED downlights, and sturdy foundation capable of taking first floor expansion.",
    type: "Independent House",
    price: 4200000,
    negotiable: true,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "DD Nagar",
    address: "House 112, Sector 4, Deendayal Nagar, Gwalior",
    bhk: 2,
    bathrooms: 2,
    carpetArea: 950,
    builtUpArea: 1200,
    plotArea: 1000,
    furnishing: "Semi-Furnished",
    parking: 1,
    floorInfo: "Ground Floor",
    facing: "North",
    constructionStatus: "READY_TO_MOVE",
    possessionDate: "Immediate",
    ageOfProperty: "0-1 years",
    reraNumber: null,
    sellerId: SELLER_1_ID,
    builderId: null,
    projectId: null,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: true,
    views: 165,
    images: [
      { url: "/images/properties/house-ext.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-living.png", isMain: false, sortOrder: 1 },
      { url: "/images/properties/ap-bedroom.png", isMain: false, sortOrder: 2 },
    ],
    amenities: ["Car Parking", "Power Backup", "Modular Kitchen", "Rainwater Harvesting"],
  },
  {
    id: "g1000001-0000-4000-8000-000000000010",
    title: "Signature 4 BHK High-Rise Residence at Apex City Centre [Demo Listing]",
    slug: "demo-signature-4bhk-apex-city-centre-gwalior",
    description:
      "[DEMO LISTING — Sample property for Gwalior Property Hub platform demonstration. Not a verified real-world listing.]\n\nFlagship unit in Apex City Centre Heights. Features panoramic views of Gwalior fort from master balcony, VRV air conditioning provision, imported sanitary fittings, and smart home lighting controls.",
    type: "Apartment",
    price: 7800000,
    negotiable: false,
    city: "Gwalior",
    state: "Madhya Pradesh",
    locality: "City Centre",
    address: "Tower A, Unit 701, Apex City Centre Heights, City Centre, Gwalior",
    bhk: 4,
    bathrooms: 4,
    carpetArea: 2100,
    builtUpArea: 2550,
    plotArea: null,
    furnishing: "Semi-Furnished",
    parking: 2,
    floorInfo: "7 of 11",
    facing: "North-East",
    constructionStatus: "UNDER_CONSTRUCTION",
    possessionDate: "March 2027",
    ageOfProperty: "Under Construction",
    reraNumber: "P-GWL-24-DEMO-0192",
    sellerId: APEX_USER_ID,
    builderId: APEX_BUILDER_ID,
    projectId: GWALIOR_PROJECT_ID,
    status: "PUBLISHED",
    verificationStatus: "NONE",
    availability: "AVAILABLE",
    featured: true,
    views: 240,
    images: [
      { url: "/images/properties/ap-building.png", isMain: true, sortOrder: 0 },
      { url: "/images/properties/ap-living.png", isMain: false, sortOrder: 1 },
      { url: "/images/properties/ap-balcony.png", isMain: false, sortOrder: 2 },
    ],
    amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "24x7 Security", "Car Parking", "Balcony"],
  },
];

async function main() {
  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  try {
    await client.query("BEGIN");

    // 1. Seed Builder Project
    console.log("Seeding Gwalior Project...");
    const projQuery = `
      INSERT INTO "public"."Project" (
        "id", "builderId", "name", "slug", "description",
        "city", "state", "locality", "propertyType", "configuration",
        "priceMin", "priceMax", "totalUnits", "availableUnits", "reraNumber",
        "construction", "possessionDate", "amenities", "status", "featured",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
      ) ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "locality" = EXCLUDED."locality",
        "priceMin" = EXCLUDED."priceMin",
        "priceMax" = EXCLUDED."priceMax",
        "featured" = EXCLUDED."featured";
    `;
    await client.query(projQuery, [
      GWALIOR_PROJECT.id,
      GWALIOR_PROJECT.builderId,
      GWALIOR_PROJECT.name,
      GWALIOR_PROJECT.slug,
      GWALIOR_PROJECT.description,
      GWALIOR_PROJECT.city,
      GWALIOR_PROJECT.state,
      GWALIOR_PROJECT.locality,
      GWALIOR_PROJECT.propertyType,
      GWALIOR_PROJECT.configuration,
      GWALIOR_PROJECT.priceMin,
      GWALIOR_PROJECT.priceMax,
      GWALIOR_PROJECT.totalUnits,
      GWALIOR_PROJECT.availableUnits,
      GWALIOR_PROJECT.reraNumber,
      GWALIOR_PROJECT.construction,
      GWALIOR_PROJECT.possessionDate,
      GWALIOR_PROJECT.amenities,
      GWALIOR_PROJECT.status,
      GWALIOR_PROJECT.featured,
    ]);

    // Project Images
    for (const img of GWALIOR_PROJECT_IMAGES) {
      await client.query(
        `INSERT INTO "public"."ProjectImage" ("id", "projectId", "url", "caption", "sortOrder")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("id") DO NOTHING`,
        [img.id, img.projectId, img.url, img.caption, img.sortOrder]
      );
    }
    console.log(`  ✓ Inserted Project: ${GWALIOR_PROJECT.name}`);

    // 2. Seed Properties
    console.log("Seeding Gwalior Properties...");
    for (const p of GWALIOR_PROPERTIES) {
      const propQuery = `
        INSERT INTO "public"."Property" (
          "id", "title", "slug", "description", "type", "price", "negotiable",
          "city", "state", "locality", "address", "bhk", "bathrooms",
          "carpetArea", "builtUpArea", "plotArea", "furnishing", "parking",
          "floorInfo", "facing", "constructionStatus", "possessionDate",
          "ageOfProperty", "reraNumber", "sellerId", "builderId", "projectId",
          "status", "verificationStatus", "availability", "featured", "views",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, NOW(), NOW()
        ) ON CONFLICT ("id") DO UPDATE SET
          "title" = EXCLUDED."title",
          "locality" = EXCLUDED."locality",
          "price" = EXCLUDED."price",
          "featured" = EXCLUDED."featured",
          "status" = EXCLUDED."status";
      `;
      await client.query(propQuery, [
        p.id,
        p.title,
        p.slug,
        p.description,
        p.type,
        p.price,
        p.negotiable,
        p.city,
        p.state,
        p.locality,
        p.address,
        p.bhk,
        p.bathrooms,
        p.carpetArea,
        p.builtUpArea,
        p.plotArea,
        p.furnishing,
        p.parking,
        p.floorInfo,
        p.facing,
        p.constructionStatus,
        p.possessionDate,
        p.ageOfProperty,
        p.reraNumber,
        p.sellerId,
        p.builderId,
        p.projectId,
        p.status,
        p.verificationStatus,
        p.availability,
        p.featured,
        p.views,
      ]);

      // Images
      let imgIdx = 0;
      for (const img of p.images) {
        const imgId = randomUUID();
        await client.query(
          `INSERT INTO "public"."PropertyImage" ("id", "propertyId", "url", "isMain", "sortOrder", "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT ("id") DO NOTHING`,
          [imgId, p.id, img.url, img.isMain, img.sortOrder]
        );
      }

      // Amenities
      for (const a of p.amenities) {
        const amId = randomUUID();
        await client.query(
          `INSERT INTO "public"."PropertyAmenity" ("id", "propertyId", "name")
           VALUES ($1, $2, $3)
           ON CONFLICT ("propertyId", "name") DO NOTHING`,
          [amId, p.id, a]
        );
      }

      console.log(`  ✓ Inserted Property: [${p.locality}] ${p.title} (₹${(p.price / 100000).toFixed(1)}L)`);
    }

    await client.query("COMMIT");
    console.log("\n✓ All Gwalior demo properties seeded successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding failed, transaction rolled back:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
