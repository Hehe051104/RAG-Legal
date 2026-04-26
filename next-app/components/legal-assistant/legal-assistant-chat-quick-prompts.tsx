"use client";

type LegalAssistantChatQuickPromptsProps = {
  prompts: string[];
  onQuickPrompt: (prompt: string) => void;
};

export function LegalAssistantChatQuickPrompts({
  prompts,
  onQuickPrompt,
}: LegalAssistantChatQuickPromptsProps) {
  return (
    <div className="grid w-full gap-2.5 sm:grid-cols-2" data-testid="legal-assistant-quick-prompts">
      {prompts.map((prompt) => (
        <button
          className="h-auto w-full rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground transition-all duration-200 sm:p-4 sm:text-[13px] hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)]"
          key={prompt}
          onClick={() => onQuickPrompt(prompt)}
          type="button"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
