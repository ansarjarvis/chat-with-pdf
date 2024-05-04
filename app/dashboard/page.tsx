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

  return <div>{user?.given_name}</div>;
};

export default Page;
