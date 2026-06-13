import { useEffect, useCallback, useRef } from "react";
import { listQuotes, updateQuote } from "@/api/quotes";
import { needsFollowUp, getNextFollowUpStatus } from "./followUpHelper";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function useFollowUpEngine() {
  const runningRef = useRef(false);

  const checkAndUpdateFollowUps = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const allQuotes = (await listQuotes()) || [];
      const updates = [];
      for (const quote of allQuotes) {
        if (needsFollowUp(quote)) {
          const nextStatus = getNextFollowUpStatus(quote.status);
          if (nextStatus) {
            updates.push(updateQuote(quote.id, { status: nextStatus }));
          }
        }
      }
      if (updates.length) await Promise.all(updates);
    } catch (e) {
      // Camada nova lança erro (o antigo localClient engolia) — o motor de
      // background nunca pode quebrar a UI, então apenas logamos.
      console.error("[FollowUp engine]", e);
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkAndUpdateFollowUps();
    const interval = setInterval(checkAndUpdateFollowUps, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkAndUpdateFollowUps]);

  return { checkAndUpdateFollowUps };
}
