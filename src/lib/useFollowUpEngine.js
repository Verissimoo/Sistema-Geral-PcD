import { useEffect, useCallback, useRef } from "react";
import { localClient } from "@/api/localClient";
import { needsFollowUp, getNextFollowUpStatus } from "./followUpHelper";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function useFollowUpEngine() {
  const runningRef = useRef(false);

  const checkAndUpdateFollowUps = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const allQuotes = (await localClient.entities.Quotes.list()) || [];
      const updates = [];
      for (const quote of allQuotes) {
        if (needsFollowUp(quote)) {
          const nextStatus = getNextFollowUpStatus(quote.status);
          if (nextStatus) {
            updates.push(
              localClient.entities.Quotes.update(quote.id, { status: nextStatus })
            );
          }
        }
      }
      if (updates.length) await Promise.all(updates);
    } catch (e) {
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
