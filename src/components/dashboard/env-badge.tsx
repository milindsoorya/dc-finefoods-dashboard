"use client";

export function EnvBadge() {
  const env = process.env.NEXT_PUBLIC_APP_ENV || "development";

  if (env === "production") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-yellow-500 text-yellow-950 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
      {env}
    </div>
  );
}
