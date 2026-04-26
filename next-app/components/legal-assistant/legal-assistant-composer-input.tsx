"use client";

import { LegalAssistantComposerSendButton } from "./legal-assistant-composer-send-button";
import { LegalAssistantComposerTextarea } from "./legal-assistant-composer-textarea";

type LegalAssistantComposerInputProps = {
  value: string;
  canSubmit: boolean;
  isSending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function LegalAssistantComposerInput({
  value,
  canSubmit,
  isSending,
  onChange,
  onSubmit,
}: LegalAssistantComposerInputProps) {
  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    onSubmit();
  };

  return (
    <div className="flex items-end gap-2" aria-disabled={isSending}>
      <LegalAssistantComposerTextarea
        disabled={isSending}
        onChange={onChange}
        onSubmit={handleSubmit}
        value={value}
      />
      <LegalAssistantComposerSendButton disabled={!canSubmit} onSubmit={handleSubmit} />
    </div>
  );
}
