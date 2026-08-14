"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { ScoreRecord } from "./types";

interface DataState {
  records: ScoreRecord[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  uploadRecords: (
    records: ScoreRecord[],
    mode: "replace" | "append"
  ) => Promise<{ success: boolean; message?: string }>;
  clearCategory: (
    category: "내신" | "모의고사"
  ) => Promise<{ success: boolean; message?: string }>;
}

const DataContext = createContext<DataState | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/records");
      if (res.ok) {
        setRecords(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      refresh();
    } else if (status === "unauthenticated") {
      setRecords([]);
    }
  }, [status, refresh]);

  const uploadRecords: DataState["uploadRecords"] = async (newRecords, mode) => {
    const res = await fetch("/api/records/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: newRecords, mode }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, message: body.error ?? "업로드에 실패했습니다." };
    }
    await refresh();
    return { success: true };
  };

  const clearCategory: DataState["clearCategory"] = async (category) => {
    const res = await fetch("/api/records/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, message: body.error ?? "삭제에 실패했습니다." };
    }
    await refresh();
    return { success: true };
  };

  return (
    <DataContext.Provider value={{ records, isLoading, refresh, uploadRecords, clearCategory }}>
      {children}
    </DataContext.Provider>
  );
}

export function useScoreData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useScoreData는 DataProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
