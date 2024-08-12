import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { pinecone } from "@/lib/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { PLANS } from "@/config/stripe";

const f = createUploadthing();

let middleware = async () => {
  let { getUser } = getKindeServerSession();
  let user = await getUser();

  if (!user || !user.id) {
    throw new Error("Unauthorized");
  }

  let subscriptionPlan = await getUserSubscriptionPlan();

  return { subscriptionPlan, userId: user?.id };
};

let onUploadComplete = async ({
  metadata,
  file,
}: {
  metadata: Awaited<ReturnType<typeof middleware>>;
  file: {
    key: string;
    name: string;
    url: string;
  };
}) => {
  const isFileExist = await db.file.findFirst({
    where: {
      key: file.key,
    },
  });

  if (isFileExist) return;

  let createdfile = await db.file.create({
    data: {
      key: file.key,
      name: file.name,
      userId: metadata.userId,
      url: file.url,
      uplaodStatus: "PROCESSING",
    },
  });

  try {
    let response = await fetch(file.url);
    let blob = await response.blob();
    let loader = new PDFLoader(blob);
    let pageLevelDocs = await loader.load();

    let pageAmt = pageLevelDocs.length;

    let { subscriptionPlan } = metadata;

    let { isSubscribed } = subscriptionPlan;

    let isProExceeded =
      pageAmt > PLANS.find((plan) => plan.name === "Pro")!.pagesPerPdf;

    let isFreeExceeded =
      pageAmt > PLANS.find((plan) => plan.name === "Free")!.pagesPerPdf;

    if ((isSubscribed && isProExceeded) || (!isSubscribed && isFreeExceeded)) {
      await db.file.update({
        data: {
          uplaodStatus: "FIALED",
        },
        where: {
          id: createdfile.id,
        },
      });
    }

    /*  vectorize and index entire document */

    let index = pinecone.index("chatwithpdf");
    let embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
      pineconeIndex: index,
      namespace: createdfile.id,
    });

    await db.file.update({
      data: {
        uplaodStatus: "SUCCESS",
      },
      where: {
        id: createdfile.id,
      },
    });
  } catch (err) {
    await db.file.update({
      data: {
        uplaodStatus: "FIALED",
      },
      where: {
        id: createdfile.id,
      },
    });
  }
};

export const ourFileRouter = {
  freePDFUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
  ProPDFUploader: f({ pdf: { maxFileSize: "16MB" } })
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
