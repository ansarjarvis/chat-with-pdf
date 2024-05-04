import { AppRouter } from "@/trpc";
import { createTRPCReact } from "@trpc/react-query";

export let trpc = createTRPCReact<AppRouter>({});
