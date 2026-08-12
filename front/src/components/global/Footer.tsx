import type { ReactNode } from "react";
import CleanedTitle from "./CleanedTitle";

export default function Footer({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${className} text-center flex flex-col items-center justify-center lg:hidden flex-1 capitalize`}>
      <h1 className="text-2xl">
        <CleanedTitle />
      </h1>
      {children && children}
    </div>
  );
}
