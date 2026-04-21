import "server-only";

import { auth } from "@clerk/nextjs/server";

export const getCurrentUserId = async () => {
  const { userId } = await auth();
  return userId;
};

export const requireCurrentUserId = async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
};
