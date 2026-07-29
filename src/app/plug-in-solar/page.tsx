// /plug-in-solar — pillar page for the new UK plug-in solar vertical.
//
// News peg: BS 7671 Amendment 4 (16 March 2026, in force 15 April
// 2026) legalises plug-in solar up to 800W AC in the UK. Statutory
// instrument SI 2026/848 (16 July 2026) formalises the retail-sale
// rules from 27 August 2026. That's a HUGE search-volume shift for
// terms like "plug in solar UK", "balcony solar UK", "800W solar"
// — and existing competitors are all sub-scale niche sites. First-
// mover advantage window closes when this becomes mainstream.
//
// Content strategy: this is the pillar/hub. Sub-pages under
// /plug-in-solar/[topic] fan out from here (legal explainer, best
// kits, for-renters, for-flats, vs-rooftop) as follow-up PRs.
//
// Affiliate policy: kit recommendations link out to manufacturer
// UK pages + Amazon via ?tag=<tbd> once Jim signs up for Amazon
// Associates UK. Placeholder tag `propertoasty-21` in the URLs
// below — swap when the tag lands or convert to bare links if he
// doesn't want affiliate. Direct links (no tag) still work.
//
// Sources of authoritative fact — kept in the sources block so
// AEOPage renders them at the end:
//   - IET / BSI: BS 7671 Amendment 4
//   - HM Government: SI 2026/848
//   - ENA: G98 notification form + Type Test Register

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { PlugInSolarCalculator } from "@/components/plug-in-solar/calculator";
import { JourneyCTA } from "@/components/analytics/journey-cta";

const URL = "https://www.propertoasty.com/plug-in-solar";

// Amazon Associates UK tag placeholder — swap when Jim's tag lands.
// Kept as a single constant so a search-and-replace covers every
// affiliate link on the page.
const AMAZON_TAG = "propertoasty-21";
const amz = (asin: string) =>
  `https://www.amazon.co.uk/dp/${asin}?tag=${AMAZON_TAG}`;

export const metadata: Metadata = {
  title: "Plug-in solar UK 2026: legal, cost + best kits",
  description:
    "Plug-in solar is legal in the UK from April 2026. Best 800W kits, real cost, payback and whether it's worth it for renters, flats and small homes.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Plug-in solar UK 2026: legal, cost + best kits",
    description:
      "The UK's 800W plug-in solar rules explained, plus the best kits homeowners and renters can buy today.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
  },
};

