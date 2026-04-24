"use client";

import { useEffect, useRef, useState } from "react";

import {
  type LoginResponse,
  googleLogin,
} from "@/lib/api/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            }
          ) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

type GoogleLoginButtonProps = {
  disabled?: boolean;
  onSuccess: (response: LoginResponse) => void;
  onError: (message: string) => void;
};

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

export function GoogleLoginButton({
  disabled = false,
  onSuccess,
  onError,
}: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const submittingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleCredential = async (credential?: string) => {
      if (disabled || submittingRef.current) {
        return;
      }

      if (!credential || cancelled) {
        onError("Google 登录失败：未获取到凭证，请检查 NEXT_PUBLIC_GOOGLE_CLIENT_ID 与 Google 控制台授权域名是否匹配");
        return;
      }

      try {
        submittingRef.current = true;
        setIsLoading(true);
        const response = await googleLogin({ credential });
        if (!cancelled) {
          console.log("Login success, navigating...", {
            provider: "google",
            status: response.status,
            hasToken: Boolean(response?.data?.token?.access_token),
          });
          onSuccess(response);
        }
      } catch (error) {
        if (!cancelled) {
          onError(error instanceof Error ? error.message : "Google 登录失败，请稍后重试");
        }
      } finally {
        submittingRef.current = false;
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const renderGoogle = () => {
      if (cancelled || initializedRef.current || !window.google || !buttonRef.current) {
        return;
      }

      if (!GOOGLE_CLIENT_ID) {
        onError("未配置 Google Client ID，暂无法使用 Google 登录");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          void handleCredential(credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        width: 320,
      });

      // One Tap
      window.google.accounts.id.prompt();
      initializedRef.current = true;
    };

    if (window.google?.accounts?.id) {
      renderGoogle();
      return () => {
        cancelled = true;
        window.google?.accounts?.id.cancel();
      };
    }

    const scriptId = "google-identity-services-sdk";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const onLoad = () => renderGoogle();

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = onLoad;
      script.onerror = () => {
        if (!cancelled) {
          onError("Google 身份服务加载失败，请检查网络后重试");
        }
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", onLoad);
      onLoad();
    }

    return () => {
      cancelled = true;
      submittingRef.current = false;
      script?.removeEventListener("load", onLoad);
      window.google?.accounts?.id.cancel();
    };
  }, [disabled, onError, onSuccess]);

  return (
    <div className="space-y-3">
      <div ref={buttonRef} />
      {(isLoading || disabled) && (
        <p className="text-center text-xs text-muted-foreground">
          {isLoading ? "Google 登录中..." : "Google 登录暂不可用"}
        </p>
      )}
    </div>
  );
}
