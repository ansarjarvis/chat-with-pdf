import Dashboard from "@/components/Dashboard";
import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { FC } from "react";

interface pageProps {}

let Page: FC<pageProps> = async ({}) => {
  let { getUser } = getKindeServerSession();
  let user = await getUser();

  if (!user || !user.id) {
    redirect("/auth-callback?origin=dashboard");
  }

  let dbUser = await db.user.findFirst({
    where: {
      id: user.id,
    },
  });

  if (!dbUser) {
    redirect("/auth-callback?origin=dashboard");
  }

  return <Dashboard />;
};

export default Page;
