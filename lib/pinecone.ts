import { Pinecone } from "@pinecone-database/pinecone";

export let pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
