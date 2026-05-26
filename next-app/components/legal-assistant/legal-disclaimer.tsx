"use client";

import { ScaleIcon } from "lucide-react";

export function LegalDisclaimer() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200/50 bg-amber-50/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300/80">
      <ScaleIcon className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>免责声明：</strong>本系统提供的法律分析仅供参考，不构成正式法律意见。具体法律问题请咨询专业执业律师。
      </p>
    </div>
  );
}
