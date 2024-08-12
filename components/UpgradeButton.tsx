"use client";

import { FC } from "react";
import { Button } from "./ui/Button";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/app/_trpc/client";

interface UpgradeButtonProps {}

let UpgradeButton: FC<UpgradeButtonProps> = ({}) => {
  let { mutate: createStripeSession } = trpc.createStripeSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url ?? "/dashboard/billing";
    },
  });
  return (
    <Button className="w-full" onClick={() => createStripeSession()}>
      Upgrade now <ArrowRight className="h-5 w-5 ml-1.5" />
    </Button>
  );
};

export default UpgradeButton;
