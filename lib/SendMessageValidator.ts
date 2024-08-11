import { z } from "zod";

export let SendMessageValidator = z.object({
  fileId: z.string(),
  message: z.string(),
});
