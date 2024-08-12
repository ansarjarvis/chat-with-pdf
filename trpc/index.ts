import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { privateProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { z } from "zod";
import { INFITE_QUERY_LIMIT } from "@/config/infinite-query";
import { absoluteUrl } from "@/lib/utils";
import { getUserSubscriptionPlan, stripe } from "@/lib/stripe";
import { PLANS } from "@/config/stripe";

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
  getUserFiles: privateProcedure.query(({ ctx }) => {
    let { user, userId } = ctx;

    return db.file.findMany({
      where: {
        userId: userId,
      },
    });
  }),
  deleteFile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      let { userId } = ctx;

      let file = await db.file.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      await db.file.delete({
        where: {
          id: input.id,
        },
      });
      return file;
    }),

  getFile: privateProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      let { userId } = ctx;

      let file = await db.file.findFirst({
        where: {
          key: input.key,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      return file;
    }),

  getFileUploadStatus: privateProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input, ctx }) => {
      let file = await db.file.findFirst({
        where: {
          id: input.fileId,
          userId: ctx.userId,
        },
      });

      if (!file) return { status: "PENDING" as const };

      return { status: file.uplaodStatus };
    }),

  getFileMessages: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        fileId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      let { userId } = ctx;
      let { fileId, cursor } = input;
      let limit = input.limit ?? INFITE_QUERY_LIMIT;

      let file = await db.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      let messages = await db.message.findMany({
        where: {
          fileId,
        },
        orderBy: {
          createdAt: "desc",
        },
        cursor: cursor ? { id: cursor } : undefined,

        take: limit + 1,

        select: {
          id: true,
          text: true,
          createdAt: true,
          isUserMessage: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;

      if (messages.length > limit) {
        let nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages,
        nextCursor,
      };
    }),

  // createStripeSession: privateProcedure.mutation(async ({ ctx }) => {

  //   let { userId } = ctx;

  //   let billingURL = absoluteUrl("/dashboard/billing");

  //   if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

  //   let dbUser = await db.user.findFirst({
  //     where: {
  //       id: userId,
  //     },
  //   });

  //   if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

  //   let subscriptionPlan = await getUserSubscriptionPlan();

  //   if (subscriptionPlan.isSubscribed && dbUser.stripeCustomerId) {
  //     let stripeSession = await stripe.billingPortal.sessions.create({
  //       customer: dbUser.stripeCustomerId,
  //       return_url: billingURL,
  //     });
  //     return { url: stripeSession.url };
  //   }

  //   let stripeSession = await stripe.checkout.sessions.create({
  //     success_url: billingURL,
  //     cancel_url: billingURL,
  //     payment_method_types: ["card", "paypal", "amazon_pay"],
  //     mode: "subscription",
  //     billing_address_collection: "auto",
  //     line_items: [
  //       {
  //         price: PLANS.find((plan) => plan.name === "Pro")?.price.priceIds.test,
  //         quantity: 1,
  //       },
  //     ],
  //     metadata: {
  //       userId: userId,
  //     },
  //   });

  //   return { url: stripeSession.url };
  // }),

  createStripeSession: privateProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx;

    const billingUrl = absoluteUrl("/dashboard/billing");

    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    const dbUser = await db.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const subscriptionPlan = await getUserSubscriptionPlan();

    if (subscriptionPlan.isSubscribed && dbUser.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: billingUrl,
      });

      return { url: stripeSession.url };
    }

    const stripeSession = await stripe.checkout.sessions.create({
      success_url: billingUrl,
      cancel_url: billingUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "required",
      line_items: [
        {
          price: PLANS.find((plan) => plan.name === "Pro")?.price.priceIds.test,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
      },
    });

    return { url: stripeSession.url };
  }),
});

export type AppRouter = typeof appRouter;
