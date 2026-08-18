import { Link } from "react-router-dom";

export default function LogoHeader() {
  return (
    <div className="flex items-center gap-4 fixed -translate-y-1/2 left-4 xl:left-8 top-16 z-10">
      <Link
        className="hover:scale-105 active:scale-95 transition-all"
        to={"/"}
      >
        <img
          src="/assets/logo/logo-header.png"
          width={256}
          height={256}
          className="w-18 xl:w-20 aspect-square"
        />
      </Link>
      <p className="text-sm text-gray-500 hidden sm:block">v1.0.0</p>
    </div>
  );
}
