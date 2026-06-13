import { useState, useEffect } from "react";
import { fetchEurBrlRate } from "@/shared/lib/exchangeRate";

export function useEurBrlRate() {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await fetchEurBrlRate(forceRefresh);
      setRate(data);
      setError(null);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { rate, loading, error, refresh: () => load(true) };
}
