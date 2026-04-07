"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, Mail, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";

type UserData = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  preferredCurrency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  createdAt: string;
};

export function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    preferredCurrency: "USD" as UserData["preferredCurrency"],
    convertExistingData: true,
  });

  useEffect(() => {
    async function handleSessionExpired() {
      await signOut({ redirect: false });
      showToast("error", "Session expired after database reset. Please sign in again.");
      router.replace("/signin");
    }

    async function loadUser() {
      try {
        const response = await fetch("/api/user/profile");
        if (response.status === 401 || response.status === 404) {
          await handleSessionExpired();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }
        
        const data = await response.json();
        setUser(data.user);
        setForm({
          name: data.user.name || "",
          email: data.user.email || "",
          preferredCurrency: data.user.preferredCurrency || "USD",
          convertExistingData: true,
        });
      } catch (error) {
        showToast("error", "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router, showToast]);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.status === 401 || response.status === 404) {
        await signOut({ redirect: false });
        showToast("error", "Session expired after database reset. Please sign in again.");
        router.replace("/signin");
        return;
      }

      if (!response.ok) throw new Error("Failed to update profile");

      const data = await response.json();
      setUser(data.user);
      setEditing(false);
      if (data.converted) {
        showToast("success", "Profile updated and existing amounts were converted.");
      } else {
        showToast("success", "Profile updated successfully!");
      }
    } catch (error) {
      showToast("error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoadingSkeleton variant="app" />;
  }

  return (
    <main className="page-shell dock-safe app-surface min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="hover-rise inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 transition-all duration-200 ease-out hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 motion-reduce:transition-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
        </div>

        {/* Profile Card */}
        <div className="card-lift rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30">
          <div className="flex items-start justify-between">
            <div>
               <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>
               <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your account information</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                 className="hover-rise cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="mt-8 space-y-6">
            {/* Name */}
            <div>
               <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <User className="h-4 w-4" />
                Full Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                   className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition-all duration-200 ease-out focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 motion-reduce:transition-none"
                  placeholder="Enter your name"
                />
              ) : (
                 <p className="text-lg text-slate-900 dark:text-slate-100">{user?.name || "Not set"}</p>
              )}
            </div>

            {/* Email */}
            <div>
               <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              {editing ? (
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                   className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition-all duration-200 ease-out focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 motion-reduce:transition-none"
                  placeholder="Enter your email"
                />
              ) : (
                 <p className="text-lg text-slate-900 dark:text-slate-100">{user?.email || "Not set"}</p>
              )}
            </div>

            {/* Member Since */}
            <div>
               <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="h-4 w-4" />
                Member Since
              </label>
               <p className="text-lg text-slate-900 dark:text-slate-100">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                }) : "Unknown"}
              </p>
            </div>

            <div>
               <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Preferred Currency
              </label>
              {editing ? (
                <select
                  value={form.preferredCurrency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preferredCurrency: e.target.value as UserData["preferredCurrency"],
                    })
                  }
                   className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition-all duration-200 ease-out focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 motion-reduce:transition-none"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="PHP">PHP</option>
                </select>
              ) : (
                 <p className="text-lg text-slate-900 dark:text-slate-100">{user?.preferredCurrency || "USD"}</p>
              )}
            </div>

            <div>
               <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.convertExistingData}
                  onChange={(e) =>
                    setForm({ ...form, convertExistingData: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Convert existing data when currency changes
              </label>
               <p className="text-xs text-slate-500 dark:text-slate-400">Turn this off if you only want new entries to use the new currency.</p>
            </div>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="mt-8 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-all duration-200 ease-out hover:bg-blue-700 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-slate-300 motion-reduce:transition-none"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
              <button
                onClick={() => {
                   setEditing(false);
                   setForm({
                     name: user?.name || "",
                     email: user?.email || "",
                     preferredCurrency: user?.preferredCurrency || "USD",
                     convertExistingData: true,
                   });
                 }}
                disabled={saving}
                 className="cursor-pointer rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Security</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your password and security settings</p>
          
          <a
            href="/profile/change-password"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
          >
            Change Password
          </a>
        </div>
      </div>
    </main>
  );
}
