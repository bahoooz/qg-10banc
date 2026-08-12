import ClipEditorStepNav from "./ClipEditorStepNav";

export default function ClipEditorSidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-secondary-color/40 bg-background-secondary lg:w-64 lg:border-b-0 lg:border-r xl:w-72">
      <div className="flex flex-col gap-5 p-4 lg:p-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
            Étapes
          </p>
          <div className="mt-3">
            <ClipEditorStepNav orientation="vertical" />
          </div>
        </div>
      </div>
    </aside>
  );
}
