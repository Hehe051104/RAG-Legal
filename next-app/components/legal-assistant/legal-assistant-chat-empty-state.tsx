"use client";

import { ScaleIcon, BookOpenIcon, BriefcaseIcon, FileTextIcon, ShieldIcon } from "lucide-react";
import { LegalDisclaimer } from "./legal-disclaimer";

export function LegalAssistantChatEmptyState() {
  return (
    <div className="flex w-full flex-col items-center px-4 text-center">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] text-muted-foreground shadow-[var(--shadow-card)]">
          <ScaleIcon className="size-3.5" />
          AI 法律顾问 · IRAC 分析框架
        </div>

        <h2 className="font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
          专业法律分析助手
        </h2>

        <p className="mx-auto max-w-2xl text-muted-foreground/80 text-sm">
          基于 IRAC 法律分析方法，结合法律条文、司法解释和真实案例，为您提供结构化的法律意见：
        </p>
      </div>

      <div className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: "一", title: "争点识别", desc: "识别核心法律争议", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400" },
          { icon: "二", title: "法律规则", desc: "引用法条和解释", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
          { icon: "三", title: "适用分析", desc: "类案对比分析", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
          { icon: "四", title: "结论建议", desc: "法律意见和风险", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400" },
        ].map((item) => (
          <div key={item.icon} className="group flex flex-col items-center gap-1.5 rounded-lg border border-border/30 bg-card/30 px-3 py-3 transition-all hover:border-border/60 hover:bg-card/50 hover:shadow-sm">
            <span className={`flex size-7 items-center justify-center rounded-full text-[12px] font-bold transition-transform group-hover:scale-110 ${item.color}`}>
              {item.icon}
            </span>
            <span className="text-[12px] font-medium text-foreground">{item.title}</span>
            <span className="text-[10px] text-muted-foreground">{item.desc}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BookOpenIcon className="size-3.5 text-blue-500" />
          <span className="font-medium text-foreground">245</span> 部法律法规
        </span>
        <span className="flex items-center gap-1.5">
          <FileTextIcon className="size-3.5 text-emerald-500" />
          <span className="font-medium text-foreground">332</span> 个司法解释
        </span>
        <span className="flex items-center gap-1.5">
          <BriefcaseIcon className="size-3.5 text-amber-500" />
          <span className="font-medium text-foreground">3,944</span> 个真实案例
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {["刑事", "民事", "行政", "执行", "国家赔偿", "劳动", "知识产权"].map((domain) => (
          <span key={domain} className="rounded-full border border-border/40 bg-muted/30 px-2.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground">
            {domain}
          </span>
        ))}
      </div>

      <div className="mt-5 w-full max-w-2xl">
        <LegalDisclaimer />
      </div>
    </div>
  );
}
