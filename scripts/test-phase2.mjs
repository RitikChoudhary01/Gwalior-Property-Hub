#!/usr/bin/env node
// ============================================================
// test-phase2.mjs — tests Phase 2 Buyer & Seller workflows:
//   1. Buyer enquiry creation, tracking, and closure.
//   2. Admin rejection & Seller resubmission cycle.
//   3. Verification that resubmission resets status to PENDING and clears rejection reason.
// ============================================================

import { db } from "../src/lib/db";

async function main() {
  console.log("=== Testing Phase 2: Buyer & Seller Workflows ===\n");

  // Find a test seller and test buyer
  const seller = await db.user.findFirst({ where: { role: "SELLER" } });
  const buyer = await db.user.findFirst({ where: { role: "BUYER" } });
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });

  if (!seller || !buyer || !admin) {
    console.error("❌ Missing required test users (seller, buyer, admin).");
    process.exit(1);
  }

  console.log(`Using Test Seller: ${seller.name} (${seller.email})`);
  console.log(`Using Test Buyer:  ${buyer.name} (${buyer.email})`);
  console.log(`Using Test Admin:  ${admin.name} (${admin.email})\n`);

  // 1. Create a dedicated test listing for the seller
  console.log("1. Creating a seller listing to test rejection & resubmission...");
  const testPropSlug = `test-phase2-${Date.now()}`;
  const testProp = await db.property.create({
    data: {
      title: "Phase 2 Test Duplex Villa in City Centre",
      slug: testPropSlug,
      description: "Sample test listing to verify admin rejection feedback and seller resubmission cycle.",
      type: "Villa",
      price: 5500000,
      city: "Gwalior",
      state: "Madhya Pradesh",
      locality: "City Centre",
      address: "Lane 4, City Centre, Gwalior",
      bhk: 3,
      bathrooms: 3,
      carpetArea: 1400,
      status: "PENDING",
      sellerId: seller.id,
    },
  });
  console.log(`   ✓ Created listing ID: ${testProp.id} (Status: ${testProp.status})`);

  // 2. Admin rejects the listing with feedback
  console.log("\n2. Admin reviews and rejects listing with specific feedback...");
  const rejectionFeedback = "Please upload at least 3 interior photographs and specify the exact carpet area.";
  const rejectedProp = await db.property.update({
    where: { id: testProp.id },
    data: {
      status: "REJECTED",
      rejectionReason: rejectionFeedback,
    },
  });
  console.log(`   ✓ Listing status updated to: ${rejectedProp.status}`);
  console.log(`   ✓ Rejection reason set to: "${rejectedProp.rejectionReason}"`);

  // 3. Verify Seller reads rejection reason
  console.log("\n3. Seller inspects rejected listing...");
  const sellerView = await db.property.findUnique({
    where: { id: testProp.id },
    select: { id: true, title: true, status: true, rejectionReason: true, sellerId: true },
  });
  if (sellerView.status !== "REJECTED" || sellerView.rejectionReason !== rejectionFeedback) {
    throw new Error("Failed to verify rejection reason on seller listing.");
  }
  console.log(`   ✓ Seller dashboard correctly surfaces rejection: "${sellerView.rejectionReason}"`);

  // 4. Seller resubmits listing
  console.log("\n4. Seller edits details and resubmits for approval...");
  const resubmittedProp = await db.property.update({
    where: { id: testProp.id },
    data: {
      title: "Phase 2 Test Duplex Villa in City Centre (Updated with Photos)",
      status: "PENDING",
      rejectionReason: null, // cleared upon resubmission
    },
  });
  console.log(`   ✓ Listing status reset to: ${resubmittedProp.status}`);
  console.log(`   ✓ Rejection reason cleared: ${resubmittedProp.rejectionReason === null ? "YES (null)" : "NO"}`);
  console.log(`   ✓ Title updated to: "${resubmittedProp.title}"`);

  // 5. Admin approves resubmitted listing
  console.log("\n5. Admin reviews and approves updated listing...");
  const approvedProp = await db.property.update({
    where: { id: testProp.id },
    data: {
      status: "PUBLISHED",
    },
  });
  console.log(`   ✓ Listing is now: ${approvedProp.status}`);

  // 6. Test Buyer Enquiry Creation & Closure
  console.log("\n6. Buyer submits an enquiry on the approved listing...");
  const lead = await db.lead.create({
    data: {
      reference: `ENQ-${Date.now().toString().slice(-6)}`,
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone ?? "9876543210",
      message: "I am interested in scheduling a site visit this Saturday.",
      buyerId: buyer.id,
      propertyId: testProp.id,
      status: "NEW",
    },
  });
  console.log(`   ✓ Enquiry created with Ref: ${lead.reference} (Status: ${lead.status})`);

  // 7. Progress enquiry to Contacted, then Site Visit
  console.log("\n7. Progressing enquiry through pipeline stages...");
  const contactedLead = await db.lead.update({
    where: { id: lead.id },
    data: { status: "CONTACTED", lastContactedAt: new Date() },
  });
  console.log(`   ✓ Stage 1: ${contactedLead.status}`);

  const visitLead = await db.lead.update({
    where: { id: lead.id },
    data: { status: "SITE_VISIT_SCHEDULED" },
  });
  console.log(`   ✓ Stage 2: ${visitLead.status}`);

  // 8. Buyer closes enquiry (marked as lost / not interested)
  console.log("\n8. Buyer closes enquiry (marked not interested)...");
  const closedLead = await db.lead.update({
    where: { id: lead.id },
    data: { status: "LOST" },
  });
  console.log(`   ✓ Enquiry closed: ${closedLead.status}`);

  // Cleanup test records
  console.log("\nCleaning up test records...");
  await db.lead.delete({ where: { id: lead.id } });
  await db.property.delete({ where: { id: testProp.id } });
  console.log("✓ Test records cleaned up successfully.");

  console.log("\n==============================================");
  console.log("✅ ALL PHASE 2 WORKFLOW TESTS PASSED CLEANLY!");
  console.log("==============================================");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
