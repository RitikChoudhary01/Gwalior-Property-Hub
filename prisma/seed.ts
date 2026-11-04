/**
 * Gwalior Property Hub — database seed
 * Run with: bun run db:seed
 *
 * Seeds demo accounts, properties, projects, leads, visits,
 * agreements, a transaction + commission and notifications.
 * All data flows through the same models the application uses.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { db } from "../src/lib/db";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `s1:${salt}:${hash}`;
}

const img = (name: string) => `/images/properties/${name}`;

const days = (n: number) => new Date(Date.now() + n * 86400000);

async function main() {
  console.log("Clearing existing data...");
  await db.$transaction([
    db.commissionPayment.deleteMany(),
    db.commission.deleteMany(),
    db.transaction.deleteMany(),
    db.siteVisit.deleteMany(),
    db.leadActivity.deleteMany(),
    db.lead.deleteMany(),
    db.favourite.deleteMany(),
    db.propertyDocument.deleteMany(),
    db.propertyAmenity.deleteMany(),
    db.propertyImage.deleteMany(),
    db.featuredListing.deleteMany(),
    db.property.deleteMany(),
    db.projectImage.deleteMany(),
    db.project.deleteMany(),
    db.builderAgreement.deleteMany(),
    db.sellerAgreement.deleteMany(),
    db.notification.deleteMany(),
    db.auditLog.deleteMany(),
    db.contactMessage.deleteMany(),
    db.setting.deleteMany(),
    db.session.deleteMany(),
    db.builder.deleteMany(),
    db.user.deleteMany(),
  ]);

  console.log("Creating users...");
  const admin = await db.user.create({
    data: {
      email: "admin@vasati.in",
      passwordHash: hashPassword("Admin@123"),
      name: "Arjun Nair",
      phone: "+91 98200 11223",
      role: "ADMIN",
      city: "Bengaluru",
      isVerified: true,
    },
  });

  const priya = await db.user.create({
    data: {
      email: "buyer@vasati.in",
      passwordHash: hashPassword("Buyer@123"),
      name: "Priya Sharma",
      phone: "+91 98330 44556",
      role: "BUYER",
      city: "Mumbai",
    },
  });

  const rohan = await db.user.create({
    data: {
      email: "rohan@example.in",
      passwordHash: hashPassword("Buyer@123"),
      name: "Rohan Iyer",
      phone: "+91 99001 77889",
      role: "BUYER",
      city: "Bengaluru",
    },
  });

  const sunita = await db.user.create({
    data: {
      email: "seller@vasati.in",
      passwordHash: hashPassword("Seller@123"),
      name: "Sunita Rao",
      phone: "+91 98480 22334",
      role: "SELLER",
      city: "Hyderabad",
      isVerified: true,
    },
  });

  const vikram = await db.user.create({
    data: {
      email: "vikram@example.in",
      passwordHash: hashPassword("Seller@123"),
      name: "Vikram Malhotra",
      phone: "+91 98110 33445",
      role: "SELLER",
      city: "Gurugram",
      isVerified: true,
    },
  });

  const anil = await db.user.create({
    data: {
      email: "anil@example.in",
      passwordHash: hashPassword("Seller@123"),
      name: "Anil Deshpande",
      phone: "+91 98220 55667",
      role: "SELLER",
      city: "Pune",
    },
  });

  console.log("Creating builders...");
  const kabir = await db.user.create({
    data: {
      email: "builder@vasati.in",
      passwordHash: hashPassword("Builder@123"),
      name: "Kabir Anand",
      phone: "+91 99860 12345",
      role: "BUILDER",
      city: "Bengaluru",
      isVerified: true,
    },
  });

  const meridian = await db.builder.create({
    data: {
      userId: kabir.id,
      companyName: "Meridian Developers",
      description:
        "Meridian Developers has delivered over 4.5 million sq.ft. of premium residential space across Bengaluru and Pune, with a focus on design-led, sustainability-certified communities.",
      website: "https://meridiandevelopers.example.in",
      city: "Bengaluru",
      state: "Karnataka",
      address: "Meridian House, Whitefield Main Road, Bengaluru 560066",
      isVerified: true,
    },
  });

  const meera = await db.user.create({
    data: {
      email: "meera@sthirya.in",
      passwordHash: hashPassword("Builder@123"),
      name: "Meera Krishnan",
      phone: "+91 99480 66778",
      role: "BUILDER",
      city: "Hyderabad",
      isVerified: true,
    },
  });

  const sthirya = await db.builder.create({
    data: {
      userId: meera.id,
      companyName: "Sthirya Homes",
      description:
        "Sthirya Homes builds boutique residential communities in Hyderabad and the NCR, known for timely delivery and transparent, customer-first processes.",
      website: "https://sthiryahomes.example.in",
      city: "Hyderabad",
      state: "Telangana",
      address: "Plot 42, Financial District Road, Gachibowli, Hyderabad 500032",
      isVerified: true,
    },
  });

  console.log("Creating projects...");
  const skyline = await db.project.create({
    data: {
      builderId: meridian.id,
      name: "Meridian Skyline",
      slug: "meridian-skyline-whitefield-bengaluru",
      description:
        "Meridian Skyline is a 2-tower premium residential development in the heart of Whitefield, offering 3 and 4 BHK residences with sky decks, a 30,000 sq.ft. clubhouse and 78% open spaces. Walking distance to ITPL and upcoming metro connectivity.",
      city: "Bengaluru",
      state: "Karnataka",
      locality: "Whitefield",
      propertyType: "Apartment",
      configuration: "3 & 4 BHK Apartments",
      priceMin: 14000000,
      priceMax: 23000000,
      totalUnits: 120,
      availableUnits: 38,
      construction: "UNDER_CONSTRUCTION",
      possessionDate: "Dec 2026",
      amenities: "Clubhouse, Swimming Pool, Gym, Jogging Track, Children's Play Area, 24x7 Security, Power Backup",
      status: "PUBLISHED",
      featured: true,
      images: {
        create: [
          { url: img("facade.png"), caption: "Tower facade", sortOrder: 0 },
          { url: img("township.png"), caption: "Aerial view", sortOrder: 1 },
          { url: img("pool.png"), caption: "Pool deck", sortOrder: 2 },
          { url: img("clubhouse.png"), caption: "Clubhouse lounge", sortOrder: 3 },
        ],
      },
    },
  });

  const meridianGreens = await db.project.create({
    data: {
      builderId: meridian.id,
      name: "Meridian Greens",
      slug: "meridian-greens-hinjawadi-pune",
      description:
        "Thoughtfully designed 2 and 3 BHK homes in Hinjawadi Phase 2, surrounded by 3 acres of central greens. Smart-home ready apartments with VRV air conditioning and EV charging bays.",
      city: "Pune",
      state: "Maharashtra",
      locality: "Hinjawadi Phase 2",
      propertyType: "Apartment",
      configuration: "2 & 3 BHK Apartments",
      priceMin: 7500000,
      priceMax: 13500000,
      totalUnits: 240,
      availableUnits: 92,
      construction: "UNDER_CONSTRUCTION",
      possessionDate: "Jun 2027",
      amenities: "Clubhouse, Swimming Pool, Gym, Sports Facility, Landscaped Gardens, 24x7 Security",
      status: "PUBLISHED",
      images: {
        create: [
          { url: img("ap-building.png"), caption: "Community view", sortOrder: 0 },
          { url: img("township.png"), caption: "Masterplan", sortOrder: 1 },
          { url: img("pool.png"), caption: "Pool", sortOrder: 2 },
        ],
      },
    },
  });

  const verdant = await db.project.create({
    data: {
      builderId: sthirya.id,
      name: "Sthirya Verdant Court",
      slug: "sthirya-verdant-court-gachibowli-hyderabad",
      description:
        "Ready-to-move 3 and 4 BHK residences in Gachibowli with double-height living rooms, private decks and a rooftop clubhouse overlooking the Financial District.",
      city: "Hyderabad",
      state: "Telangana",
      locality: "Gachibowli",
      propertyType: "Apartment",
      configuration: "3 & 4 BHK Apartments",
      priceMin: 17000000,
      priceMax: 29000000,
      totalUnits: 88,
      availableUnits: 21,
      construction: "READY_TO_MOVE",
      possessionDate: "Ready to Move",
      amenities: "Clubhouse, Swimming Pool, Gym, Sports Facility, Jogging Track, 24x7 Security, Power Backup",
      status: "PUBLISHED",
      featured: true,
      images: {
        create: [
          { url: img("facade.png"), caption: "Entrance lobby", sortOrder: 0 },
          { url: img("ap-living.png"), caption: "Show residence", sortOrder: 1 },
          { url: img("clubhouse.png"), caption: "Rooftop clubhouse", sortOrder: 2 },
        ],
      },
    },
  });

  const nest = await db.project.create({
    data: {
      builderId: sthirya.id,
      name: "Sthirya The Nest",
      slug: "sthirya-the-nest-sector-150-noida",
      description:
        "The Nest brings low-density 2 and 3 BHK homes to Sector 150, Noida's greenest sector, with a 5-acre central park, cycling loop and full-grown tree transplantations.",
      city: "Noida",
      state: "Uttar Pradesh",
      locality: "Sector 150",
      propertyType: "Apartment",
      configuration: "2 & 3 BHK Apartments",
      priceMin: 8500000,
      priceMax: 14000000,
      totalUnits: 160,
      availableUnits: 44,
      construction: "UNDER_CONSTRUCTION",
      possessionDate: "Mar 2027",
      amenities: "Clubhouse, Swimming Pool, Gym, Children's Play Area, Landscaped Gardens, 24x7 Security",
      status: "PENDING",
      images: {
        create: [
          { url: img("ap-building.png"), caption: "The Nest towers", sortOrder: 0 },
          { url: img("pool.png"), caption: "Pool", sortOrder: 1 },
        ],
      },
    },
  });

  console.log("Creating properties...");

  type PropSeed = {
    title: string;
    slug: string;
    description: string;
    type: string;
    price: number;
    city: string;
    state: string;
    locality: string;
    address: string;
    lat: number;
    lng: number;
    bhk?: number;
    bathrooms?: number;
    carpetArea?: number;
    builtUpArea?: number;
    plotArea?: number;
    furnishing?: string;
    parking?: number;
    floorInfo?: string;
    facing?: string;
    constructionStatus?: string;
    possessionDate?: string;
    ageOfProperty?: string;
    sellerId: string;
    builderId?: string;
    projectId?: string;
    status: string;
    availability?: string;
    featured?: boolean;
    views: number;
    images: string[];
    amenities: string[];
    createdDaysAgo: number;
  };

  const props: PropSeed[] = [
    {
      title: "Sunlit 3 BHK Apartment in Powai with Lake Views",
      slug: "sunlit-3bhk-apartment-powai-mumbai",
      description:
        "A beautifully maintained 3 BHK apartment in one of Powai's most sought-after gated communities, offering uninterrupted views of Powai Lake. The home features a semi-modular kitchen, large balconies on two sides and premium flooring throughout. The complex includes a clubhouse, swimming pool and 24x7 security, minutes from Hiranandani Gardens and easy access to theJVLR.",
      type: "Apartment",
      price: 32000000,
      city: "Mumbai",
      state: "Maharashtra",
      locality: "Powai",
      address: "Lake Homes Complex, Powai Valley Road, Powai, Mumbai 400076",
      lat: 19.12,
      lng: 72.91,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1180,
      builtUpArea: 1450,
      furnishing: "Semi-Furnished",
      parking: 1,
      floorInfo: "7 of 14",
      facing: "East",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "5-7 years",
      sellerId: sunita.id,
      status: "PUBLISHED",
      featured: true,
      views: 214,
      images: [img("ap-living.png"), img("ap-balcony.png"), img("ap-bedroom.png"), img("ap-kitchen.png"), img("ap-bathroom.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "24x7 Security", "CCTV Surveillance", "Intercom", "Balcony", "Car Parking"],
      createdDaysAgo: 21,
    },
    {
      title: "Landmark 4 BHK Residence in Bandra West",
      slug: "landmark-4bhk-residence-bandra-west-mumbai",
      description:
        "An iconic 4 BHK residence in a boutique building off Carter Road, Bandra West. Fully renovated with Italian marble flooring, a chef's kitchen and a wrap-around balcony with sea glimpses. Walk to Carter Road promenade, restaurants and premier schools.",
      type: "Apartment",
      price: 78000000,
      city: "Mumbai",
      state: "Maharashtra",
      locality: "Bandra West",
      address: "Sea Breeze Apartments, 12th Road, Khar West, Mumbai 400050",
      lat: 19.06,
      lng: 72.83,
      bhk: 4,
      bathrooms: 4,
      carpetArea: 2150,
      builtUpArea: 2500,
      furnishing: "Fully-Furnished",
      parking: 2,
      floorInfo: "9 of 12",
      facing: "West",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "8-10 years",
      sellerId: vikram.id,
      status: "PUBLISHED",
      views: 342,
      images: [img("ap-living.png"), img("ap-kitchen.png"), img("ap-bedroom.png"), img("ap-balcony.png")],
      amenities: ["Power Backup", "Lift", "24x7 Security", "CCTV Surveillance", "Modular Kitchen", "Servant Room", "Balcony", "Car Parking"],
      createdDaysAgo: 34,
    },
    {
      title: "Meridian Skyline — 3 BHK Sky Deck Residence, Whitefield",
      slug: "meridian-skyline-3bhk-whitefield-bengaluru",
      description:
        "A 3 BHK sky deck residence at Meridian Skyline, Whitefield. Corner unit with 10x14 ft sky deck, VRV air conditioning, smart-home provisioning and full-length windows. Includes clubhouse membership and two covered parkings. Scheduled for completion by December 2026.",
      type: "Apartment",
      price: 15200000,
      city: "Bengaluru",
      state: "Karnataka",
      locality: "Whitefield",
      address: "Meridian Skyline, Whitefield Main Road, Bengaluru 560066",
      lat: 12.97,
      lng: 77.73,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1345,
      builtUpArea: 1620,
      furnishing: "Unfurnished",
      parking: 2,
      floorInfo: "11 of 21",
      facing: "North-East",
      constructionStatus: "UNDER_CONSTRUCTION",
      possessionDate: "Dec 2026",
      sellerId: kabir.id,
      builderId: meridian.id,
      projectId: skyline.id,
      status: "PUBLISHED",
      views: 189,
      images: [img("facade.png"), img("ap-living.png"), img("pool.png"), img("clubhouse.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "Jogging Track", "Children's Play Area", "24x7 Security", "Balcony", "Car Parking"],
      createdDaysAgo: 16,
    },
    {
      title: "Meridian Skyline — 4 BHK Signature Residence, Whitefield",
      slug: "meridian-skyline-4bhk-whitefield-bengaluru",
      description:
        "The signature 4 BHK at Meridian Skyline with a private foyer, staff quarters and a 200 sq.ft. sky deck overlooking the central greens. Premium specifications include engineered wood flooring, German fittings and home automation.",
      type: "Apartment",
      price: 21000000,
      city: "Bengaluru",
      state: "Karnataka",
      locality: "Whitefield",
      address: "Meridian Skyline, Whitefield Main Road, Bengaluru 560066",
      lat: 12.97,
      lng: 77.73,
      bhk: 4,
      bathrooms: 4,
      carpetArea: 1780,
      builtUpArea: 2150,
      furnishing: "Unfurnished",
      parking: 2,
      floorInfo: "18 of 21",
      facing: "East",
      constructionStatus: "UNDER_CONSTRUCTION",
      possessionDate: "Dec 2026",
      sellerId: kabir.id,
      builderId: meridian.id,
      projectId: skyline.id,
      status: "PUBLISHED",
      views: 156,
      images: [img("facade.png"), img("ap-living.png"), img("ap-kitchen.png"), img("township.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "24x7 Security", "Servant Room", "Balcony", "Car Parking", "Landscaped Gardens"],
      createdDaysAgo: 16,
    },
    {
      title: "Smart 2 BHK Apartment in the Heart of Koramangala",
      slug: "smart-2bhk-apartment-koramangala-bengaluru",
      description:
        "A compact, efficiently planned 2 BHK in Koramangala 5th Block, steps from 80 Feet Road's cafes and offices. Recently painted, with wardrobes and modular kitchen included. Ideal first home or rental investment.",
      type: "Apartment",
      price: 9500000,
      city: "Bengaluru",
      state: "Karnataka",
      locality: "Koramangala",
      address: "Ashirvad Enclave, 5th Block, Koramangala, Bengaluru 560095",
      lat: 12.94,
      lng: 77.62,
      bhk: 2,
      bathrooms: 2,
      carpetArea: 940,
      builtUpArea: 1080,
      furnishing: "Semi-Furnished",
      parking: 1,
      floorInfo: "3 of 5",
      facing: "North",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "3-5 years",
      sellerId: sunita.id,
      status: "PUBLISHED",
      views: 98,
      images: [img("ap-living.png"), img("ap-bedroom.png"), img("ap-kitchen.png")],
      amenities: ["Lift", "Power Backup", "24x7 Security", "Modular Kitchen", "Car Parking"],
      createdDaysAgo: 9,
    },
    {
      title: "Vastu-Compliant Corner Plot on Sarjapur Road",
      slug: "corner-plot-sarjapur-road-bengaluru",
      description:
        "A 2,400 sq.ft. corner plot (60x40) in a gated layout off Sarjapur Road, with clear titles, compound wall on three sides and underground electricity. 15 minutes from Wipro Corporate Office. Approved layout with 30 ft. internal roads and street lighting.",
      type: "Plot",
      price: 11000000,
      city: "Bengaluru",
      state: "Karnataka",
      locality: "Sarjapur Road",
      address: "Green Valley Layout, Sarjapur Road, Bengaluru 562125",
      lat: 12.91,
      lng: 77.68,
      plotArea: 2400,
      parking: 0,
      constructionStatus: "READY_TO_MOVE",
      sellerId: anil.id,
      status: "PUBLISHED",
      views: 67,
      images: [img("plot.png"), img("house-ext.png")],
      amenities: ["Gated Community", "24x7 Security", "Landscaped Gardens"],
      createdDaysAgo: 12,
    },
    {
      title: "Elegant 3 BHK in Koregaon Park with Rooftop Deck",
      slug: "elegant-3bhk-koregaon-park-pune",
      description:
        "A serene 3 BHK in a low-rise boutique building in Koregaon Park, Pune's most prestigious address. The apartment opens to a private garden and comes with a shared rooftop deck with OSHO garden views. Walking distance to German Bakery lane.",
      type: "Apartment",
      price: 21000000,
      city: "Pune",
      state: "Maharashtra",
      locality: "Koregaon Park",
      address: "Willow Court, Lane 7, Koregaon Park, Pune 411001",
      lat: 18.54,
      lng: 73.89,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1410,
      builtUpArea: 1680,
      furnishing: "Semi-Furnished",
      parking: 1,
      floorInfo: "2 of 4",
      facing: "East",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "2-3 years",
      sellerId: anil.id,
      status: "PUBLISHED",
      views: 132,
      images: [img("ap-living.png"), img("ap-balcony.png"), img("ap-bathroom.png"), img("ap-building.png")],
      amenities: ["Power Backup", "Lift", "24x7 Security", "CCTV Surveillance", "Balcony", "Car Parking", "Landscaped Gardens"],
      createdDaysAgo: 18,
    },
    {
      title: "Modern 2 BHK in Baner with Club Facilities",
      slug: "modern-2bhk-baner-pune",
      description:
        "A bright 2 BHK in a full-amenity complex on Baner Road. West-facing with glass railing balcony, vitrified flooring and a fully equipped clubhouse. Walking distance to Balewadi High Street and the Mumbai-Bengaluru highway.",
      type: "Apartment",
      price: 10200000,
      city: "Pune",
      state: "Maharashtra",
      locality: "Baner",
      address: "Sky Heights, Baner Road, Pune 411045",
      lat: 18.56,
      lng: 73.78,
      bhk: 2,
      bathrooms: 2,
      carpetArea: 880,
      builtUpArea: 1020,
      furnishing: "Unfurnished",
      parking: 1,
      floorInfo: "6 of 12",
      facing: "West",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "1-2 years",
      sellerId: anil.id,
      status: "PENDING",
      views: 0,
      images: [img("ap-building.png"), img("ap-living.png"), img("pool.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "Children's Play Area", "24x7 Security", "Car Parking"],
      createdDaysAgo: 2,
    },
    {
      title: "Premium 3 BHK at Sthirya Verdant Court, Gachibowli",
      slug: "premium-3bhk-verdant-court-gachibowli-hyderabad",
      description:
        "A ready-to-move 3 BHK at Sthirya Verdant Court, Gachibowli, with a double-height living room and private deck. Fully fitted with modular kitchen, wardrobes and false ceiling lighting. The tower overlooks the central landscape court and includes rooftop clubhouse access.",
      type: "Apartment",
      price: 16500000,
      city: "Hyderabad",
      state: "Telangana",
      locality: "Gachibowli",
      address: "Sthirya Verdant Court, Financial District Road, Gachibowli, Hyderabad 500032",
      lat: 17.44,
      lng: 78.35,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1520,
      builtUpArea: 1780,
      furnishing: "Semi-Furnished",
      parking: 2,
      floorInfo: "8 of 14",
      facing: "East",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "0-1 years",
      sellerId: meera.id,
      builderId: sthirya.id,
      projectId: verdant.id,
      status: "PUBLISHED",
      featured: true,
      views: 276,
      images: [img("facade.png"), img("ap-living.png"), img("ap-kitchen.png"), img("clubhouse.png"), img("pool.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "Sports Facility", "Jogging Track", "24x7 Security", "Modular Kitchen", "Balcony", "Car Parking"],
      createdDaysAgo: 25,
    },
    {
      title: "Architectural 4 BHK Villa in Jubilee Hills",
      slug: "architectural-4bhk-villa-jubilee-hills-hyderabad",
      description:
        "A one-of-a-kind 4 BHK villa in Jubilee Hills designed by a national-award-winning architect. Double-height living volume, courtyard with reflecting pool, home theatre and a rooftop garden. West-facing plot in a quiet cul-de-sac near KBR National Park extension.",
      type: "Villa",
      price: 58000000,
      city: "Hyderabad",
      state: "Telangana",
      locality: "Jubilee Hills",
      address: "Road 36, Jubilee Hills, Hyderabad 500033",
      lat: 17.43,
      lng: 78.41,
      bhk: 4,
      bathrooms: 5,
      carpetArea: 4200,
      builtUpArea: 4850,
      plotArea: 6000,
      furnishing: "Fully-Furnished",
      parking: 3,
      floorInfo: "G+2",
      facing: "West",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "4-5 years",
      sellerId: sunita.id,
      status: "PUBLISHED",
      featured: true,
      views: 401,
      images: [img("villa-ext.png"), img("villa-int.png"), img("ap-living.png"), img("pool.png")],
      amenities: ["Power Backup", "Lift", "Swimming Pool", "Gym", "24x7 Security", "CCTV Surveillance", "Modular Kitchen", "Servant Room", "Balcony", "Gated Community", "Landscaped Gardens"],
      createdDaysAgo: 40,
    },
    {
      title: "Ready 3 BHK at Sthirya The Nest, Sector 150 Noida",
      slug: "ready-3bhk-the-nest-sector-150-noida",
      description:
        "A 3 BHK at The Nest in Sector 150, Noida's greenest sector. Corner unit with park-facing views, modular kitchen, and covered terrace. The community offers a 5-acre central park, cycling loop and sports facilities. Expected completion March 2027.",
      type: "Apartment",
      price: 12500000,
      city: "Noida",
      state: "Uttar Pradesh",
      locality: "Sector 150",
      address: "Sthirya The Nest, Sector 150, Noida 201310",
      lat: 28.41,
      lng: 77.52,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1290,
      builtUpArea: 1540,
      furnishing: "Unfurnished",
      parking: 1,
      floorInfo: "4 of 13",
      facing: "North-East",
      constructionStatus: "UNDER_CONSTRUCTION",
      possessionDate: "Mar 2027",
      sellerId: meera.id,
      builderId: sthirya.id,
      projectId: nest.id,
      status: "PUBLISHED",
      views: 145,
      images: [img("ap-building.png"), img("ap-living.png"), img("pool.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "Children's Play Area", "24x7 Security", "Car Parking", "Landscaped Gardens"],
      createdDaysAgo: 28,
    },
    {
      title: "Signature 4 BHK on Golf Course Road, Gurugram",
      slug: "signature-4bhk-golf-course-road-gurugram",
      description:
        "A signature 4 BHK on Golf Course Road with a 26 ft. wide living room, staff quarters and a wrap-around balcony. The 22-storey tower offers concierge services, a sky lounge and is minutes from DLF CyberHub and premium schools.",
      type: "Apartment",
      price: 42000000,
      city: "Gurugram",
      state: "Haryana",
      locality: "Golf Course Road",
      address: "The Camellias Gate 2, Golf Course Road, Gurugram 122002",
      lat: 28.46,
      lng: 77.1,
      bhk: 4,
      bathrooms: 5,
      carpetArea: 2600,
      builtUpArea: 3100,
      furnishing: "Semi-Furnished",
      parking: 2,
      floorInfo: "15 of 22",
      facing: "South-East",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "2-4 years",
      sellerId: vikram.id,
      status: "PUBLISHED",
      featured: true,
      views: 388,
      images: [img("ap-living.png"), img("ap-kitchen.png"), img("ap-balcony.png"), img("ap-building.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "24x7 Security", "CCTV Surveillance", "Intercom", "Modular Kitchen", "Servant Room", "Balcony", "Car Parking"],
      createdDaysAgo: 30,
    },
    {
      title: "Independent 3 BHK House in Noida Sector 45",
      slug: "independent-3bhk-house-sector-45-noida",
      description:
        "An independent 3 BHK house on a 200 sq. yd. plot in Sector 45, Noida. Recently renovated with a new modular kitchen, Italian marble on the ground floor and a first-floor family lounge. Private parking for two cars and a landscaped front yard.",
      type: "Independent House",
      price: 24000000,
      city: "Noida",
      state: "Uttar Pradesh",
      locality: "Sector 45",
      address: "H-Block, Sector 45, Noida 201301",
      lat: 28.57,
      lng: 77.34,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1650,
      builtUpArea: 1950,
      plotArea: 1800,
      furnishing: "Semi-Furnished",
      parking: 2,
      floorInfo: "G+1",
      facing: "East",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "10+ years",
      sellerId: vikram.id,
      status: "PUBLISHED",
      views: 121,
      images: [img("house-ext.png"), img("ap-living.png"), img("ap-bedroom.png")],
      amenities: ["Power Backup", "24x7 Security", "Modular Kitchen", "Car Parking", "Landscaped Gardens"],
      createdDaysAgo: 22,
    },
    {
      title: "Charming Independent House in Adyar, Chennai",
      slug: "charming-independent-house-adyar-chennai",
      description:
        "A classic independent house in Adyar, Chennai, on a tree-lined street minutes from the Theosophical Society. Renovated bathrooms and electricals, teak wood doors, and a beautiful rear garden with a sit-out. Walk to Adyar signal and Bessy beach.",
      type: "Independent House",
      price: 28500000,
      city: "Chennai",
      state: "Tamil Nadu",
      locality: "Adyar",
      address: "2nd Cross Street, Shastri Nagar, Adyar, Chennai 600020",
      lat: 13.0,
      lng: 80.25,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1500,
      builtUpArea: 1800,
      plotArea: 2000,
      furnishing: "Semi-Furnished",
      parking: 2,
      floorInfo: "G+1",
      facing: "North-East",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "10+ years",
      sellerId: sunita.id,
      status: "PUBLISHED",
      views: 154,
      images: [img("house-ext.png"), img("ap-living.png"), img("ap-balcony.png")],
      amenities: ["Power Backup", "24x7 Security", "Car Parking", "Landscaped Gardens", "Gated Community"],
      createdDaysAgo: 26,
    },
    {
      title: "Spacious 3 BHK in New Town, Kolkata",
      slug: "spacious-3bhk-new-town-kolkata",
      description:
        "A well-ventilated 3 BHK in New Town's Action Area 1, with views of the wetlands. Corner flat with cross ventilation, large utility balcony and covered parking. Close to the airport, Salt Lake Sector V and top schools.",
      type: "Flat",
      price: 9800000,
      city: "Kolkata",
      state: "West Bengal",
      locality: "New Town",
      address: "AA-1, New Town, Kolkata 700156",
      lat: 22.58,
      lng: 88.46,
      bhk: 3,
      bathrooms: 2,
      carpetArea: 1150,
      builtUpArea: 1320,
      furnishing: "Unfurnished",
      parking: 1,
      floorInfo: "5 of 9",
      facing: "South",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "5-7 years",
      sellerId: sunita.id,
      status: "PUBLISHED",
      views: 87,
      images: [img("ap-living.png"), img("ap-bedroom.png"), img("ap-kitchen.png")],
      amenities: ["Power Backup", "Lift", "24x7 Security", "Intercom", "Car Parking", "Children's Play Area"],
      createdDaysAgo: 14,
    },
    {
      title: "Heritage-Style 4 BHK House in Vaishali Nagar, Jaipur",
      slug: "heritage-style-4bhk-vaishali-nagar-jaipur",
      description:
        "A thoughtfully designed 4 BHK house in Vaishali Nagar blending Rajasthani craft with modern comfort — jharokha-inspired balconies, a courtyard plan and sandstone accents. Walking distance to Central Park and Jaipur's best cafes.",
      type: "Independent House",
      price: 13500000,
      city: "Jaipur",
      state: "Rajasthan",
      locality: "Vaishali Nagar",
      address: "Sector 5, Vaishali Nagar, Jaipur 302021",
      lat: 26.92,
      lng: 75.74,
      bhk: 4,
      bathrooms: 4,
      carpetArea: 1850,
      builtUpArea: 2200,
      plotArea: 2250,
      furnishing: "Semi-Furnished",
      parking: 2,
      floorInfo: "G+1",
      facing: "North",
      constructionStatus: "READY_TO_MOVE",
      ageOfProperty: "3-5 years",
      sellerId: vikram.id,
      status: "DRAFT",
      views: 0,
      images: [img("house-ext.png"), img("ap-living.png")],
      amenities: ["Power Backup", "24x7 Security", "Modular Kitchen", "Car Parking", "Landscaped Gardens"],
      createdDaysAgo: 3,
    },
    {
      title: "Meridian Skyline — 3 BHK Park-Facing Residence (Sold)",
      slug: "meridian-skyline-3bhk-park-facing-bengaluru",
      description:
        "A park-facing 3 BHK at Meridian Skyline with views over the 2-acre central greens. Corner unit with extended deck, premium finishes and two covered parkings. Scheduled for completion by December 2026.",
      type: "Apartment",
      price: 14800000,
      city: "Bengaluru",
      state: "Karnataka",
      locality: "Whitefield",
      address: "Meridian Skyline, Whitefield Main Road, Bengaluru 560066",
      lat: 12.97,
      lng: 77.73,
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1290,
      builtUpArea: 1560,
      furnishing: "Unfurnished",
      parking: 2,
      floorInfo: "6 of 21",
      facing: "North",
      constructionStatus: "UNDER_CONSTRUCTION",
      possessionDate: "Dec 2026",
      sellerId: kabir.id,
      builderId: meridian.id,
      projectId: skyline.id,
      status: "PUBLISHED",
      availability: "SOLD",
      views: 233,
      images: [img("facade.png"), img("ap-living.png"), img("township.png")],
      amenities: ["Power Backup", "Lift", "Clubhouse", "Swimming Pool", "Gym", "24x7 Security", "Balcony", "Car Parking"],
      createdDaysAgo: 35,
    },
  ];

  const createdProps: Record<string, string> = {};
  for (const p of props) {
    const property = await db.property.create({
      data: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        type: p.type,
        price: p.price,
        city: p.city,
        state: p.state,
        locality: p.locality,
        address: p.address,
        latitude: p.lat,
        longitude: p.lng,
        bhk: p.bhk,
        bathrooms: p.bathrooms,
        carpetArea: p.carpetArea,
        builtUpArea: p.builtUpArea,
        plotArea: p.plotArea,
        furnishing: p.furnishing,
        parking: p.parking ?? 0,
        floorInfo: p.floorInfo,
        facing: p.facing,
        constructionStatus: p.constructionStatus ?? "READY_TO_MOVE",
        possessionDate: p.possessionDate,
        ageOfProperty: p.ageOfProperty,
        sellerId: p.sellerId,
        builderId: p.builderId,
        projectId: p.projectId,
        status: p.status,
        availability: p.availability ?? (p.status === "PUBLISHED" ? "AVAILABLE" : "AVAILABLE"),
        featured: p.featured ?? false,
        views: p.views,
        createdAt: days(-p.createdDaysAgo),
        images: {
          create: p.images.map((url, i) => ({ url, isMain: i === 0, sortOrder: i })),
        },
        amenities: {
          create: p.amenities.map((name) => ({ name })),
        },
      },
    });
    createdProps[p.slug] = property.id;
  }

  console.log("Creating agreements...");
  const builderAgreementMeridian = await db.builderAgreement.create({
    data: {
      reference: "VAS-AGR-BLD-2025-0001",
      builderId: meridian.id,
      commissionType: "PERCENTAGE",
      commissionRate: 1.0,
      startDate: days(-240),
      status: "ACTIVE",
      notes: "Channel partner agreement — 1% of sale value on platform-attributed bookings.",
    },
  });
  await db.builderAgreement.create({
    data: {
      reference: "VAS-AGR-BLD-2025-0002",
      builderId: sthirya.id,
      commissionType: "PERCENTAGE",
      commissionRate: 1.25,
      startDate: days(-190),
      status: "ACTIVE",
      notes: "Channel partner agreement — 1.25% of sale value on platform-attributed bookings.",
    },
  });
  const sellerAgreementSunita = await db.sellerAgreement.create({
    data: {
      reference: "VAS-AGR-SLR-2025-0001",
      sellerId: sunita.id,
      commissionType: "FIXED",
      fixedFee: 50000,
      startDate: days(-150),
      status: "ACTIVE",
      notes: "Fixed referral fee per successfully closed sale.",
    },
  });
  const sellerAgreementVikram = await db.sellerAgreement.create({
    data: {
      reference: "VAS-AGR-SLR-2025-0002",
      sellerId: vikram.id,
      commissionType: "PERCENTAGE",
      commissionRate: 1.0,
      startDate: days(-120),
      status: "ACTIVE",
      notes: "1% of sale value on platform-attributed transactions.",
    },
  });

  console.log("Creating leads...");
  type LeadSeed = {
    slug: string;
    name: string;
    phone: string;
    email: string;
    budget?: number;
    message?: string;
    status: string;
    buyerId?: string;
    assigned?: boolean;
    followUpDays?: number;
    lastContactedDays?: number;
    createdDaysAgo: number;
    reference: string;
  };

  const leadSeeds: LeadSeed[] = [
    {
      slug: "premium-3bhk-verdant-court-gachibowli-hyderabad",
      name: "Priya Sharma",
      phone: "+91 98330 44556",
      email: "buyer@vasati.in",
      budget: 18000000,
      message: "Interested in a ready-to-move 3 BHK. Would like to know the final price including registration.",
      status: "QUALIFIED",
      buyerId: priya.id,
      assigned: true,
      followUpDays: 1,
      lastContactedDays: -2,
      createdDaysAgo: 12,
      reference: "VAS-2025-000421",
    },
    {
      slug: "sunlit-3bhk-apartment-powai-mumbai",
      name: "Rohan Iyer",
      phone: "+91 99001 77889",
      email: "rohan@example.in",
      budget: 35000000,
      message: "Looking for a lake-facing unit with 2 parkings. Is the price negotiable?",
      status: "SITE_VISIT_SCHEDULED",
      buyerId: rohan.id,
      assigned: true,
      followUpDays: 3,
      lastContactedDays: -1,
      createdDaysAgo: 9,
      reference: "VAS-2025-000435",
    },
    {
      slug: "meridian-skyline-3bhk-whitefield-bengaluru",
      name: "Ananya Reddy",
      phone: "+91 90080 22110",
      email: "ananya.reddy@example.in",
      budget: 16000000,
      message: "Want details on the sky deck 3 BHK and current launch offers.",
      status: "NEGOTIATION",
      assigned: true,
      followUpDays: 2,
      lastContactedDays: -1,
      createdDaysAgo: 20,
      reference: "VAS-2025-000377",
    },
    {
      slug: "meridian-skyline-3bhk-park-facing-bengaluru",
      name: "Karthik Subramanian",
      phone: "+91 98860 71234",
      email: "karthik.s@example.in",
      budget: 15000000,
      message: "Booked a park-facing 3 BHK after visiting through the platform.",
      status: "CONVERTED",
      assigned: true,
      lastContactedDays: -10,
      createdDaysAgo: 31,
      reference: "VAS-2025-000312",
    },
    {
      slug: "architectural-4bhk-villa-jubilee-hills-hyderabad",
      name: "Nikhil Chandrasekhar",
      phone: "+91 99590 88221",
      email: "nikhil.c@example.in",
      budget: 60000000,
      message: "Would like a private viewing this weekend.",
      status: "CONTACTED",
      assigned: true,
      followUpDays: 4,
      lastContactedDays: -3,
      createdDaysAgo: 8,
      reference: "VAS-2025-000449",
    },
    {
      slug: "signature-4bhk-golf-course-road-gurugram",
      name: "Sneha Kulkarni",
      phone: "+91 98730 55402",
      email: "sneha.k@example.in",
      budget: 45000000,
      message: "Please share the floor plan and clubhouse details.",
      status: "NEW",
      createdDaysAgo: 1,
      reference: "VAS-2025-000462",
    },
    {
      slug: "elegant-3bhk-koregaon-park-pune",
      name: "Aditya Menon",
      phone: "+91 90280 41178",
      email: "aditya.menon@example.in",
      budget: 20000000,
      message: "Need a north-facing unit if available.",
      status: "LOST",
      assigned: true,
      lastContactedDays: -14,
      createdDaysAgo: 26,
      reference: "VAS-2025-000338",
    },
    {
      slug: "ready-3bhk-the-nest-sector-150-noida",
      name: "Divya Bansal",
      phone: "+91 98110 90034",
      email: "divya.b@example.in",
      budget: 13000000,
      message: "Ready to book — please confirm the unit hold process and payment schedule.",
      status: "BOOKING",
      assigned: true,
      followUpDays: 1,
      lastContactedDays: -1,
      createdDaysAgo: 15,
      reference: "VAS-2025-000395",
    },
    {
      slug: "landmark-4bhk-residence-bandra-west-mumbai",
      name: "Farhan Qureshi",
      phone: "+91 99870 12306",
      email: "farhan.q@example.in",
      budget: 80000000,
      message: "Interested in the sea-glimpse wrap-around balcony unit.",
      status: "SITE_VISIT_COMPLETED",
      assigned: true,
      lastContactedDays: -4,
      createdDaysAgo: 18,
      reference: "VAS-2025-000360",
    },
  ];

  const leadIds: Record<string, string> = {};
  for (const l of leadSeeds) {
    const propertyId = createdProps[l.slug];
    const prop = await db.property.findUnique({ where: { id: propertyId }, select: { title: true } });
    const lead = await db.lead.create({
      data: {
        reference: l.reference,
        propertyId,
        buyerId: l.buyerId,
        name: l.name,
        phone: l.phone,
        email: l.email,
        budget: l.budget,
        message: l.message,
        status: l.status,
        assignedToId: l.assigned ? admin.id : null,
        followUpDate: l.followUpDays != null ? days(l.followUpDays) : null,
        lastContactedAt: l.lastContactedDays != null ? days(-l.lastContactedDays) : null,
        createdAt: days(-l.createdDaysAgo),
        activities: {
          create: [
            { type: "SYSTEM", note: `Enquiry received via website for "${prop?.title}"`, createdAt: days(-l.createdDaysAgo) },
            ...(l.status !== "NEW"
              ? [
                  {
                    type: "STATUS_CHANGE",
                    userId: admin.id,
                    note: `Status updated to ${l.status.replace(/_/g, " ").toLowerCase()}`,
                    createdAt: days(-l.createdDaysAgo + 1),
                  },
                ]
              : []),
            ...(l.assigned
              ? [
                  {
                    type: "ASSIGNMENT",
                    userId: admin.id,
                    note: "Lead assigned to Arjun Nair",
                    createdAt: days(-l.createdDaysAgo + 1),
                  },
                ]
              : []),
          ],
        },
      },
    });
    leadIds[l.reference] = lead.id;
  }

  console.log("Creating site visits...");
  await db.siteVisit.create({
    data: {
      propertyId: createdProps["premium-3bhk-verdant-court-gachibowli-hyderabad"],
      buyerId: priya.id,
      leadId: leadIds["VAS-2025-000421"],
      preferredDate: days(3),
      preferredTime: "11:00 AM",
      contactName: "Priya Sharma",
      contactPhone: "+91 98330 44556",
      status: "CONFIRMED",
      notes: "Buyer confirmed; sales desk to arrange clubhouse tour as well.",
    },
  });
  await db.siteVisit.create({
    data: {
      propertyId: createdProps["sunlit-3bhk-apartment-powai-mumbai"],
      buyerId: rohan.id,
      leadId: leadIds["VAS-2025-000435"],
      preferredDate: days(5),
      preferredTime: "04:00 PM",
      contactName: "Rohan Iyer",
      contactPhone: "+91 99001 77889",
      status: "REQUESTED",
    },
  });
  await db.siteVisit.create({
    data: {
      propertyId: createdProps["landmark-4bhk-residence-bandra-west-mumbai"],
      leadId: leadIds["VAS-2025-000360"],
      preferredDate: days(-4),
      preferredTime: "12:00 PM",
      contactName: "Farhan Qureshi",
      contactPhone: "+91 99870 12306",
      status: "COMPLETED",
      notes: "Visited with family; liked the unit, negotiating on parking.",
    },
  });
  await db.siteVisit.create({
    data: {
      propertyId: createdProps["architectural-4bhk-villa-jubilee-hills-hyderabad"],
      leadId: leadIds["VAS-2025-000449"],
      preferredDate: days(7),
      preferredTime: "10:00 AM",
      contactName: "Nikhil Chandrasekhar",
      contactPhone: "+91 99590 88221",
      status: "REQUESTED",
    },
  });

  console.log("Creating transaction + commission...");
  const convertedLead = await db.lead.findUnique({ where: { id: leadIds["VAS-2025-000312"] } });
  const soldProp = await db.property.findUnique({
    where: { id: createdProps["meridian-skyline-3bhk-park-facing-bengaluru"] },
  });
  const transaction = await db.transaction.create({
    data: {
      reference: "VAS-TXN-2025-0007",
      leadId: convertedLead?.id,
      propertyId: soldProp!.id,
      buyerId: null,
      sellerId: soldProp!.sellerId,
      builderId: soldProp!.builderId!,
      saleValue: 14800000,
      bookingDate: days(-11),
      agreementRef: "MSKY-BKNG-0442",
      status: "COMPLETED",
      completionDate: days(-2),
      notes: "Booking confirmed through platform-attributed lead VAS-2025-000312.",
      commission: {
        create: {
          builderAgreementId: builderAgreementMeridian.id,
          commissionType: "PERCENTAGE",
          rate: 1.0,
          amount: 148000,
          dueDate: days(18),
          paidAmount: 80000,
          status: "PARTIAL",
          payments: {
            create: [
              {
                amount: 80000,
                paidOn: days(-5),
                method: "BANK_TRANSFER",
                reference: "UTR/AXIS/889124",
                recordedById: admin.id,
              },
            ],
          },
        },
      },
    },
  });

  console.log("Creating favourites...");
  await db.favourite.createMany({
    data: [
      { userId: priya.id, propertyId: createdProps["premium-3bhk-verdant-court-gachibowli-hyderabad"] },
      { userId: priya.id, propertyId: createdProps["sunlit-3bhk-apartment-powai-mumbai"] },
      { userId: priya.id, propertyId: createdProps["signature-4bhk-golf-course-road-gurugram"] },
      { userId: rohan.id, propertyId: createdProps["sunlit-3bhk-apartment-powai-mumbai"] },
    ],
  });

  console.log("Creating featured listings...");
  for (const slug of [
    "sunlit-3bhk-apartment-powai-mumbai",
    "premium-3bhk-verdant-court-gachibowli-hyderabad",
    "architectural-4bhk-villa-jubilee-hills-hyderabad",
    "signature-4bhk-golf-course-road-gurugram",
  ]) {
    await db.featuredListing.create({
      data: {
        propertyId: createdProps[slug],
        package: "FEATURED",
        startDate: days(-20),
        endDate: days(10),
        amount: 2500,
        isActive: true,
      },
    });
  }

  console.log("Creating notifications...");
  await db.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: "New enquiry received",
        message: "Sneha Kulkarni enquired about Signature 4 BHK on Golf Course Road.",
        type: "ENQUIRY",
        link: "#/dashboard?tab=leads",
      },
      {
        userId: admin.id,
        title: "Listing pending approval",
        message: "Modern 2 BHK in Baner with Club Facilities was submitted for review.",
        type: "LISTING",
        link: "#/dashboard?tab=properties",
      },
      {
        userId: admin.id,
        title: "Project pending approval",
        message: "Sthirya The Nest (Sector 150, Noida) is awaiting review.",
        type: "LISTING",
        link: "#/dashboard?tab=projects",
      },
      {
        userId: admin.id,
        title: "Site visit requested",
        message: "Rohan Iyer requested a visit for the Powai 3 BHK.",
        type: "VISIT",
        link: "#/dashboard?tab=visits",
      },
      {
        userId: sunita.id,
        title: "New enquiry on your listing",
        message: "Priya Sharma enquired about your 3 BHK in Gachibowli.",
        type: "ENQUIRY",
        link: "#/dashboard?tab=enquiries",
      },
      {
        userId: priya.id,
        title: "Site visit confirmed",
        message: "Your visit to Sthirya Verdant Court, Gachibowli has been confirmed.",
        type: "VISIT",
        link: "#/dashboard?tab=visits",
      },
      {
        userId: kabir.id,
        title: "Transaction recorded",
        message: "A booking at Meridian Skyline was confirmed via platform lead VAS-2025-000312.",
        type: "TRANSACTION",
        link: "#/dashboard",
      },
    ],
  });

  console.log("Creating audit logs...");
  await db.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "BUILDER_VERIFIED",
        entity: "USER",
        entityId: kabir.id,
        details: "Meridian Developers verified after document review.",
      },
      {
        userId: admin.id,
        action: "LISTING_APPROVED",
        entity: "PROPERTY",
        entityId: createdProps["ready-3bhk-the-nest-sector-150-noida"],
        details: "Listing approved and published.",
      },
      {
        userId: admin.id,
        action: "TRANSACTION_CREATED",
        entity: "TRANSACTION",
        entityId: transaction.id,
        details: "Sale value ₹1,48,00,000; commission 1% per agreement VAS-AGR-BLD-2025-0001.",
      },
      {
        userId: admin.id,
        action: "COMMISSION_PAYMENT_RECORDED",
        entity: "COMMISSION",
        details: "₹80,000 received via bank transfer (UTR/AXIS/889124).",
      },
    ],
  });

  console.log("Creating contact message + settings...");
  await db.contactMessage.create({
    data: {
      name: "Ramesh Gupta",
      email: "ramesh.g@example.in",
      phone: "+91 98730 10001",
      subject: "Listing my property",
      message: "I own a 3 BHK in Sector 82, Gurugram and would like to list it on Gwalior Property Hub.",
    },
  });
  await db.setting.createMany({
    data: [
      { key: "site.supportEmail", value: "support@gwaliorpropertyhub.in" },
      { key: "site.supportPhone", value: "+91 80 4718 2200" },
      { key: "commission.defaultRate", value: "1.0" },
      { key: "listings.autoPublish", value: "false" },
    ],
  });

  const counts = {
    users: await db.user.count(),
    builders: await db.builder.count(),
    projects: await db.project.count(),
    properties: await db.property.count(),
    leads: await db.lead.count(),
    visits: await db.siteVisit.count(),
    transactions: await db.transaction.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
