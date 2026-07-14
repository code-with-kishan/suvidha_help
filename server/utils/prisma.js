import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VERCEL ? 'file:/tmp/suvidha-vercel.db' : 'file:./prisma/dev.db';
}

const prisma = new PrismaClient();

let readyPromise;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CITIZEN',
    "aadhaar" TEXT,
    "password_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "otp_verifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "service_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "reference_code" TEXT,
    "service_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "service_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "complaints" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "reference_code" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "service_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "transaction_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "receipts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "receipt_url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_mobile_key" ON "users"("mobile")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "service_requests_reference_code_key" ON "service_requests"("reference_code")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "complaints_reference_code_key" ON "complaints"("reference_code")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "payments_transaction_id_key" ON "payments"("transaction_id")`
];

export const ensureDatabaseReady = async () => {
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const statement of schemaStatements) {
        await prisma.$executeRawUnsafe(statement);
      }

      const adminMobile = process.env.DEFAULT_ADMIN_MOBILE || '9999999999';
      const existingAdmin = await prisma.user.findUnique({ where: { mobile: adminMobile } });
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123', 10);
        await prisma.user.create({
          data: {
            name: process.env.DEFAULT_ADMIN_NAME || 'SUVIDHA Admin',
            mobile: adminMobile,
            email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@suvidha.local',
            role: 'ADMIN',
            passwordHash
          }
        });
      }
    })();
  }

  return readyPromise;
};

export default prisma;
