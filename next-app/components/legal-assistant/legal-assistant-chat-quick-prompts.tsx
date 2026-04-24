"use client";

export function LegalAssistantChatQuickPrompts({
  prompts,
  onQuickPrompt,
}: {
  prompts: string[];
  onQuickPrompt: (prompt: string) => void;
}) {
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
      {prompts.map((prompt) => (
        <button
          className="rounded-3xl border border-border/60 bg-card px-4 py-4 text-left text-sm leading-6 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-muted/40 hover:text-foreground"
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
