// See-also widget for blog posts.
//
// Blog posts live in their own /blog silo and — before this — linked
// almost exclusively to other /blog posts via the RelatedPosts
// widget. That silos the internal-link graph: readers who land on a
// post via search never get pushed toward the money pages, guides,
// comparisons, or installer directories where the platform's real
// commercial + AEO value sits.
//
// SEE_ALSO_MAP hand-maps each currently-published blog slug to 3
// contextually-adjacent deep pages. Every destination is a real,
// indexed page. When a blog slug isn't in the map (a new post ships
// before the map is updated) the widget renders nothing — a missing
// entry fails safe, not with a stale/wrong link.

import * as React from "react";
import { RelatedCard } from "@/components/marketing/related-card";

interface SeeAlsoEntry {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
}

const SEE_ALSO_MAP: Record<string, SeeAlsoEntry[]> = {
  "air-source-vs-ground-source-heat-pump": [
    {
      href: "/compare/air-source-vs-ground-source-heat-pump",
      eyebrow: "Comparison",
      title: "ASHP vs GSHP — full comparison",
      body: "Deeper breakdown: install cost, running cost, groundworks, and where each wins in the UK context.",
    },
    {
      href: "/guides/bus-application-walkthrough",
      eyebrow: "Guide",
      title: "How the £7,500 BUS grant works",
      body: "Both ASHP + GSHP qualify. Step-by-step: eligibility, installer nominates, Ofgem approves.",
    },
    {
      href: "/heat-pump-installers",
      eyebrow: "Directory",
      title: "MCS-certified heat pump installers",
      body: "5,500+ installers indexed. Every entry BUS-registered.",
    },
  ],

  "best-tariff-for-heat-pump-uk": [
    {
      href: "/compare/heat-pump-tariffs",
      eyebrow: "Comparison",
      title: "Heat pump electricity tariffs UK 2026",
      body: "Cosy vs British Gas Heat Pump Plus vs EDF GoElectric vs E.ON Next Heat Pump — head-to-head.",
    },
    {
      href: "/guides/heat-pump-smart-tariff-setup",
      eyebrow: "Guide",
      title: "Setting up a heat pump on a smart tariff",
      body: "Weather compensation + scheduling — the practical setup that unlocks the cheap-rate savings.",
    },
    {
      href: "/guides/heat-pump-running-costs-vs-gas",
      eyebrow: "Guide",
      title: "Heat pump vs gas — running costs compared",
      body: "The delta a smart tariff creates against gas — real annual costs on flat-rate vs Cosy.",
    },
  ],

  "do-heat-pumps-work-in-old-houses": [
    {
      href: "/guides/fabric-first-retrofit-before-heat-pump",
      eyebrow: "Guide",
      title: "Fabric-first retrofit before a heat pump",
      body: "Loft, cavity, glazing — what to fix first so the pump is sized right + BUS eligibility is clear.",
    },
    {
      href: "/compare/heat-pump-vs-gas-boiler",
      eyebrow: "Comparison",
      title: "Heat pump vs gas boiler",
      body: "The lifetime-cost comparison for an existing-property retrofit decision.",
    },
    {
      href: "/heatpump",
      eyebrow: "Check",
      title: "Free heat pump pre-survey",
      body: "5 minutes — we read your EPC + floorplan, check the fit before you brief an installer.",
    },
  ],

  "gas-boiler-ban-uk-2035": [
    {
      href: "/replace-my-boiler",
      eyebrow: "Check",
      title: "New boiler or heat pump?",
      body: "Compare the all-in cost of a like-for-like boiler swap vs a heat pump with the £7,500 grant.",
    },
    {
      href: "/compare/heat-pump-vs-gas-boiler",
      eyebrow: "Comparison",
      title: "Heat pump vs gas boiler",
      body: "Head-to-head on install cost, running cost, lifespan, and carbon for a UK mains-gas home.",
    },
    {
      href: "/guides/bus-application-walkthrough",
      eyebrow: "Guide",
      title: "How the £7,500 BUS grant works",
      body: "The grant that changes the maths if you're switching before the ban forces the decision.",
    },
  ],

  "heat-pump-for-flat-or-leasehold": [
    {
      href: "/guides/mcs-020-noise-rules-explained",
      eyebrow: "Guide",
      title: "MCS 020 heat pump noise rules",
      body: "The permitted-development noise limit — critical for flats + terraces with close neighbours.",
    },
    {
      href: "/guides/bus-application-walkthrough",
      eyebrow: "Guide",
      title: "How the £7,500 BUS grant works",
      body: "Leaseholders qualify with landlord permission + a 3+ year lease. The specific requirements.",
    },
    {
      href: "/heat-pump-installers",
      eyebrow: "Directory",
      title: "MCS-certified heat pump installers",
      body: "Directory of installers with experience of flat + leasehold installs.",
    },
  ],

  "heat-pump-noise-rules-uk": [
    {
      href: "/guides/mcs-020-noise-rules-explained",
      eyebrow: "Guide",
      title: "MCS 020 heat pump noise rules explained",
      body: "The 42 dB(A) 1-metre limit + how installers actually measure and prove compliance.",
    },
    {
      href: "/guides/mcs-site-visit-what-to-expect",
      eyebrow: "Guide",
      title: "What to expect at an MCS site visit",
      body: "Where the noise-assessment measurement happens on the site visit — before the install goes ahead.",
    },
    {
      href: "/heat-pump-installers",
      eyebrow: "Directory",
      title: "MCS-certified heat pump installers",
      body: "Every entry MCS-certified — noise assessment is part of the standard install checklist.",
    },
  ],

  "heat-pump-running-costs-uk": [
    {
      href: "/guides/heat-pump-running-costs-vs-gas",
      eyebrow: "Guide",
      title: "Heat pump vs gas — running costs compared",
      body: "Full-year running-cost model for a typical UK 3-bed on flat-rate vs smart-tariff electricity.",
    },
    {
      href: "/compare/heat-pump-tariffs",
      eyebrow: "Comparison",
      title: "Heat pump electricity tariffs UK 2026",
      body: "The tariff choice is the biggest single running-cost lever — head-to-head of the four major options.",
    },
    {
      href: "/guides/heat-pump-payback-period-uk",
      eyebrow: "Guide",
      title: "Heat pump payback in the UK",
      body: "Running cost is one of five payback levers. Full payback model + typical ranges.",
    },
  ],

  "heat-pump-wont-save-money-day-one": [
    {
      href: "/guides/heat-pump-payback-period-uk",
      eyebrow: "Guide",
      title: "Heat pump payback in the UK",
      body: "The five levers that shift payback from 12 years to 3-5. Grant + tariff + weather-comp + solar + insulation.",
    },
    {
      href: "/compare/heat-pump-vs-gas-boiler",
      eyebrow: "Comparison",
      title: "Heat pump vs gas boiler",
      body: "Full lifetime-cost comparison. Where the savings actually come from — grant, running cost, lifespan.",
    },
    {
      href: "/guides/heat-pump-smart-tariff-setup",
      eyebrow: "Guide",
      title: "Setting up a heat pump on a smart tariff",
      body: "The practical setup that unlocks the cost gap vs gas — weather compensation + scheduling.",
    },
  ],

  "insulation-before-heat-pump": [
    {
      href: "/guides/fabric-first-retrofit-before-heat-pump",
      eyebrow: "Guide",
      title: "Fabric-first retrofit before a heat pump",
      body: "Full walkthrough: what to do, in what order, so the pump is sized right + BUS eligibility is clear.",
    },
    {
      href: "/guides/bus-application-walkthrough",
      eyebrow: "Guide",
      title: "How the £7,500 BUS grant works",
      body: "BUS requires no outstanding loft/cavity recs on your EPC — insulation is often the gating step.",
    },
    {
      href: "/heatpump",
      eyebrow: "Check",
      title: "Free heat pump pre-survey",
      body: "5 minutes — we flag insulation blockers from your EPC before you spend an installer's time.",
    },
  ],

  "smart-export-guarantee-explained": [
    {
      href: "/compare/solar-vs-no-solar",
      eyebrow: "Comparison",
      title: "Solar vs no solar — is it worth it?",
      body: "SEG earnings are half the solar story. Full payback picture including SEG + self-consumption.",
    },
    {
      href: "/compare/solar-with-battery-vs-solar-alone",
      eyebrow: "Comparison",
      title: "Solar with battery vs solar alone",
      body: "A battery shifts kWh from SEG-rate export to import-rate self-consumption. When it earns its keep.",
    },
    {
      href: "/solar-panel-installers",
      eyebrow: "Directory",
      title: "MCS-certified solar PV installers",
      body: "MCS is required for SEG eligibility — every entry in the directory meets that bar.",
    },
  ],

  "solar-and-heat-pump-together": [
    {
      href: "/compare/solar-with-battery-vs-solar-alone",
      eyebrow: "Comparison",
      title: "Solar with battery vs solar alone",
      body: "A heat pump acts like a big daytime load — changes the battery + self-consumption maths.",
    },
    {
      href: "/compare/heat-pump-tariffs",
      eyebrow: "Comparison",
      title: "Heat pump electricity tariffs UK 2026",
      body: "The tariff choice matters more when you're running both — some tariffs stack solar export credits with cheap-rate windows.",
    },
    {
      href: "/check",
      eyebrow: "Check",
      title: "Free pre-survey (all three)",
      body: "One check covers heat pump + solar + battery so the combined economics are on one page.",
    },
  ],
};

export interface BlogSeeAlsoProps {
  /** Current blog post slug. Determines which curated tiles show. */
  slug: string;
}

export function BlogSeeAlso({ slug }: BlogSeeAlsoProps): React.ReactElement | null {
  const entries = SEE_ALSO_MAP[slug];
  if (!entries || entries.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <h2 className="text-2xl font-bold text-navy mb-6">
          See also on Propertoasty
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((e) => (
            <RelatedCard
              key={e.href}
              href={e.href}
              eyebrow={e.eyebrow}
              title={e.title}
              body={e.body}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
