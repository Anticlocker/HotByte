"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyMenuRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Gracefully redirect direct menu requests to our default tenant 'hotbyte'
    router.replace("/hotbyte/menu");
  }, [router]);

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 animate-pulse">
        Directing to dining station...
      </p>
    </div>
  );
}
