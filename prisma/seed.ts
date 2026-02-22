import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("ChangeMe123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@pilotfsm.test" },
    update: {
      passwordHash: password,
    },
    create: {
      name: "Admin User",
      email: "admin@pilotfsm.test",
      passwordHash: password,
      role: "ADMIN",
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: "driver@pilotfsm.test" },
    update: {
      passwordHash: password,
    },
    create: {
      name: "Field Driver",
      email: "driver@pilotfsm.test",
      passwordHash: password,
      role: "DRIVER",
    },
  });

  // Ensure global settings exist
  const settings = await prisma.globalSetting.findFirst();
  if (!settings) {
    await prisma.globalSetting.create({
      data: {
        companyName: "Pilot Field Service Pro",
        defaultCurrency: "GBP",
      },
    });
  }

  const customer =
    (await prisma.customer.findFirst({ where: { email: "client@acme.test" } })) ??
    (await prisma.customer.create({
      data: {
        name: "Sarah Client",
        company: "Acme Storage",
        email: "client@acme.test",
        phone: "+44 20 1234 5678",
        addressLine: "12 Fleet Street",
        city: "London",
        postcode: "EC4Y 1AA",
        country: "GB",
        vatStatus: "STANDARD",
        createdById: admin.id,
      },
    }));

  await prisma.job.upsert({
    where: { reference: "JOB-SEED-001" },
    update: {},
    create: {
      reference: "JOB-SEED-001",
      customerId: customer.id,
      deliveryAddress: "12 Fleet Street, London",
      serviceDate: new Date(),
      assignedStaffId: driver.id,
      createdById: admin.id,
      status: "SCHEDULED",
      lineItems: {
        create: [
          {
            description: "Trailer delivery",
            quantity: 1,
            unitPrice: 64.8,
            vatCode: "STANDARD",
            incomeAccount: "4000",
          },
        ],
      },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
