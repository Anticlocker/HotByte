"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TableQRRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const hotelId = params?.hotelId as string;
    const tableNo = params?.tableNo as string;

    if (hotelId && tableNo) {
      sessionStorage.setItem(`hotbyte_qr_table`, JSON.stringify({ hotel_slug: hotelId, table_number: tableNo }));
      router.replace(`/${hotelId}/menu?table=${tableNo}`);
    } else {
      router.replace("/");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d11]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-gray-400">Loading menu...</p>
      </div>
    </div>
  );
}
