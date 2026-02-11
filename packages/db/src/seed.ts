import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./index.js";

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: Role.ADMIN, isActive: true },
    create: {
      username,
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`Admin ready: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
