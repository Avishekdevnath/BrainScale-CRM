"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ContactSection() {
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 800); // placeholder
  };

  return (
    <section className="flex min-h-[80vh] items-center">
      <div className="w-full section-alt border border-[color-mix(in_oklab,var(--border) 30%,transparent)] bg-[color-mix(in_oklab,var(--background) 75%,transparent)] dark:bg-[color-mix(in_oklab,var(--background) 35%,transparent)] px-6 py-10 sm:px-10">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-gradient">Get in touch</h2>
          <p className="text-[hsl(var(--muted-foreground))]">We'd love to hear from you.</p>
        </div>
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-8 max-w-xl space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Your name" required />
            <Input type="email" placeholder="Email address" required />
          </div>
          <textarea
            placeholder="How can we help?"
            required
            className="min-h-[140px] w-full rounded-md border border-[hsl(var(--border))] bg-[color-mix(in_oklab,var(--card) 70%,transparent)] px-3 py-2 text-sm shadow-xs backdrop-blur-sm transition-[color,box-shadow] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--ring))] dark:bg-[color-mix(in_oklab,var(--muted) 30%,transparent)]"
          />
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Sending…" : "Send message"}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}


