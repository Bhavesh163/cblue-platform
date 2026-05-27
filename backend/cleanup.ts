#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('Starting cleanup of demo/test data...\n');

    // 1. Delete PropertyInquiry records for PRE-2605 POs
    const preInquiries = await prisma.propertyInquiry.deleteMany({
      where: {
        poNumber: {
          in: [
            'PRE-2605-2622',
            'PRE-2605-9968',
            'PRE-2605-2386',
            'PRE-2605-3964',
            'PRE-2605-4985',
            'PRE-2605-5592',
            'PRE-2605-3437',
            'PRE-2605-8356',
            'PRE-2605-8421',
          ],
        },
      },
    });
    console.log(`✓ Deleted ${preInquiries.count} property inquiries (PRE-2605-* POs)`);

    // 2. Delete Order record for PO-2605-8909
    const orders = await prisma.order.deleteMany({
      where: {
        po: 'PO-2605-8909',
      },
    });
    console.log(`✓ Deleted ${orders.count} orders (PO-2605-8909)`);

    // 3. Delete 3 home office properties and their images
    const properties = await prisma.property.findMany({
      where: {
        title: {
          contains: 'home office',
          mode: 'insensitive',
        },
        province: 'กรุงเทพมหานคร',
      },
      take: 3,
    });

    if (properties.length > 0) {
      // Delete images first (due to foreign key)
      await prisma.propertyImage.deleteMany({
        where: {
          propertyId: {
            in: properties.map(p => p.id),
          },
        },
      });

      // Delete properties
      const deletedProps = await prisma.property.deleteMany({
        where: {
          id: {
            in: properties.map(p => p.id),
          },
        },
      });
      console.log(`✓ Deleted ${deletedProps.count} properties (home office listings)`);
    } else {
      console.log(`✓ No home office properties found to delete`);
    }

    console.log('\n✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
