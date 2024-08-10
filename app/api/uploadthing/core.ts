import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { pinecone } from "@/lib/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";

const f = createUploadthing();

export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      let { getUser } = getKindeServerSession();
      let user = await getUser();

      if (!user || !user.id) {
        throw new Error("Unauthorized");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
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
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

// https://utfs.io/f/28302d47-da80-43d0-a873-f64a36d3e8b8-kk6etm.pdf

// clzias3oc0001z5u8szcw88g7
