// src/lib/hooks/useSubscription.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface Plan {
  plan_id: number;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: any;
}

export interface HotelSubscription {
  plan_id: number;
  start_date: string;
  expiry_date: string;
  status: string;
  name?: string;
  price_monthly?: number;
  price_yearly?: number;
  features?: any;
}

export const useSubscription = () => {
  const { data: plansData, error: plansError, mutate: mutatePlans } = useSWR<
    { success: boolean; plans: Plan[] }
  >('/api/admin/subscription-plans', fetcher);

  const { data: hotelSubData, error: hotelSubError, mutate: mutateHotelSub } = useSWR<
    { success: boolean; subscription: HotelSubscription | null }
  >('/api/admin/hotel-subscription', fetcher);

  const loading = !plansData || !hotelSubData;
  const error = plansError || hotelSubError;

  return {
    plans: plansData?.plans ?? [],
    currentSubscription: hotelSubData?.subscription ?? null,
    loading,
    error,
    mutate: async () => {
      await mutatePlans();
      await mutateHotelSub();
    },
  };
};
