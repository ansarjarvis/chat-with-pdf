import { FC } from "react";
import MaxWidthWrapper from "./MaxWidthWrapper";
import Link from "next/link";
import { buttonVariants } from "./ui/Button";
import {
  RegisterLink,
  LoginLink,
  getKindeServerSession,
} from "@kinde-oss/kinde-auth-nextjs/server";
import { ArrowRight } from "lucide-react";
import UserAccountNav from "./UserAccountNav";
import MobileNav from "./MobileNav";

interface NavbarProps {}

let Navbar: FC<NavbarProps> = async ({}) => {
  let { getUser } = getKindeServerSession();
  let user = await getUser();
  return (
    <nav className="sticky h-14 inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-lg transition-all">
      <MaxWidthWrapper>
        <div className="flex h-14 items-center justify-between border-b border-zinc-200">
          <Link href="/" className="flex z-40 font-semibold ">
            <span>ChatPDF</span>
          </Link>
          <MobileNav isAuth={!!user} />
          <div className="hidden items-center space-x-4 sm:flex">
            {!user ? (
              <>
                <Link
                  href="/pricing"
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  Pricing
                </Link>
                <LoginLink
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  Login
                </LoginLink>
                <RegisterLink className={buttonVariants({ size: "sm" })}>
                  Register <ArrowRight className="h-5 w-5 ml-1" />
                </RegisterLink>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  Dashboard
                </Link>

                <UserAccountNav
                  name={
                    !user.given_name || !user.family_name
                      ? "Your Account"
                      : `${user.given_name} ${user.family_name}`
                  }
                  email={user.email ?? ""}
                  imageUrl={user.picture ?? ""}
                />
              </>
            )}
          </div>
        </div>
      </MaxWidthWrapper>
    </nav>
  );
};

export default Navbar;
