type PreviewCenterSnapGuidesProps = {
  showVertical?: boolean;
  showHorizontal?: boolean;
};

export default function PreviewCenterSnapGuides({
  showVertical = false,
  showHorizontal = false,
}: PreviewCenterSnapGuidesProps) {
  if (!showVertical && !showHorizontal) return null;

  return (
    <>
      {showVertical && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[29] w-0.5 -translate-x-1/2 bg-main-color shadow-[0_0_8px_rgba(205,183,255,0.8)]" />
      )}
      {showHorizontal && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[29] h-0.5 -translate-y-1/2 bg-main-color shadow-[0_0_8px_rgba(205,183,255,0.8)]" />
      )}
    </>
  );
}
