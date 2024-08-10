import { OpenAI } from "openai";

export let openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
