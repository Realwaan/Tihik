"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, LogOut, Settings2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"] as const;

type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

type ProfilePopupFormProps = {
  initialName?: string | null;
  initialEmail?: string | null;
};

type ApiProfileResponse = {
  user?: {
    name?: string | null;
    email?: string | null;
    preferredCurrency?: SupportedCurrency;
  };
  error?: string;
};

export function ProfilePopupForm({ initialName, initialEmail }: ProfilePopupFormProps) {
  const [open, setOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [preferredCurrency, setPreferredCurrency] = useState<SupportedCurrency>("USD");
  const { showToast } = useToast();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    const raw = name || email || "User";
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [email, name]);

  useEffect(() => {
    if (!open || hasFetched) return;

    let ignore = false;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/user/profile", { cache: "no-store" });
        const json = (await response.json().catch(() => null)) as ApiProfileResponse | null;

        if (!response.ok) {
          const message = json?.error ?? "Failed to load profile details.";
          throw new Error(message);
        }

        if (ignore) return;
        setName(json?.user?.name ?? "");
        setEmail(json?.user?.email ?? "");
        setPreferredCurrency(json?.user?.preferredCurrency ?? "USD");
        setHasFetched(true);
      } catch (error) {
        if (!ignore) {
          showToast("error", error instanceof Error ? error.message : "Failed to load profile details.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [hasFetched, open, showToast]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const container = wrapperRef.current;
      if (!container) return;
      if (event.target instanceof Node && !container.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName && !trimmedEmail) {
      showToast("error", "Name or email is required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName || undefined,
          email: trimmedEmail || undefined,
          preferredCurrency,
        }),
      });

      const json = (await response.json().catch(() => null)) as ApiProfileResponse | null;
      if (!response.ok) {
        throw new Error(json?.error ?? "Unable to save profile.");
      }

      setName(json?.user?.name ?? trimmedName);
      setEmail(json?.user?.email ?? trimmedEmail);
      showToast("success", "Profile updated.");
      setOpen(false);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
          {initials}
        </span>
      </Button>

      {open ? (
        <Card className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(92vw,22rem)] border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/95">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Manage profile</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Clerk-style quick account popup</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex h-36 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-300" />
              </div>
            ) : (
              <form className="space-y-3" onSubmit={onSave}>
                <div className="space-y-2">
                  <Label htmlFor="quick-profile-name">Name</Label>
                  <Input
                    id="quick-profile-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-profile-email">Email</Label>
                  <Input
                    id="quick-profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-profile-currency">Preferred currency</Label>
                  <select
                    id="quick-profile-currency"
                    value={preferredCurrency}
                    onChange={(event) => setPreferredCurrency(event.target.value as SupportedCurrency)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-1">
                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                    onClick={() => setOpen(false)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Full profile
                  </Link>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}