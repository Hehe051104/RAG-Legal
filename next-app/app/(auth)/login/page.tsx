"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { toast } from "@/components/chat/toast";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedCharacters } from "@/components/ui/animated-characters";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api/auth";
import { saveAuthSession } from "@/lib/auth/session-client";

const completeLogin = (
  response: Awaited<ReturnType<typeof login>>,
  remember: boolean,
  router: ReturnType<typeof useRouter>
) => {
  const role = response.data.user.role;
  saveAuthSession({
    token: response.data.token.access_token,
    userEmail: response.data.user.email,
    role,
    expiresInSeconds: response.data.token.expires_in,
    remember,
  });
  toast({
    type: "success",
    description: response.msg || "登录成功",
  });
  console.log("Login success, navigating...", {
    provider: "password-or-google",
    role,
    target: "/legal-assistant",
  });
  router.replace("/legal-assistant");
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await login({
        email: email.trim(),
        password,
      });
      completeLogin(response, remember, router);
    } catch (error) {
      const message = error instanceof Error ? error.message : "邮箱或密码不正确，请重试。";
      setError(message);
      toast({
        type: "error",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-h-screen overflow-hidden grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-20">
          <Link
            href="/"
            className="absolute top-8 left-8 z-30 flex items-center gap-3 text-lg font-semibold tracking-tight text-white"
          >
            <Image
              src="https://i.postimg.cc/nLrDYrHW/icon.png"
              alt="法律顾问标识"
              width={32}
              height={32}
              className="rounded-lg bg-white/10 p-1 backdrop-blur-sm"
            />
            <span>法律顾问</span>
          </Link>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <AnimatedCharacters
            isTyping={isTyping}
            showPassword={showPassword}
            passwordLength={password.length}
          />
        </div>

        <div className="relative z-20 flex items-center justify-center gap-8 pb-8 text-sm text-white/70">
          <Link href="/privacy-policy" className="transition-colors hover:text-white">
            隐私政策
          </Link>
          <Link href="/terms-of-service" className="transition-colors hover:text-white">
            服务条款
          </Link>
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative flex items-center justify-center p-8 bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center justify-center gap-2.5 text-lg font-semibold mb-14">
            <Image
              src="https://i.postimg.cc/nLrDYrHW/icon.png"
              alt="法律顾问标识"
              width={36}
              height={36}
              className="rounded-xl bg-foreground/5 p-1"
            />
            <span>法律顾问</span>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-[28px] font-bold tracking-tight mb-3 text-foreground">欢迎回来</h1>
            <p className="text-muted-foreground text-[15px] leading-relaxed">使用邮箱和密码登录你的账户</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[14px] font-medium">
                邮箱地址
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱地址"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-12 bg-background border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[14px] font-medium">
                  密码
                </Label>
                <Link href="/forgot-password" className="text-[13px] text-primary hover:underline font-medium">
                  忘记密码？
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 pr-12 bg-background border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              <Label htmlFor="remember" className="text-[13px] font-normal cursor-pointer text-muted-foreground">
                30 天内记住我
              </Label>
            </div>

            {error ? (
              <div className="flex items-start gap-2.5 p-3.5 text-[13px] text-destructive bg-destructive/5 border border-destructive/20 rounded-xl">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            ) : null}

            <InteractiveHoverButton
              type="submit"
              text={isLoading ? "登录中..." : "登录"}
              className="w-full h-12 text-[15px] font-semibold rounded-xl"
              disabled={isLoading}
            />

            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-background px-3 text-muted-foreground/60">或使用</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLoginButton
                disabled={isLoading}
                onSuccess={(response) => completeLogin(response, remember, router)}
                onError={(message) => {
                  setError(message);
                  toast({
                    type: "error",
                    description: message,
                  });
                }}
              />
            </div>
          </form>

          <div className="text-center text-[14px] text-muted-foreground mt-10">
            还没有账号？{" "}
            <Link href="/register" className="text-foreground font-semibold hover:underline">
              立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