export default function PlugInSolarHub() {
  return (
    <AEOPage
      headline="Plug-in solar in the UK: what changed in 2026 and what to buy"
      description="Plug-in solar is now legal in the UK. Here's what the 800W rule actually means, how much a kit costs, and which options work for renters, flats, and small homes."
      url={URL}
      image="/hero-solar.jpg"
      datePublished="2026-07-25"
      dateModified="2026-07-25"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Plug-in solar"
      kind="article"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Plug-in solar" },
      ]}
      related={[
        {
          href: "/solar-panels",
          eyebrow: "Solar",
          title: "Rooftop solar in the UK",
          body: "The full route — a 4 kW system professionally installed, with the option to sell extra electricity back to the grid. Compare against plug-in on scale and payback.",
        },
        {
          href: "/check/solar",
          eyebrow: "Check",
          title: "Free 5-minute solar pre-survey",
          body: "Rooftop-focused, but gives you the direction and sunlight numbers even if you settle on a balcony kit.",
        },
        {
          href: "/blog",
          eyebrow: "Journal",
          title: "Latest UK solar + heat pump journalism",
          body: "How grants shift, what the government funds, and the latest UK install trends.",
        },
      ]}
      directAnswer="Plug-in solar became legal in the UK in April 2026. You buy a kit for £400–£900, hang the panel on a balcony or wall, plug it into a normal socket, and it starts cutting your electricity bill. There's an 800 watt limit on how much it can push into your home. On a south-facing balcony, the kit pays for itself in 3–5 years. Ideal if you rent, live in a flat, or don't have a suitable roof."
      tldr={[
        "Legal in the UK from April 2026. Shops can sell kits openly from 27 August 2026.",
        "800 watt limit on what the kit pushes into your home — the panels can be bigger; the box in the middle caps the output.",
        "One-page notification form to your local grid network within 28 days of plugging in. Most kits ship with it pre-filled.",
        "Kit costs £400–£900. Pays itself back in 3–5 years on a south-facing balcony.",
        "Best fit: renters, flats, small terraces, garden studios — anywhere rooftop solar isn't an option.",
      ]}
      faqs={[
        {
          question: "Is plug-in solar legal in the UK?",
          answer:
            "Yes. The UK wiring rules were updated in April 2026 to explicitly allow plug-in solar kits up to 800 watts. From 27 August 2026, shops can sell them openly. Before the update, plug-in kits sat in a grey zone — you could plug them in, but electricians wouldn't sign them off and insurers weren't sure how to treat them. The 2026 changes fix that.",
        },
        {
          question: "What is the 800 watt limit?",
          answer:
            "The 800 watt cap is on what actually gets pushed into your home, not on the panels themselves. Panels can total up to 2,000 watts; the box in the middle (called an inverter) automatically holds output at 800 watts. That's why a two-panel kit — each around 430 to 450 watts — is the sweet spot: you get more electricity on cloudy days without wasting anything on sunny ones. It matches the German rule that has been running since 2024.",
        },
        {
          question: "Do I need to tell my energy supplier?",
          answer:
            "Not your supplier — you notify the company that owns the electricity cables in your street (called your 'network operator'). It's a one-page form. Most kits ship with it pre-filled. You have 28 days after plugging in to post it. Nobody has to approve anything before you plug in — you plug in first, then post the form.",
        },
        {
          question: "How much does a plug-in solar kit cost?",
          answer:
            "£400 to £900 for a complete 800 watt kit as of mid-2026. Budget kits (one 400 watt panel plus mount) start around £400. Mid-range kits with two panels and a branded mount start around £700. Kits paired with a small portable battery push toward £1,500 or more — the battery itself sits outside the plug-in solar rules but people often buy both together.",
        },
        {
          question: "Can I use plug-in solar if I rent?",
          answer:
            "Yes — this is one of the very few solar options renters can use. It plugs into a standard socket, doesn't need any drilling if you use a balcony rail mount, and moves with you when you leave. Worth checking your tenancy for any clause about attaching things to balconies. Most landlords are neutral because there's no electrical work being done on the property.",
        },
        {
          question: "How long is the payback?",
          answer:
            "3 to 5 years for a south-facing 800 watt kit at UK electricity prices. It generates roughly 700 to 850 units of electricity a year — worth £190 to £230 at the current 27p per unit price cap, assuming you're at home to use most of what it produces. East or west-facing kits generate about 20% less. North-facing isn't worth doing.",
        },
        {
          question: "Can I add a battery to a plug-in solar kit?",
          answer:
            "Not within the plug-in solar rules — the new law explicitly leaves batteries out of the plug-in scope. If you want battery storage, two options: buy a portable power station (charge it from the plug-in kit during the day, use it in the evening — no restrictions on doing that), or go the full route with an installer-fitted home battery.",
        },
        {
          question: "Is plug-in solar better than rooftop solar?",
          answer:
            "Different tool for different jobs. Plug-in solar produces around 400 to 800 watts — enough to cover baseline usage like the fridge, router, and things on standby, plus a chunk of daytime use. Rooftop solar is typically 3,500 to 6,000 watts — enough to seriously cut a family's bill and pair with a battery for evenings. Plug-in fills the gap for people rooftop can't reach: renters, flat-dwellers, terraces without owner permission, garden studios.",
        },
        {
          question: "Do I need MCS certification for plug-in solar?",
          answer:
            "No. MCS certification is required for the £7,500 Boiler Upgrade Scheme grant and for the Smart Export Guarantee (the scheme that pays you for extra electricity sold back to the grid). Neither applies to plug-in solar — the 800 watt kit doesn't export to the grid (the box in the middle holds back when you're not using much), so you skip both the certification cost and the export earnings.",
        },
      ]}
      sources={[
        {
          name: "IET — BS 7671:2018+A4:2026 (Wiring Regulations, 18th Edition, Amendment 4)",
          url: "https://electrical.theiet.org/bs-7671/",
          accessedDate: "July 2026",
        },
        {
          name: "GOV.UK / legislation.gov.uk — SI 2026/848",
          url: "https://www.legislation.gov.uk/uksi/2026",
          accessedDate: "July 2026",
        },
        {
          name: "Energy Networks Association — G98 notification form + Type Test Register",
          url: "https://www.energynetworks.org/industry-hub/resource-library/g98-forms",
          accessedDate: "July 2026",
        },
        {
          name: "Ofgem — Smart Export Guarantee (SEG)",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "July 2026",
        },
        {
          name: "European Commission — Photovoltaic Geographical Information System (PVGIS)",
          url: "https://re.jrc.ec.europa.eu/pvg_tools/en/",
          accessedDate: "July 2026",
        },
      ]}
    >
      {/* Jump CTA — for readers who came in via the homepage picker
          (or an inbound link with #calculator) and want to skip
          straight to the interactive block. Also gives us a
          journey_started event to pair with the calculator's
          journey_completed on mount. */}
      <p className="not-prose mt-6 mb-2 flex justify-center">
        <JourneyCTA
          href="#calculator"
          journey="plug_in_solar"
          source="plug_in_solar_landing_hero"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-semibold text-sm transition-colors shadow-sm"
        >
          Try the calculator ↓
        </JourneyCTA>
      </p>

      {/* Calculator hero — the fast path from "curious" to
          "ready to buy". Sits at the top so consumers who don't
          want to read a 2,500 word explainer get straight to a
          number for their situation. */}
      <div id="calculator" className="scroll-mt-16">
        <PlugInSolarCalculator />
      </div>

      <h2>What changed in April 2026</h2>
      <p>
        For years, plug-in solar sat in a UK grey zone. The kits
        were on Amazon, Germany was installing hundreds of thousands
        a year, but the UK&rsquo;s{" "}
        <a
          href="https://electrical.theiet.org/bs-7671/"
          target="_blank"
          rel="noopener noreferrer"
        >
          wiring rules
        </a>{" "}
        didn&rsquo;t formally recognise them. Electricians
        wouldn&rsquo;t sign them off, insurers weren&rsquo;t sure how
        to treat them, and every review site had a &ldquo;probably
        fine but check first&rdquo; disclaimer.
      </p>
      <p>
        That changed in April 2026, when the wiring rules were
        updated to explicitly cover plug-in solar for the first time.
        Then, from 27 August 2026, shops and websites can start
        selling them properly: kits have to ship with clear labelling
        about the 800 watt limit and be on a public register of
        tested equipment. From that date, you can walk into an
        electrical retailer, buy a kit, and plug it in yourself.
      </p>

      <h2>The 800 watt rule, in plain English</h2>
      <p>
        The 800 watt limit is on what gets pushed into your home,
        not on the panels themselves. Panels can add up to 2,000
        watts total; the box in the middle (called an inverter)
        automatically holds output at 800 watts whenever the panels
        would produce more. In practice a two-panel kit — each around
        430 to 450 watts — is the sweet spot. You get more electricity
        on cloudy days when panels aren&rsquo;t hitting their peak,
        without wasting anything on sunny ones. One kit per power
        circuit, no batteries in the box, and the kit has to be on a
        public register showing it&rsquo;s passed the safety tests.
      </p>

      <h2>What a kit actually costs</h2>
      <p>
        Retail pricing sits in three bands as of mid-2026, based on
        live Amazon UK listings from EcoFlow (the current market
        leader) plus generic Amazon budget kits. Prices include VAT.
      </p>
      <ul>
        <li>
          <strong>DIY (£150–£400):</strong> a stand-alone 800 watt
          micro-inverter (like the{" "}
          <a
            href={amz("B0H4Z3D1N9")}
            target="_blank"
            rel="noopener sponsored"
          >
            Solarsys 800W
          </a>{" "}
          at £149) paired with two second-hand or budget solar
          panels off Amazon or eBay. Cheapest way in for someone
          happy sourcing components separately.
        </li>
        <li>
          <strong>Mid (£449–£499):</strong> the{" "}
          <a
            href={amz("B0F1CVD47Z")}
            target="_blank"
            rel="noopener sponsored"
          >
            EcoFlow STREAM Balcony Solar kit
          </a>{" "}
          — 800 watt inverter, two 400 watt panels, cables, Wi-Fi
          app, UK plug. Add £50 for the version with balcony rail
          mounts included. This is where most UK homeowners will
          land.
        </li>
        <li>
          <strong>Premium (£949 with battery):</strong> the{" "}
          <a
            href={amz("B0FDK6VGNZ")}
            target="_blank"
            rel="noopener sponsored"
          >
            EcoFlow STREAM Max
          </a>{" "}
          adds a 1.92 kWh home battery to the same kit — captures
          the daytime solar you&rsquo;d otherwise miss when
          you&rsquo;re out of the house.
        </li>
      </ul>
      <p>
        A separate portable battery (£600–£900 on top) sits outside
        the plug-in solar rules. The kit charges it during the day,
        and the battery independently powers your devices in the
        evening. Popular for renters who&rsquo;re out during the
        day, less useful if someone&rsquo;s already home when the
        sun&rsquo;s shining.
      </p>

      <h2>How much electricity you&rsquo;ll get, and how quickly it pays back</h2>
      <p>
        A south-facing 800 watt kit in the UK generates roughly 700
        to 850 units of electricity a year — about a quarter of what
        an average household uses. At the mid-2026 price cap of 27p
        per unit, that&rsquo;s £190 to £230 a year off your bill,
        assuming you&rsquo;re at home to actually use most of what
        it produces. On a £600–£900 kit that&rsquo;s a 3 to 5 year
        payback.
      </p>
      <p>
        Two things that change the numbers:
      </p>
      <ul>
        <li>
          <strong>Which way it faces:</strong> east or west generates
          about 20% less over a year. North generates about 40% less
          and won&rsquo;t pay back inside a decade — not worth doing.
        </li>
        <li>
          <strong>Whether you&rsquo;re home during the day:</strong>{" "}
          plug-in kits don&rsquo;t sell extra electricity back to the
          grid — anything you&rsquo;re not using at that exact moment
          is just lost. Households with someone home in the day
          capture 80% or more of what the kit produces. Households
          empty in the day capture 40–50%. Even at 40%, a £600 kit
          still pays back inside 6 years — not bad.
        </li>
      </ul>

      <h2>Who plug-in solar is for</h2>
      <p>
        Plug-in solar is a genuinely new option for the ~40% of UK
        households that can&rsquo;t install rooftop solar — renters,
        flat-dwellers, homes with unsuitable roofs, and owner-
        occupiers who don&rsquo;t want the £6k+ upfront cost of a
        conventional install. Four clean audience segments:
      </p>
      <ol>
        <li>
          <strong>Renters</strong> — plug-in kits move with you.
          Balcony rail mounts don&rsquo;t need drilling. Most
          tenancy agreements don&rsquo;t explicitly cover this yet
          because it&rsquo;s so new, but since nothing gets attached
          to the building itself, the usual &ldquo;no permanent
          changes&rdquo; clause isn&rsquo;t a problem.
        </li>
        <li>
          <strong>Flat-dwellers</strong> — south or west-facing
          balcony? You&rsquo;re exactly who this is designed for.
          Germany has been doing this at scale for years; it&rsquo;s
          the norm there. Communal balconies need sign-off from your
          building management company; private ones usually
          don&rsquo;t.
        </li>
        <li>
          <strong>Small terraces and garden studios</strong> — a
          plug-in kit on a sunny wall, garden studio roof, or ground-
          mounted frame in the garden covers the baseline of what
          you use. Cheap way to try solar before deciding on a full
          rooftop install.
        </li>
        <li>
          <strong>Already have rooftop solar? Add a boost</strong>{" "}
          — households with existing rooftop panels sometimes add
          an 800 watt plug-in kit facing a different direction (east
          or west) to smooth the generation curve over the day. Not
          strictly necessary, but a legal way to add capacity without
          touching your existing inverter.
        </li>
      </ol>

      <h2>Best kits available in the UK today</h2>
      <p>
        EcoFlow dominates the current UK Amazon listings for
        balcony solar. Anker&rsquo;s Balkonkraftwerk kits are
        widely available in Germany but haven&rsquo;t landed on
        Amazon UK yet. The lineup as it stands:
      </p>
      <ul>
        <li>
          <strong>
            <a
              href={amz("B0F1D53MXZ")}
              target="_blank"
              rel="noopener sponsored"
            >
              EcoFlow STREAM Balcony Solar + brackets
            </a>{" "}
            (£499):
          </strong>{" "}
          800 watt kit, two 400 watt panels, balcony-rail mounts
          included, Wi-Fi app, UK plug. Best pick for most UK
          homes — one-click buy, warranty backed by EcoFlow UK.
        </li>
        <li>
          <strong>
            <a
              href={amz("B0FDK6VGNZ")}
              target="_blank"
              rel="noopener sponsored"
            >
              EcoFlow STREAM Max with battery
            </a>{" "}
            (£949):
          </strong>{" "}
          Same 800 watt kit plus a 1.92 kWh home battery. Best if
          you&rsquo;re out of the house during the day — the
          battery banks the daytime solar for evening use.
        </li>
        <li>
          <strong>
            <a
              href={amz("B0H4Z3D1N9")}
              target="_blank"
              rel="noopener sponsored"
            >
              Solarsys 800W micro-inverter
            </a>{" "}
            (£149):
          </strong>{" "}
          Just the inverter. Add two budget panels (~£250) for a
          fully-built kit at around £400 total. Cheapest way in.
        </li>
      </ul>
      <p>
        Deeper breakdown, including which kit fits which setup and
        the specific things to check before you buy:{" "}
        <a href="/plug-in-solar/best-kits-uk-2026">
          best plug-in solar kits UK 2026 (in depth) →
        </a>
      </p>
      <p>
        Renter?{" "}
        <a href="/plug-in-solar/for-renters">
          Plug-in solar for renters
        </a>{" "}
        covers the landlord conversation, tenancy questions, and
        moving mid-tenancy.
      </p>
      <p>
        Still unclear on the legal side?{" "}
        <a href="/plug-in-solar/legal-uk">
          Is plug-in solar legal in the UK?
        </a>{" "}
        explains what the 2026 rule change actually says.
      </p>

      <h2>The one-page form, step by step</h2>
      <p>
        You plug the kit in first, then post the form. Nobody has
        to approve anything — they&rsquo;re just registering that
        the kit exists so the network model stays accurate. Steps:
      </p>
      <ol>
        <li>
          Find your network operator — enter your postcode at{" "}
          <a
            href="https://www.energynetworks.org/customers/find-my-network-operator"
            target="_blank"
            rel="noopener noreferrer"
          >
            energynetworks.org
          </a>
          . England and Wales are covered by UK Power Networks,
          Northern Powergrid, Electricity North West, National Grid
          Electricity Distribution, and SP Energy Networks — you get
          the one for your area.
        </li>
        <li>
          Download the notification form from their site. Most kits
          also ship with a pre-filled version — check the box first.
        </li>
        <li>
          Fill in your postcode, address, the reference number for
          your electricity meter (called the &ldquo;MPAN&rdquo; — top
          of your electricity bill), the model of your kit, and the
          date you plugged it in.
        </li>
        <li>
          Post within 28 days of plugging in. The network operator
          confirms receipt in 4 to 6 weeks. That&rsquo;s the whole
          process — no site visit, no fee.
        </li>
      </ol>

      <h2>What&rsquo;s next for plug-in solar in the UK</h2>
      <p>
        Two things worth watching over the next 12 months:
      </p>
      <ul>
        <li>
          <strong>Small home batteries in scope:</strong> the
          government has signalled it may consult on adding small
          batteries (under 5 units of storage) to the plug-in
          rules in 2027. If that lands, plug-in solar becomes
          materially more useful for evening use.
        </li>
        <li>
          <strong>Payment for extra electricity:</strong> right now
          plug-in kits don&rsquo;t qualify for the scheme that pays
          you for extra electricity sold back to the grid. Ofgem
          (the energy regulator) has an open consultation on
          extending it to plug-in kits with a smart meter — would
          add £30 to £50 a year of income and shorten payback by
          6 to 9 months.
        </li>
      </ul>

      <h2>Before you buy — the pre-survey shortcut</h2>
      <p>
        Even if plug-in solar is your route, a 5-minute pre-survey
        tells you which direction your walls and balcony face, how
        much shade you get, and how much sunlight your address
        actually receives. Useful sanity check on the payback for
        whatever balcony or garden mount you end up choosing.
      </p>
      <p>
        <a href="/check/solar">
          Run our free 5-minute solar pre-survey
        </a>{" "}
        — uses your address and satellite data to give you the
        numbers. It&rsquo;s aimed at rooftop solar but the direction
        and sunlight data applies to any south-facing balcony or
        wall too.
      </p>
    </AEOPage>
  );
}
