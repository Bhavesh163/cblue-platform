const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.subscriber.findMany({ select: { email: true }});
  console.log("Subscribers:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
