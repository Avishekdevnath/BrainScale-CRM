import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, HeartHandshake, ShieldCheck, TrendingUp, Calendar, Building2, Globe, Github, Linkedin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us | BrainScale CRM",
};

export default function AboutPage() {
  const values = [
    { icon: Sparkles, title: "Focus on outcomes", desc: "We ship features that move KPIs for our customers." },
    { icon: HeartHandshake, title: "Empathy first", desc: "We listen closely and design with users, not for them." },
    { icon: ShieldCheck, title: "Trust by default", desc: "Security, privacy, and reliability are part of day one." },
    { icon: TrendingUp, title: "Always improving", desc: "Small, frequent iterations compound into big wins." },
  ];

  const timeline = [
    { when: "2023", what: "Discovery and interviews with admissions and sales teams." },
    { when: "2024", what: "Product development, private beta, and early customer pilots." },
    { when: "2025", what: "Public launch with core features and initial integrations." },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 space-y-16">
      {/* Header */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--groups1-text)]">
          About BrainScale CRM
        </h1>
        <p className="text-lg text-[var(--groups1-text-secondary)] max-w-2xl mx-auto">
          A modern CRM for calls, follow-ups, and team workflows.
        </p>
      </section>

      {/* Mission & story */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="groups1" className="border-2 border-[var(--groups1-primary)]/20">
            <CardContent variant="groups1" className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--groups1-primary)] mb-3">
                <Building2 className="h-4 w-4" /> Mission
              </div>
              <p className="text-[var(--groups1-text-secondary)] leading-relaxed">
                Help teams engage faster and more reliably by simplifying call logging, follow-ups, and
                reporting — so you spend more time with customers and less time in tools.
              </p>
            </CardContent>
          </Card>
          <Card variant="groups1" className="border-2 border-[var(--groups1-primary)]/20">
            <CardContent variant="groups1" className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--groups1-primary)] mb-3">
                <Calendar className="h-4 w-4" /> Our story
              </div>
              <p className="text-[var(--groups1-text-secondary)] leading-relaxed">
                We started after watching admissions and sales teams struggle with fragmented workflows. BrainScale CRM
                brings calling, follow-ups, and analytics into one streamlined place.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Founder */}
      <section>
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-[var(--groups1-text)]">Founder</h2>
          <p className="text-[var(--groups1-text-secondary)]">Built with care and focus.</p>
        </div>
        <div className="mx-auto max-w-xl">
          <Card variant="groups1" className="border-2 border-[var(--groups1-primary)]/20">
            <CardContent variant="groups1" className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] text-lg font-bold flex items-center justify-center flex-shrink-0">
                  AD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-lg text-[var(--groups1-text)]">Avishek Devnath</div>
                  <div className="text-sm text-[var(--groups1-text-secondary)] mt-1">
                    Founder & Full‑stack Engineer
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <a
                      href="https://avishekdevnath.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                    >
                      <Globe className="h-4 w-4" /> Website
                    </a>
                    <a
                      href="https://github.com/Avishekdevnath"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                    >
                      <Github className="h-4 w-4" /> GitHub
                    </a>
                    <a
                      href="https://www.linkedin.com/in/avishek-devnath/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] transition-colors"
                    >
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section>
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-[var(--groups1-text)]">Our values</h2>
          <p className="text-[var(--groups1-text-secondary)]">
            Principles that guide how we build and support.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map(({ icon: Icon, title, desc }) => (
            <Card key={title} variant="groups1" className="h-full transition hover:shadow-md">
              <CardContent variant="groups1" className="p-6">
                <div className="flex items-center gap-2 font-semibold text-[var(--groups1-text)] mb-3">
                  <div className="h-8 w-8 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  {title}
                </div>
                <p className="text-sm text-[var(--groups1-text-secondary)] leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section>
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-[var(--groups1-text)]">Milestones</h2>
          <p className="text-[var(--groups1-text-secondary)]">A few highlights along the way.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {timeline.map(({ when, what }, index) => (
            <Card key={when} variant="groups1" className="relative">
              <CardContent variant="groups1" className="p-6">
                <div className="text-sm font-semibold text-[var(--groups1-primary)] mb-2">{when}</div>
                <p className="text-sm text-[var(--groups1-text-secondary)] leading-relaxed">{what}</p>
                {index < timeline.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-[var(--groups1-border)]" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Global presence */}
      <section>
        <Card variant="groups1" className="border-2 border-[var(--groups1-primary)]/20">
          <CardContent variant="groups1" className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 font-semibold text-[var(--groups1-text)] mb-2">
              <div className="h-8 w-8 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] flex items-center justify-center">
                <Globe className="h-4 w-4" />
              </div>
              Remote-first, globally distributed
            </div>
            <p className="text-[var(--groups1-text-secondary)] mt-2">
              We collaborate across time zones with async-first culture.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Contact / Press */}
      <section>
        <Card variant="groups1" className="border-2 border-[var(--groups1-primary)]/20">
          <CardContent variant="groups1" className="p-8 text-center">
            <h3 className="text-xl font-bold text-[var(--groups1-text)] mb-2">Contact & press</h3>
            <p className="text-[var(--groups1-text-secondary)] mb-6">
              Have questions or press inquiries? We'd love to hear from you.
            </p>
            <Link href="/contact">
              <Button className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]">
                Get in touch
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


