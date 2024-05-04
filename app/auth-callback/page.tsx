"use client";
import { FC } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../_trpc/client";

interface pageProps {}

let Page: FC<pageProps> = ({}) => {
  let router = useRouter();
  let searchParams = useSearchParams();

  let origin = searchParams.get("origin");

  return <div>{origin}</div>;
};

export default Page;
