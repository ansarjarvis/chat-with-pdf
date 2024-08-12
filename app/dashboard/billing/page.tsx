import BillingForm from "@/components/BillingForm";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { FC } from "react";

interface pageProps {}

let page: FC<pageProps> = async ({}) => {
  let subscriptionPlan = await getUserSubscriptionPlan();
  return <BillingForm subscriptionPlan={subscriptionPlan} />;
};

export default page;
