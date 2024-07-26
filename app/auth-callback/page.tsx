"use client";
import { FC, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../_trpc/client";
import { Loader2 } from "lucide-react";

interface pageProps {}

enum TErrCodes {
  UNAUTHORIZED,
}

let Page: FC<pageProps> = ({}) => {
  let router = useRouter();
  let searchParams = useSearchParams();

  let origin = searchParams.get("origin");

  /* api call to  authcall end point */

  let { data, isLoading, error } = trpc.authCallback.useQuery(undefined, {
    meta: { errCode: TErrCodes.UNAUTHORIZED },
  });

  // useEffect(() => {
  //   if (error?.data?.code === "UNAUTHORIZED") {
  //     router.push("/sign-in");
  //   }
  //   if (!isLoading) {
  //     router.push(
  //       data !== undefined && data.success && origin
  //         ? `${origin}`
  //         : "/dashboard"
  //     );
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [data, isLoading]);

  useEffect(() => {
    if (error?.data?.code === "UNAUTHORIZED") router.push("/sign-in");
    else if (!isLoading)
      router.push(
        data !== undefined && data.success && origin
          ? `${origin}`
          : "/dashboard"
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading]);

  return (
    <div className=" w-full mt-24 flex justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
        <h3 className="font-semibold text-xl">Setting up your account ....</h3>
        <p>You will be redirected autometically.</p>
      </div>
    </div>
  );
};

export default Page;
