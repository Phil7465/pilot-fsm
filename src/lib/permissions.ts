import { Role } from "@prisma/client";

export function ensureAdmin(role?: Role) {
  if (role !== "ADMIN") {
    throw new Error("Requires admin privileges");
  }
}

export function ensureDriverOrAdmin(role?: Role) {
  if (!role) throw new Error("Unauthenticated");
  if (role !== "ADMIN" && role !== "DRIVER") {
    throw new Error("Unauthorized");
  }
}
