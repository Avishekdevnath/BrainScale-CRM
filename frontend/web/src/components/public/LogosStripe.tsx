"use client";
import { motion } from "framer-motion";

const logos = ["Acme", "Globex", "Umbrella", "Initech", "Hooli", "Vehement"];

export function LogosStripe() {
  const row = [...logos, ...logos];
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="w-full">
        <p className="text-center text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Trusted by modern teams
        </p>
        <div className="marquee mt-6">
          <div className="marquee-track">
            {row.map((name, idx) => (
              <div
                key={name + idx}
                className="flex items-center justify-center h-14 w-40 rounded-md border border-[hsl(var(--border))] bg-white/60 dark:bg-white/5"
              >
                <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


