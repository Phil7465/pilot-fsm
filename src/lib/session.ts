import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
