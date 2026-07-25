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
    "Plug-in solar is now legal in the UK (BS 7671 Amendment 4, in force April 2026). Cost, 800W limit, best kits, and whether it's worth it for renters, flats, and small homes.",
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
          body: "The full 4kWp+ system route — MCS certified, SEG export tariff, professional install. Compare against plug-in on scale and payback.",
        },
        {
          href: "/check/solar",
          eyebrow: "Check",
          title: "Free 5-minute solar pre-survey",
          body: "Rooftop-oriented, but tells you the roof numbers even if you settle on a balcony kit — orientation, shading, useful reference point.",
        },
        {
          href: "/blog",
          eyebrow: "Journal",
          title: "Latest UK solar + heat pump journalism",
          body: "How grants shift, what the government funds, MCS install stats — the Propertoasty view.",
        },
      ]}
      directAnswer="Plug-in solar became legal in the UK from 15 April 2026 (BS 7671 Amendment 4), with retail-sale rules formalised for 27 August 2026 (SI 2026/848). The rules cap output at 800 W AC from up to 2,000 W of panels, one device per power circuit, no batteries, and the kit must be on the ENA Type Test Register. A typical 800 W kit costs £400–£900 including panels, mounts, and micro-inverter. Payback for a south-facing balcony sits at 3–5 years at 27 p/kWh — meaningful for renters, flats, and small terraces where rooftop solar isn't feasible."
      tldr={[
        "Legal in the UK from 15 April 2026 (BS 7671 A4). Retail-sale rules from 27 August 2026 (SI 2026/848).",
        "800 W AC output limit, from up to 2,000 W of panels, one kit per circuit, no batteries in the plug-in scope.",
        "G98 notification to your Distribution Network Operator (DNO) required within 28 days — the installer or manufacturer typically provides a template.",
        "Typical kit £400–£900. Payback 3–5 years on a south-facing balcony at 27 p/kWh import.",
        "Best fit: renters, flats, small terraces, garden studios — anywhere rooftop solar isn't feasible.",
      ]}
      faqs={[
        {
          question: "Is plug-in solar legal in the UK?",
          answer:
            "Yes. BS 7671 Amendment 4 (ratified 16 March 2026, in force 15 April 2026) explicitly permits plug-in solar micro-generation up to 800 W AC output for the first time. Statutory Instrument SI 2026/848 (16 July 2026) formalised the retail-sale rules from 27 August 2026. Before this, plug-in solar was in a grey zone — technically usable but not covered by the wiring regulations, which meant most electricians wouldn't sign it off. The 2026 changes give it a formal legal basis and a compliance route.",
        },
        {
          question: "What is the 800 W limit?",
          answer:
            "The 800 W limit is on AC output at the inverter, not on the panels themselves. You can have up to 2,000 W of panels, but the micro-inverter must cap what it feeds into the socket at 800 W. This matches the German Balkonkraftwerk rule (also 800 W since 2024) so most compliant hardware sold in Germany works in the UK once ENA-listed.",
        },
        {
          question: "Do I need to tell my energy supplier?",
          answer:
            "You notify your Distribution Network Operator (DNO), not your supplier. Under G98, you have 28 days after connecting the kit to file a notification with the DNO covering your postcode (find yours at energynetworks.org). Most compliant kits ship with a pre-filled G98 template. This is a paperwork step, not an approval — G98 is 'notify and connect', not 'apply and wait'.",
        },
        {
          question: "How much does a plug-in solar kit cost?",
          answer:
            "£400–£900 for a complete 800 W kit as of mid-2026, depending on brand and panel count. Budget kits (single 400 W panel + micro-inverter + mount) start around £400; premium kits with two panels + weatherproof plug + branded mounting start around £700; kits paired with a small portable battery station push toward £1,500+ but the battery itself is outside the plug-in solar scope.",
        },
        {
          question: "Can I use plug-in solar if I rent?",
          answer:
            "Yes — plug-in solar is one of the few solar options renters can use. It plugs into a standard socket, requires no wall drilling if you use a balcony rail mount, and moves with you when you leave. Check your tenancy for any clause about attaching things to balconies. Most landlords are neutral because there's no electrical work on the property.",
        },
        {
          question: "How long is the payback?",
          answer:
            "3–5 years for a south-facing 800 W kit at UK average irradiance and 27 p/kWh import. A south-facing kit generates around 700–850 kWh/year in the UK; at 27 p/kWh self-consumed that's £190–£230/year, giving a 3–5 year payback on a £600–£900 kit. East/west-facing kits generate about 20% less. North-facing not worth it.",
        },
        {
          question: "Can I add a battery to a plug-in solar kit?",
          answer:
            "Not within the 800 W plug-in scope defined by BS 7671 A4 — batteries are explicitly excluded from the plug-in path. If you want battery storage you either buy a portable power station (charge from the plug-in kit, discharge to devices independently) or go the full route with a G98/G99-notified installer-fitted battery.",
        },
        {
          question: "Is plug-in solar better than rooftop solar?",
          answer:
            "Different tool for different jobs. Plug-in solar is 400–800 W of capacity — enough to cover baseline standby load and some daytime usage. Rooftop solar is typically 3.5–6 kW — enough to seriously cut a family's electricity bill and pair with a battery for evening use. Plug-in fills the gap for people rooftop can't reach: renters, flats, terraces without owner permission, garden studios.",
        },
        {
          question: "Do I need MCS certification for plug-in solar?",
          answer:
            "No. MCS is required for the £7,500 Boiler Upgrade Scheme grant and for the Smart Export Guarantee (SEG) — neither applies to plug-in solar since the 800 W kit doesn't export to the grid (the micro-inverter self-limits when household demand is low). You lose SEG export earnings but you also skip the MCS install cost.",
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
      <h2>What changed in April 2026</h2>
      <p>
        For years, plug-in solar sat in a UK regulatory grey zone.
        The kits were on Amazon, Germans were installing 800,000+
        Balkonkraftwerk systems a year, but the UK&rsquo;s{" "}
        <a
          href="https://electrical.theiet.org/bs-7671/"
          target="_blank"
          rel="noopener noreferrer"
        >
          BS 7671 Wiring Regulations
        </a>{" "}
        didn&rsquo;t recognise them. Electricians wouldn&rsquo;t sign
        them off, insurers were unsure, and every review site had a
        &ldquo;probably fine but check with your DNO&rdquo; disclaimer.
      </p>
      <p>
        Amendment 4 to BS 7671 (ratified 16 March 2026, in force 15
        April 2026) closed that gap. It explicitly permits micro-
        generation of up to 800 W AC output on a standard 13 A socket
        circuit, subject to conditions that mirror the German
        Balkonkraftwerk rules. Statutory Instrument 2026/848 (made 16
        July 2026, in force 27 August 2026) then set the retail-sale
        rules: kits sold in the UK must ship with proof of ENA Type
        Test Register listing, and the labelling must state the 800 W
        cap. From 27 August 2026 you can walk into an electrical
        retailer, buy a compliant plug-in solar kit, and plug it in
        yourself.
      </p>

      <h2>The 800 W rule in one paragraph</h2>
      <p>
        The rule caps AC output — the electricity actually pushed
        into your socket — at 800 W. The panels themselves can total
        up to 2,000 W of DC capacity; the micro-inverter throttles
        output whenever incoming solar exceeds 800 W. In practice
        this means a two-panel kit (each ~430–450 W) is at the sweet
        spot: you get more generation in low-light conditions where
        panels never hit their peak, without wasting sunny-day
        capacity. One kit per power circuit, no batteries (the plug-
        in scope excludes storage), and the kit must be on the ENA
        Type Test Register — a public list confirming the inverter
        meets G98 grid-connection standards.
      </p>

      <h2>What a kit actually costs</h2>
      <p>
        Retail pricing sits in three bands as of mid-2026, based on
        published listings from{" "}
        <a
          href={amz("B0DGCH5GTP")}
          target="_blank"
          rel="noopener sponsored"
        >
          Anker SOLIX RS40P
        </a>
        ,{" "}
        <a
          href={amz("B0DXKQXPZ7")}
          target="_blank"
          rel="noopener sponsored"
        >
          EcoFlow STREAM
        </a>
        , and Amazon-sold budget kits (affiliate links). Prices
        include VAT.
      </p>
      <ul>
        <li>
          <strong>Budget (£400–£550):</strong> single 400–450 W panel,
          entry-level micro-inverter, basic mounting bracket. Usually
          Amazon-only, generic brand. Enough for baseline standby load
          (fridge, router, always-on devices).
        </li>
        <li>
          <strong>Mid (£600–£900):</strong> two-panel kit (2 × 430 W
          typical), branded micro-inverter (Hoymiles / APsystems),
          balcony rail or wall mount. Best £/W ratio, this is where
          most UK homeowners will land.
        </li>
        <li>
          <strong>Premium (£900–£1,200):</strong> full-brand kit from
          Anker or EcoFlow with app monitoring, warranty support in
          the UK, and pre-filed G98 notification templates. Adds
          convenience and warranty peace-of-mind but no extra
          generation.
        </li>
      </ul>
      <p>
        A separate portable battery station (Anker SOLIX C1000,
        EcoFlow River 3, Bluetti AC180) is £600–£900 on top. The
        battery isn&rsquo;t formally part of the plug-in solar scope
        — the kit charges it, and the battery independently powers
        devices in the evening. Popular for renters with weekend-
        heavy home usage, less useful for households already at home
        during the day.
      </p>

      <h2>Payback and generation numbers</h2>
      <p>
        A south-facing 800 W kit at UK average solar irradiance
        (~1,000 kWh/m²/year, per{" "}
        <a
          href="https://re.jrc.ec.europa.eu/pvg_tools/en/"
          target="_blank"
          rel="noopener noreferrer"
        >
          PVGIS
        </a>
        ) generates 700–850 kWh/year. At the mid-2026 UK price cap
        rate of 27 p/kWh, that&rsquo;s £190–£230 of self-consumed
        electricity per year — assuming you use most of what you
        generate rather than letting the inverter throttle down when
        household demand is low. That gives a mid-band £600–£900 kit
        a 3–5 year simple payback.
      </p>
      <p>
        Two adjustments to the numbers:
      </p>
      <ul>
        <li>
          <strong>Orientation:</strong> east/west-facing generates
          about 20% less over a year; north-facing generates about
          40% less and won&rsquo;t pay back inside a decade — not
          worth doing.
        </li>
        <li>
          <strong>Self-consumption:</strong> plug-in kits don&rsquo;t
          export to the grid (no Smart Export Guarantee income), so
          every unused watt is lost. Households at home during the
          day capture 80%+ of generation; households empty during the
          day capture 40–50%. A £600 kit at 40% self-consumption
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
          Balcony rail mounts don&rsquo;t require drilling. Most
          tenancy agreements don&rsquo;t explicitly cover it because
          it&rsquo;s new, but the &ldquo;no permanent alterations&rdquo;
          clause is generally satisfied since nothing gets fixed to
          the building.
        </li>
        <li>
          <strong>Flat-dwellers</strong> — south or west-facing
          balcony? You&rsquo;re the target audience. In Germany this
          is called Balkonkraftwerk (balcony power plant) and it&rsquo;s
          the dominant install pattern. Communal balconies need
          management-company sign-off; private ones typically
          don&rsquo;t.
        </li>
        <li>
          <strong>Small terraces + garden studios</strong> — a
          plug-in kit on a sunny wall, garden studio roof, or
          purpose-built ground-mount frame covers baseline household
          load. Cheap trial run before deciding on a full rooftop
          install.
        </li>
        <li>
          <strong>Rooftop-solar-plus-boost</strong> — households
          with existing rooftop solar sometimes add an 800 W plug-in
          kit at a different orientation (east or west) to smooth
          the generation curve. Not strictly necessary, but a legal
          way to add capacity without touching the certified inverter.
        </li>
      </ol>

      <h2>Best kits available in the UK today</h2>
      <p>
        The UK market shook out around three brand tiers in the run-
        up to the April 2026 legalisation:
      </p>
      <ul>
        <li>
          <strong>
            <a
              href={amz("B0DGCH5GTP")}
              target="_blank"
              rel="noopener sponsored"
            >
              Anker SOLIX RS40P
            </a>{" "}
            (£799):
          </strong>{" "}
          Two 445 W panels, 800 W micro-inverter, weatherproof rail
          mount. App monitoring via the Anker app. 10-year warranty.
          Best all-round pick — Anker&rsquo;s UK service network makes
          warranty claims painless.
        </li>
        <li>
          <strong>
            <a
              href={amz("B0DXKQXPZ7")}
              target="_blank"
              rel="noopener sponsored"
            >
              EcoFlow STREAM Micro
            </a>{" "}
            (£899):
          </strong>{" "}
          800 W AC out, pairs with EcoFlow&rsquo;s wider battery /
          power-station ecosystem if you plan to add storage later.
          More expensive per watt than Anker but better software.
        </li>
        <li>
          <strong>Amazon budget kits (£450–£600):</strong> Various
          generic brands. Watch for ENA Type Test Register listing
          (should be printed on the box or in the listing) — some
          older stock predates the register and technically won&rsquo;t
          be compliant post-27-August. If in doubt, ask the seller.
        </li>
      </ul>
      <p>
        Deeper breakdown in the follow-up:{" "}
        <a href="/plug-in-solar/best-kits-uk-2026">
          Best plug-in solar kits UK 2026 (in depth)
        </a>{" "}
        (coming soon).
      </p>

      <h2>The G98 notification, step by step</h2>
      <p>
        &ldquo;Notify and connect&rdquo; means you plug the kit in
        first, then post the paperwork. The DNO isn&rsquo;t
        approving anything — they&rsquo;re registering that the kit
        exists so the network model stays accurate. Steps:
      </p>
      <ol>
        <li>
          Find your DNO — enter your postcode at{" "}
          <a
            href="https://www.energynetworks.org/customers/find-my-network-operator"
            target="_blank"
            rel="noopener noreferrer"
          >
            energynetworks.org
          </a>
          . England + Wales are split across UK Power Networks,
          Northern Powergrid, Electricity North West, WPD, and SP
          Energy Networks.
        </li>
        <li>
          Download the G98 notification form for your DNO. Most kits
          also ship with a pre-filled version — check the paperwork
          in the box first.
        </li>
        <li>
          Fill in your postcode, address, MPAN number (top of your
          electricity bill), the inverter&rsquo;s ENA Type Test
          Register reference, and your installation date.
        </li>
        <li>
          Submit within 28 days of connection. The DNO acknowledges
          in 4–6 weeks. That&rsquo;s the whole process — no site
          visit, no fee.
        </li>
      </ol>

      <h2>What&rsquo;s next for plug-in solar in the UK</h2>
      <p>
        Two things worth watching over the next 12 months:
      </p>
      <ul>
        <li>
          <strong>Batteries in scope:</strong> DESNZ has signalled it
          may consult on adding domestic batteries under 5 kWh to the
          plug-in scope in 2027. If that lands, plug-in solar
          becomes materially more useful for evening self-consumption.
        </li>
        <li>
          <strong>Smart Export Guarantee eligibility:</strong>{" "}
          currently plug-in kits are excluded from SEG because they
          don&rsquo;t export. Ofgem has an open consultation on
          extending SEG to plug-in kits fitted with a smart meter —
          would add £30–£50/year of export earnings and shorten
          payback by 6–9 months.
        </li>
      </ul>

      <h2>Before you buy — the pre-survey shortcut</h2>
      <p>
        Even if plug-in solar is your route, a 5-minute pre-survey
        gets you the orientation, shading, and irradiance numbers for
        your specific address — the same numbers a rooftop-solar
        install would use. Handy sanity check on the payback
        expectation for whatever balcony or garden mount you choose.
      </p>
      <p>
        <a href="/check/solar">
          Run our free 5-minute solar pre-survey
        </a>{" "}
        — Google Solar API + your EPC + our sizing engine. Rooftop-
        oriented but the roof-face irradiance numbers apply to any
        south-facing balcony or wall in the same postcode.
      </p>
    </AEOPage>
  );
}
