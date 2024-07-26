import { FC } from "react";
import MaxWidthWrapper from "./MaxWidthWrapper";
import Link from "next/link";
import { buttonVariants } from "./ui/Button";
import {
  RegisterLink,
  LoginLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/server";
import { ArrowRight } from "lucide-react";

interface NavbarProps {}

let Navbar: FC<NavbarProps> = ({}) => {
  return (
    <nav className="sticky h-14 inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-lg transition-all">
      <MaxWidthWrapper>
        <div className="flex h-14 items-center justify-between border-b border-zinc-200">
          <Link href="/" className="flex z-40 font-semibold ">
            <span>ChatPDF</span>
          </Link>
          {/* Todo : add mobile navbar */}
          <div className="hidden items-center space-x-4 sm:flex">
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
          </div>
        </div>
      </MaxWidthWrapper>
    </nav>
  );
};

export default Navbar;
