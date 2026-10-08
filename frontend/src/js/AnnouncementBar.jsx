import React, { useEffect, useState } from "react";
import { API } from "./config";

export default function AnnouncementBar() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/announcements/active`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Announcement load failed", err);
      }
    };

    load();
    const id = setInterval(load, 5 * 1000); // refresh every 5s

    const handler = () => load();
    window.addEventListener("announcements-updated", handler);

    return () => {
      clearInterval(id);
      window.removeEventListener("announcements-updated", handler);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="relative z-50 bg-amber-900/70 border-b border-amber-700/60 text-amber-100 text-sm backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
        {items.map((a) => (
          <div key={a._id || a.message} className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-800 text-[11px] font-semibold uppercase tracking-wide">
              Notice
            </span>
            <span className="font-medium">{a.message}</span>
            {(a.startAt || a.endAt) && (
              <span className="text-amber-200/80 text-xs">
                {a.startAt ? new Date(a.startAt).toLocaleString() : "Now"} →{" "}
                {a.endAt ? new Date(a.endAt).toLocaleString() : "Until turned off"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
