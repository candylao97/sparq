import { PrismaClient, UserRole, ServiceCategory, ServiceMode, ProviderModerationStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SUBURBS = [
  "Melbourne CBD",
  "Southbank",
  "Docklands",
  "Carlton",
  "Fitzroy",
  "Richmond",
  "South Yarra",
  "Brunswick",
];

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sparq.com.au" },
    update: {},
    create: {
      email: "admin@sparq.com.au",
      name: "Sparq Admin",
      hashedPassword: adminPassword,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // Create sample customer
  const customerPassword = await hash("customer123!", 12);
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      name: "Jane Smith",
      hashedPassword: customerPassword,
      role: UserRole.CUSTOMER,
      emailVerified: new Date(),
    },
  });
  console.log(`Customer user created: ${customer.email}`);

  // Create sample providers
  const providerPassword = await hash("provider123!", 12);

  const provider1 = await prisma.user.upsert({
    where: { email: "lisa@example.com" },
    update: {},
    create: {
      email: "lisa@example.com",
      name: "Lisa Nguyen",
      hashedPassword: providerPassword,
      role: UserRole.PROVIDER,
      emailVerified: new Date(),
      providerProfile: {
        create: {
          businessName: "Lisa's Nail Studio",
          bio: "Professional nail artist with 8 years of experience specialising in gel extensions, nail art, and Japanese gel nails. I take pride in creating beautiful, long-lasting nail designs.",
          serviceTypes: [ServiceCategory.NAILS],
          serviceMode: ServiceMode.STUDIO,
          studioAddress: "123 Collins Street",
          studioSuburb: "Melbourne CBD",
          abn: "12345678901",
          yearsExperience: 8,
          moderationStatus: ProviderModerationStatus.APPROVED,
          avgRating: 4.8,
          reviewCount: 24,
          responseRate: 95,
          submittedAt: new Date("2024-01-15"),
          approvedAt: new Date("2024-01-17"),
          suburbs: {
            create: [
              { suburb: "Melbourne CBD" },
              { suburb: "Southbank" },
              { suburb: "Docklands" },
            ],
          },
          services: {
            create: [
              {
                title: "Gel Manicure",
                category: ServiceCategory.NAILS,
                description: "Classic gel manicure with cuticle care, shaping, and gel polish application.",
                durationMinutes: 60,
                basePrice: 55,
                serviceMode: ServiceMode.STUDIO,
              },
              {
                title: "Gel Extensions - Full Set",
                category: ServiceCategory.NAILS,
                description: "Full set of gel nail extensions with your choice of shape and design.",
                durationMinutes: 120,
                basePrice: 95,
                serviceMode: ServiceMode.STUDIO,
              },
              {
                title: "Nail Art Design",
                category: ServiceCategory.NAILS,
                description: "Custom nail art design per nail. Includes hand-painted designs, foils, and embellishments.",
                durationMinutes: 90,
                basePrice: 75,
                serviceMode: ServiceMode.STUDIO,
              },
            ],
          },
          availabilityRules: {
            create: [
              { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 4, startTime: "09:00", endTime: "19:00" },
              { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 6, startTime: "10:00", endTime: "15:00" },
            ],
          },
        },
      },
    },
  });
  console.log(`Provider created: ${provider1.email}`);

  const provider2 = await prisma.user.upsert({
    where: { email: "sarah@example.com" },
    update: {},
    create: {
      email: "sarah@example.com",
      name: "Sarah Kim",
      hashedPassword: providerPassword,
      role: UserRole.PROVIDER,
      emailVerified: new Date(),
      providerProfile: {
        create: {
          businessName: "Lash by Sarah",
          bio: "Certified lash technician specialising in classic, hybrid, and volume lash extensions. I use premium Korean silk and mink lashes for a natural, beautiful look.",
          serviceTypes: [ServiceCategory.LASHES],
          serviceMode: ServiceMode.BOTH,
          studioAddress: "45 Chapel Street",
          studioSuburb: "South Yarra",
          mobileRadius: 10,
          abn: "98765432101",
          yearsExperience: 5,
          moderationStatus: ProviderModerationStatus.APPROVED,
          avgRating: 4.9,
          reviewCount: 31,
          responseRate: 98,
          submittedAt: new Date("2024-02-01"),
          approvedAt: new Date("2024-02-03"),
          suburbs: {
            create: [
              { suburb: "South Yarra" },
              { suburb: "Richmond" },
              { suburb: "Melbourne CBD" },
              { suburb: "Southbank" },
            ],
          },
          services: {
            create: [
              {
                title: "Classic Lash Extensions - Full Set",
                category: ServiceCategory.LASHES,
                description: "Natural-looking classic lash extensions. One extension per natural lash for a subtle, elegant look.",
                durationMinutes: 120,
                basePrice: 120,
                serviceMode: ServiceMode.BOTH,
              },
              {
                title: "Volume Lash Extensions - Full Set",
                category: ServiceCategory.LASHES,
                description: "Handmade volume fans for a fuller, more dramatic look. 2-6 ultra-fine extensions per natural lash.",
                durationMinutes: 150,
                basePrice: 160,
                serviceMode: ServiceMode.BOTH,
              },
              {
                title: "Lash Infill (2-3 weeks)",
                category: ServiceCategory.LASHES,
                description: "Maintenance infill for existing lash extensions within 2-3 weeks of full set.",
                durationMinutes: 75,
                basePrice: 75,
                serviceMode: ServiceMode.BOTH,
              },
              {
                title: "Lash Lift & Tint",
                category: ServiceCategory.LASHES,
                description: "Semi-permanent lash lift with tint for naturally curled, darker lashes lasting 6-8 weeks.",
                durationMinutes: 60,
                basePrice: 85,
                serviceMode: ServiceMode.STUDIO,
              },
            ],
          },
          availabilityRules: {
            create: [
              { dayOfWeek: 0, startTime: "10:00", endTime: "16:00" },
              { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
              { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
              { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
              { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
              { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" },
            ],
          },
        },
      },
    },
  });
  console.log(`Provider created: ${provider2.email}`);

  const provider3 = await prisma.user.upsert({
    where: { email: "emma@example.com" },
    update: {},
    create: {
      email: "emma@example.com",
      name: "Emma Chen",
      hashedPassword: providerPassword,
      role: UserRole.PROVIDER,
      emailVerified: new Date(),
      providerProfile: {
        create: {
          businessName: "Beauty by Emma",
          bio: "Mobile nail and lash artist covering Melbourne's inner suburbs. I bring the salon experience to your home with premium products and a relaxing setup.",
          serviceTypes: [ServiceCategory.NAILS, ServiceCategory.LASHES],
          serviceMode: ServiceMode.MOBILE,
          mobileRadius: 15,
          abn: "11223344556",
          yearsExperience: 6,
          moderationStatus: ProviderModerationStatus.APPROVED,
          avgRating: 4.7,
          reviewCount: 18,
          responseRate: 92,
          submittedAt: new Date("2024-03-01"),
          approvedAt: new Date("2024-03-03"),
          suburbs: {
            create: SUBURBS.map((suburb) => ({ suburb })),
          },
          services: {
            create: [
              {
                title: "Mobile Gel Manicure",
                category: ServiceCategory.NAILS,
                description: "Full gel manicure service at your home. Includes cuticle care, shaping, and gel polish.",
                durationMinutes: 75,
                basePrice: 65,
                serviceMode: ServiceMode.MOBILE,
              },
              {
                title: "Mobile Classic Lash Extensions",
                category: ServiceCategory.LASHES,
                description: "Classic lash extension full set in the comfort of your home.",
                durationMinutes: 135,
                basePrice: 140,
                serviceMode: ServiceMode.MOBILE,
              },
              {
                title: "Mobile Gel Pedicure",
                category: ServiceCategory.NAILS,
                description: "Relaxing gel pedicure at your home with foot soak, exfoliation, and gel polish.",
                durationMinutes: 75,
                basePrice: 70,
                serviceMode: ServiceMode.MOBILE,
              },
            ],
          },
          availabilityRules: {
            create: [
              { dayOfWeek: 1, startTime: "10:00", endTime: "18:00" },
              { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
              { dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
              { dayOfWeek: 4, startTime: "10:00", endTime: "20:00" },
              { dayOfWeek: 5, startTime: "10:00", endTime: "18:00" },
              { dayOfWeek: 6, startTime: "09:00", endTime: "16:00" },
            ],
          },
        },
      },
    },
  });
  console.log(`Provider created: ${provider3.email}`);

  // Create a provider in SUBMITTED status (for admin approval queue)
  const provider4 = await prisma.user.upsert({
    where: { email: "mia@example.com" },
    update: {},
    create: {
      email: "mia@example.com",
      name: "Mia Tran",
      hashedPassword: providerPassword,
      role: UserRole.PROVIDER,
      emailVerified: new Date(),
      providerProfile: {
        create: {
          businessName: "Mia's Lash Bar",
          bio: "Aspiring lash artist seeking approval. Trained at Melbourne Lash Academy with certification in classic and volume techniques.",
          serviceTypes: [ServiceCategory.LASHES],
          serviceMode: ServiceMode.STUDIO,
          studioAddress: "78 Brunswick Street",
          studioSuburb: "Fitzroy",
          abn: "55667788990",
          yearsExperience: 2,
          moderationStatus: ProviderModerationStatus.SUBMITTED,
          submittedAt: new Date(),
          suburbs: {
            create: [
              { suburb: "Fitzroy" },
              { suburb: "Carlton" },
              { suburb: "Brunswick" },
            ],
          },
          services: {
            create: [
              {
                title: "Classic Lash Full Set",
                category: ServiceCategory.LASHES,
                description: "Beautiful classic lash extensions for a natural look.",
                durationMinutes: 120,
                basePrice: 110,
                serviceMode: ServiceMode.STUDIO,
              },
            ],
          },
          availabilityRules: {
            create: [
              { dayOfWeek: 2, startTime: "10:00", endTime: "17:00" },
              { dayOfWeek: 3, startTime: "10:00", endTime: "17:00" },
              { dayOfWeek: 4, startTime: "10:00", endTime: "17:00" },
              { dayOfWeek: 5, startTime: "10:00", endTime: "17:00" },
              { dayOfWeek: 6, startTime: "10:00", endTime: "15:00" },
            ],
          },
        },
      },
    },
  });
  console.log(`Provider created (pending approval): ${provider4.email}`);

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
