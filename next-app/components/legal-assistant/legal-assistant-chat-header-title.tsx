"use client";

type LegalAssistantChatHeaderTitleProps = {
  title: string;
  selectedFolderName: string | null;
  modelLabel: string;
};

export function LegalAssistantChatHeaderTitle({
  title,
  selectedFolderName,
  modelLabel,
}: LegalAssistantChatHeaderTitleProps) {
  const meta = [selectedFolderName, modelLabel].filter(Boolean).join(" · ");

  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <h1 className="max-w-[220px] truncate text-sm font-semibold text-foreground sm:max-w-[380px] md:max-w-[460px] lg:max-w-[560px] xl:max-w-[660px]">
        {title}
      </h1>

      {meta ? (
        <div className="hidden max-w-[680px] truncate text-[11px] font-normal text-muted-foreground md:block">
          {meta}
        </div>
      ) : null}
    </div>
  );
}
