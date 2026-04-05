import Skeleton from "@mui/material/Skeleton";

type PageLoadingSkeletonProps = {
  variant: "landing" | "app" | "auth";
};

const skeletonTone = {
  light: "rgba(148, 163, 184, 0.18)",
  dark: "rgba(255, 255, 255, 0.09)",
};

function line(width: string | number, height = 18, dark = false) {
  return (
    <Skeleton
      animation="wave"
      variant="rounded"
      width={width}
      height={height}
      sx={{
        bgcolor: dark ? skeletonTone.dark : skeletonTone.light,
        "&::after": { animationDuration: "1.9s" },
      }}
    />
  );
}

function card(height: number, dark = false) {
  return (
    <Skeleton
      animation="wave"
      variant="rounded"
      height={height}
      sx={{
        bgcolor: dark ? skeletonTone.dark : skeletonTone.light,
        borderRadius: 3,
        "&::after": { animationDuration: "1.9s" },
      }}
    />
  );
}

export function PageLoadingSkeleton({ variant }: PageLoadingSkeletonProps) {
  if (variant === "landing") {
    return (
      <main className="page-shell relative min-h-screen overflow-hidden bg-slate-950 text-white dark-page">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
          <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
            <div className="space-y-2">
              {line(96, 12, true)}
              {line(210, 10, true)}
            </div>
            <div className="flex items-center gap-3">
              {line(88, 40, true)}
              {line(88, 40, true)}
              {line(88, 40, true)}
            </div>
          </div>

          <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-2xl space-y-5">
              {line(220, 24, true)}
              {line("85%", 120, true)}
              {line("72%", 22, true)}
              <div className="flex flex-wrap gap-4 pt-3">
                {line(160, 48, true)}
                {line(176, 48, true)}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-3">
                    {line(96, 12, true)}
                    {line(180, 44, true)}
                  </div>
                  {line(120, 30, true)}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {card(92, true)}
                  {card(92, true)}
                  {card(92, true)}
                </div>
                {card(138, true)}
              </div>
            </div>
          </section>

          <section className="pb-16">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="space-y-3">
                    {line(88, 16, true)}
                    {line("88%", 60, true)}
                    {line("70%", 12, true)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (variant === "auth") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <div className="space-y-4">
            {line(128, 14)}
            {line("72%", 36)}
            {line("58%", 18)}
          </div>
          <div className="mt-8 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                {line(96, 12)}
                {card(48)}
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-3">
            {line("100%", 48)}
            {line("100%", 48)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell min-h-screen bg-white px-6 py-8 text-slate-900 dark:bg-slate-900 dark:text-slate-100 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              {line(72, 12)}
              {line(280, 34)}
              {line(360, 18)}
            </div>
            {line(160, 40)}
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/60">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex-1">{line("100%", 40)}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>{card(112)}</div>
          ))}
        </section>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {card(420)}
          {card(420)}
        </section>
      </div>
    </main>
  );
}