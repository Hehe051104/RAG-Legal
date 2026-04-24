"use client";

export function LegalAssistantChatHeaderTitle({
  title,
  selectedFolderName,
  modelLabel,
}: {
  title: string;
  selectedFolderName: string | null;
  modelLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className="flex items-center gap-2">
        <h1 className="max-w-[200px] truncate text-lg font-bold sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]">{title}</h1>
        {selectedFolderName ? <span className="hidden rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground md:inline-flex">{selectedFolderName}</span> : null}
      </div>
      <div className="hidden max-w-[700px] truncate text-xs font-normal text-muted-foreground md:block">
        {modelLabel}
      </div>
    </div>
  );
}
