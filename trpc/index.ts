import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { use } from "react";
export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    let { getUser } = getKindeServerSession();
    let user = await getUser();

    if (!user?.id || !user?.email) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }

    /*  check user in db */

    let dbUser = await db.user.findFirst({
      where: {
        id: user.id,
      },
    });

    if (!dbUser) {
      /* create user */
      await db.user.create({
        data: {
          id: user.id,
          email: user.email,
        },
      });
    }
    return {
      success: true,
    };
  }),
});

export type AppRouter = typeof appRouter;
