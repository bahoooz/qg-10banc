import CleanedTitle from "./CleanedTitle";

export default function TitlePage() {
  return (
    <h1 className="hidden text-center lg:block z-10 top-16 left-1/2 -translate-x-1/2 -translate-y-1/2 fixed text-2xl first-letter:uppercase">
      <CleanedTitle />
    </h1>
  );
}
