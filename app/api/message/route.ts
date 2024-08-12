import { db } from "@/db";
import { openai } from "@/lib/openai";
import { pinecone } from "@/lib/pinecone";
import { SendMessageValidator } from "@/lib/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { NextRequest, NextResponse } from "next/server";
import { StreamingTextResponse, OpenAIStream } from "ai";

export let POST = async (req: NextRequest, res: NextResponse) => {
  let body = await req.json();

  let { getUser } = getKindeServerSession();

  let user = await getUser();

  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let { fileId, message } = SendMessageValidator.parse(body);

  let file = await db.file.findFirst({
    where: {
      id: fileId,
      userId: user?.id,
    },
  });

  if (!file) {
    return new Response("Not Found", { status: 404 });
  }

  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId: user?.id,
      fileId,
    },
  });

  // vectorize message

  let index = pinecone.index("chatwithpdf");

  let embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  let vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: file.id,
  });

  let results = await vectorStore.similaritySearch(message, 4);

  let previousMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  let formattedPrevMessages = previousMessages.map((msg) => ({
    role: msg.isUserMessage ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }));

  const response: any = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.",
      },
      {
        role: "user",
        content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.

  \n----------------\n

  PREVIOUS CONVERSATION:
  ${formattedPrevMessages.map((message) => {
    if (message.role === "user") return `User: ${message.content}\n`;
    return `Assistant: ${message.content}\n`;
  })}

  \n----------------\n

  CONTEXT:
  ${results.map((r) => r.pageContent).join("\n\n")}

  USER INPUT: ${message}`,
      },
    ],
  });

  let stream = OpenAIStream(response, {
    async onCompletion(completion) {
      await db.message.create({
        data: {
          text: completion,
          isUserMessage: false,
          fileId,
          userId: user?.id,
        },
      });
    },
  });

  return new StreamingTextResponse(stream);
};
