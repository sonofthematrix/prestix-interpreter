#!/usr/bin/env tsx
/**
 * Seed Script: Sample Event Reviews
 * 
 * Adds sample reviews for testing the event reviews system.
 * Run this AFTER the migration script has completed.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedEventReviews() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding sample event reviews...\n');

    // Check if event_reviews table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'event_reviews'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ event_reviews table does not exist!');
      console.log('💡 Please run the migration script first:');
      console.log('   bunx tsx scripts/migrate-event-reviews-system.ts\n');
      process.exit(1);
    }

    // Get a sample ticket
    const ticketResult = await client.query(`
      SELECT id, name FROM venue_tickets WHERE "isActive" = true LIMIT 1
    `);

    if (ticketResult.rows.length === 0) {
      console.log('⚠️  No active tickets found. Please create some events first.');
      return;
    }

    const ticket = ticketResult.rows[0];
    console.log(`📋 Using ticket: ${ticket.name} (${ticket.id})\n`);

    // Get sample users
    const usersResult = await client.query(`
      SELECT id, name FROM users LIMIT 5
    `);

    if (usersResult.rows.length === 0) {
      console.log('⚠️  No users found. Please create some users first.');
      return;
    }

    const users = usersResult.rows;

    const sampleReviews = [
      {
        rating: 5,
        title: 'Absolutely incredible night!',
        comment: 'This was hands down the best event I\'ve attended this year. The DJ lineup was phenomenal, the venue atmosphere was electric, and the promoter team ensured everything ran smoothly. The VIP area exceeded expectations and the bottle service was top-notch. Will definitely be back for future events!',
      },
      {
        rating: 4,
        title: 'Great experience overall',
        comment: 'Had a fantastic time at this event. The music was great and the crowd was energetic. The venue is beautiful and well-maintained. Only minor issue was the wait at the bar during peak times, but that\'s expected for popular events. Would recommend!',
      },
      {
        rating: 5,
        title: 'Worth every penny',
        comment: 'Fantastic event! The promoter really knows how to throw a party. From the moment we arrived, we felt like VIPs. The lineup was stacked with talented artists and the sound system was incredible. Can\'t wait for the next one!',
      },
      {
        rating: 4,
        title: 'Solid night out',
        comment: 'Good event with great music and vibes. The venue staff was friendly and professional. The only reason for 4 stars instead of 5 is that it got a bit too crowded around midnight, but overall a memorable night.',
      },
      {
        rating: 5,
        title: 'Best party in town!',
        comment: 'This promoter never disappoints! Every event is better than the last. The attention to detail, the carefully curated lineup, and the overall production quality is unmatched. If you see this promoter hosting an event, don\'t think twice - just go!',
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < Math.min(users.length, sampleReviews.length); i++) {
      const user = users[i];
      const reviewData = sampleReviews[i];

      // Check if review already exists
      const existingReview = await client.query(`
        SELECT id FROM event_reviews 
        WHERE ticket_id = $1 AND user_id = $2
      `, [ticket.id, user.id]);

      if (existingReview.rows.length > 0) {
        console.log(`⏭️  Review already exists for user ${user.name} - skipping`);
        skippedCount++;
        continue;
      }

      // Check if user has a booking (for verified purchase badge)
      const bookingResult = await client.query(`
        SELECT id FROM venue_bookings
        WHERE "ticketId" = $1 AND "memberId" = $2 AND status IN ('COMPLETED', 'CONFIRMED')
        LIMIT 1
      `, [ticket.id, user.id]);

      const booking = bookingResult.rows[0];
      const isVerifiedPurchase = !!booking;

      // Generate review ID
      const reviewId = `rev_${randomBytes(12).toString('hex')}`;

      // Create review
      await client.query(`
        INSERT INTO event_reviews (
          id, ticket_id, user_id, rating, title, comment,
          booking_id, is_verified_purchase, is_approved, approved_at,
          approved_by, helpful_count, unhelpful_count,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        reviewId,
        ticket.id,
        user.id,
        reviewData.rating,
        reviewData.title,
        reviewData.comment,
        booking?.id || null,
        isVerifiedPurchase,
        true, // Auto-approve for seed data
        new Date(),
        'system',
        Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 3),
        new Date(),
        new Date(),
      ]);

      console.log(`✅ Created ${reviewData.rating}-star review by ${user.name}`);
      createdCount++;
    }

    console.log(`\n📊 Seeding Summary:`);
    console.log(`  - Created: ${createdCount} reviews`);
    console.log(`  - Skipped: ${skippedCount} (already exist)`);
    console.log(`  - Ticket: ${ticket.name}`);
    console.log(`\n🎉 Sample reviews seeded successfully!`);

  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await seedEventReviews();
  } catch (error: any) {
    console.error('💥 Seed script failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
