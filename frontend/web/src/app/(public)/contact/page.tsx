"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Clock, MapPin, Globe, Github, Linkedin } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  usePageTitle("Contact Us");

  function validateEmail(value: string) {
    return /.+@.+\..+/.test(value);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !subject || !message || !validateEmail(email)) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    // Simulate request
    await new Promise((r) => setTimeout(r, 800));
    setStatus("success");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  }

  const inputClassName = "mt-1 w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-3 py-2 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 space-y-12">
      {/* Header */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--groups1-text)]">
          Contact us
        </h1>
        <p className="text-lg text-[var(--groups1-text-secondary)] max-w-2xl mx-auto">
          We usually reply within one business day.
        </p>
      </section>

      {/* Content */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form */}
          <Card variant="groups1" className="border-2 border-[var(--groups1-primary)]/20">
            <CardContent variant="groups1" className="p-6">
              <h2 className="text-xl font-bold text-[var(--groups1-text)] mb-6">Send us a message</h2>
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                    Subject
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="How can we help?"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    placeholder="Tell us a bit more..."
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                  >
                    {status === "submitting" ? "Sending..." : "Send message"}
                  </Button>
                  {status === "success" && (
                    <div className="rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-700 dark:text-green-400">
                      Thanks! We'll be in touch.
                    </div>
                  )}
                  {status === "error" && (
                    <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-400">
                      Please complete all fields with a valid email.
                    </div>
                  )}
                </div>
                <div className="text-xs text-[var(--groups1-text-secondary)]">
                  Alternatively, email us at{" "}
                  <a
                    className="text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] underline"
                    href="mailto:avishekdevnath@gmail.com"
                  >
                    avishekdevnath@gmail.com
                  </a>
                  .
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Contact info */}
          <div className="space-y-6">
            <Card variant="groups1" className="border-2 border-[var(--groups1-primary)]/20">
              <CardContent variant="groups1" className="p-6">
                <h2 className="text-xl font-bold text-[var(--groups1-text)] mb-4">Get in touch</h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-[var(--groups1-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">Email</div>
                      <a
                        className="text-sm text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] underline"
                        href="mailto:avishekdevnath@gmail.com"
                      >
                        avishekdevnath@gmail.com
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-[var(--groups1-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">Phone</div>
                      <a
                        className="text-sm text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] underline"
                        href="tel:+8801874819713"
                      >
                        +880 1874-819-713
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-[var(--groups1-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">Hours</div>
                      <div className="text-sm text-[var(--groups1-text)]">Mon–Fri, 9am–5pm (UTC)</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[var(--groups1-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">Address</div>
                      <div className="text-sm text-[var(--groups1-text)]">Remote‑first</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card variant="groups1">
              <CardContent variant="groups1" className="p-6">
                <h3 className="text-lg font-bold text-[var(--groups1-text)] mb-2">Founder</h3>
                <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">Reach out directly:</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="mailto:avishekdevnath@gmail.com"
                    className="inline-flex items-center gap-2 text-sm text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                  >
                    <Mail className="h-4 w-4" /> Email
                  </a>
                  <a
                    href="tel:+8801874819713"
                    className="inline-flex items-center gap-2 text-sm text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                  >
                    <Phone className="h-4 w-4" /> Phone
                  </a>
                  <Link
                    href="https://avishekdevnath.vercel.app/"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </Link>
                  <Link
                    href="https://github.com/Avishekdevnath"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                  >
                    <Github className="h-4 w-4" /> GitHub
                  </Link>
                  <Link
                    href="https://www.linkedin.com/in/avishek-devnath/"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                  >
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card variant="groups1">
              <CardContent variant="groups1" className="p-6">
                <h3 className="text-lg font-bold text-[var(--groups1-text)] mb-2">Status</h3>
                <p className="text-sm text-[var(--groups1-text-secondary)]">
                  Public launch in 2025. Join the updates list on the home page.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}


