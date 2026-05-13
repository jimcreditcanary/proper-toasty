// /guides/hot-water-planning-heat-pump — hot-water planning guide.
//
// Hot water is the "second half" of a heat-pump install that
// homeowners under-think. Combi → cylinder is a big change in
// daily-use behaviour + plumbing footprint. This guide covers
// cylinder sizing rules of thumb, immersion strategy, why
// continuous-low-temp beats once-a-day cycling for heat pumps,
// and the Legionella schedule UK water regs require.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/hot-water-planning-heat-pump";

export const metadata: Metadata = {
  title: "Hot water planning for a heat pump install: UK 2026 guide",
  description:
    "Cylinder sizing, immersion strategy, cycling vs continuous, Legionella schedule — the hot-water side of a UK heat-pump install in 2026.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Hot water planning for a heat pump install: UK 2026 guide",
    description:
      "Cylinder sizing, immersion strategy, cycling vs continuous, Legionella schedule for UK heat-pump installs.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HotWaterPlanning() {
  return (
    <AEOPage
      headline="Hot water planning for a heat pump install in UK 2026"
      description="Cylinder sizing, immersion strategy, cycling vs continuous, Legionella schedule — the hot-water side of a UK heat-pump install."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Hot water + cylinders"
      kind="howto"
      howToSteps={[
        {
          name: "Size the cylinder (45 litres per person)",
          text: "Rule of thumb: 45L per person. 90L for a single occupant, 180L for a 4-person family, 250L for 5+. Bump up for multiple bathrooms, baths, or power showers. Down to 35L/person only if space is genuinely tight and you accept occasional immersion top-ups.",
        },
        {
          name: "Choose unvented (default) vs vented",
          text: "Unvented is standard for 90%+ of UK heat-pump installs. Mains-pressure (3-6 bar) to taps + showers, no loft tank needed. Requires a G3-qualified installer. Adds £300-£600 over vented. Vented persists only where mains pressure is poor.",
        },
        {
          name: "Set the heating schedule (1-2 cycles per day, not continuous)",
          text: "Single overnight cycle (1am-5am) suits morning-heavy households. Twin daily (4am-6am + 1pm-3pm) suits evening-shower households. Continuous keeping-warm forces short cycles at higher flow temps and hurts COP.",
        },
        {
          name: "Configure the weekly Legionella cycle",
          text: "HSE L8 requires hot-water cylinder to reach 60°C once a week. Heat pump runs 50°C daily; the integrated 3 kW immersion boosts to 60°C for ~1 hour. Schedule overnight (2am Sunday typical). Costs ~£44/year, automatic.",
        },
        {
          name: "Align the cylinder cycle to your smart tariff",
          text: "Shift cylinder reheat to your tariff's cheap-rate window. Octopus Cosy cheap rates: 4am-7am, 1pm-4pm. A 4-person household saves ~£300/year on the cylinder cycle alone vs flat-rate. Dynamic tariffs (Agile, Tracker) need a smart controller for daily price-following.",
        },
        {
          name: "Pick the physical cylinder location",
          text: "Priority order: airing cupboard (existing), utility / downstairs cupboard, insulated garage, loft. 180L is ~600mm diameter × 1500mm tall; 250L is ~600mm × 1800mm. Loft locations need joist strength check (~250kg full).",
        },
      ]}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "Hot water planning for a heat pump install" },
      ]}
      directAnswer="A heat-pump install needs an unvented hot-water cylinder sized to 45 litres per person as a rule of thumb (so 180L for 4 people, 250L for 5+). The cylinder heats once or twice a day to around 50°C via the heat pump, with a backup immersion for the weekly 60°C Legionella cycle required by HSE L8 guidance. Combi boilers can't be replaced by a heat pump like-for-like — every heat-pump install needs a cylinder, which means finding airing-cupboard or utility space. The hot-water side typically adds £800–£2,500 to an install over and above the heat pump itself."
      tldr={[
        "Sizing rule of thumb: 45 litres of cylinder capacity per person.",
        "Combi → heat pump = mandatory cylinder, needs ~600×600×1800mm of space.",
        "Unvented (mains-pressure) cylinder is standard; pressurised system gives mixer-shower power.",
        "Heat pump heats cylinder to 50°C; immersion does weekly 60°C Legionella cycle.",
        "Schedule heating once or twice a day, not on demand — heat pump is slow but efficient at this.",
        "Smart tariffs (Cosy, Octopus Tracker) let you heat the tank when electricity is cheap.",
      ]}
      faqs={[
        {
          question:
            "What size hot-water cylinder do I need for a heat pump?",
          answer:
            "Rule of thumb: 45 litres per person in the household. So 90L for a single occupant, 180L for a 4-person family, 250L for 5+. This is more generous than the old gas-boiler rule (35L/person) because a heat pump takes longer to reheat — typically 2–4 hours from cold to 50°C — so you want a tank big enough to ride out a busy hour without falling back on the immersion. For households with high hot-water demand (multiple showers in quick succession, baths, etc.), bump to 60L per person. For households with low demand or where space is genuinely tight, you can go down to 35L/person if you also accept that you'll occasionally need the immersion as a top-up.",
        },
        {
          question:
            "Why can't a heat pump replace a combi boiler like-for-like?",
          answer:
            "Combis heat water instantaneously on demand at high power (24–35 kW for the hot-water side). A typical heat pump is 5–14 kW — nowhere near enough to heat water as fast as you use it. So heat pumps NEED a storage cylinder where water sits at temperature waiting for you, while a combi has no storage. Practically: if you have a combi, the install includes installing a cylinder somewhere (airing cupboard, utility, garage, loft), which adds £800–£2,500 to the install and needs physical space ~600×600×1800mm. The combi itself usually gets removed; sometimes it's kept as backup but most installs disconnect it entirely.",
        },
        {
          question:
            "Should I heat the cylinder once a day or continuously?",
          answer:
            "Once or twice a day on a SCHEDULED cycle is the right answer for almost all UK heat-pump installs. Heat pumps are most efficient at lower flow temperatures, so a slow heat-up to 50°C overnight or early morning gives better COP than topping up on demand. Two cycles (e.g. early morning + mid-afternoon) suit households with evening showers; one cycle (overnight) suits households whose hot-water use is concentrated in mornings. Continuous keeping-warm is a bad idea — it forces the pump to run frequent short cycles at higher flow temps for marginal hot-water gain, hurting COP. Your installer will set this up during commissioning; you can tweak the schedule via the unit's app or controller afterwards.",
        },
        {
          question:
            "What's the weekly Legionella cycle and why do I need it?",
          answer:
            "Legionella pneumophila bacteria can grow in hot-water cylinders held below 50°C. HSE Approved Code of Practice L8 requires hot-water systems in domestic dwellings to reach 60°C at least once a week to kill any bacteria that have grown in the stagnant layers. Heat pumps run more efficiently at 50°C than 60°C, so the standard pattern is: heat pump heats to 50°C daily, then ONCE A WEEK the system uses the backup immersion heater (3 kW resistance element) to bump the cylinder to 60°C for an hour. The weekly cycle adds maybe £1–£2/year to your electricity bill — negligible. Most installs schedule this overnight (e.g. 2am Sunday). It's automatic; you don't think about it.",
        },
        {
          question:
            "What's the difference between vented and unvented cylinders?",
          answer:
            "Vented cylinders use gravity-fed water from a cold-water tank in the loft, so hot-water pressure is limited to the gravity head (usually 0.3–0.5 bar — okay for taps, weak for showers without a pump). Unvented cylinders are connected to mains pressure (3–6 bar typical), so taps and showers run at full mains pressure with no need for a pump. Almost all modern heat-pump installs use unvented cylinders because mixer showers + mains-pressure feel are now standard expectations. Unvented cylinders need a G3 qualified installer for the safety-relief plumbing and must have annual safety-valve checks. Cost difference: unvented adds ~£300–£600 over a vented cylinder of the same size.",
        },
        {
          question:
            "Can I use a smart tariff to heat the cylinder on cheap electricity?",
          answer:
            "Yes — and you should. The pattern is: shift the cylinder reheat cycle to your tariff's cheap window. Octopus Cosy and Octopus Go have defined cheap-rate hours (typically 4am–7am and/or 1pm–4pm). Octopus Agile and Tracker have variable cheap periods that change daily. Most heat-pump controllers can schedule the cylinder cycle to a fixed time (works for Cosy/Go) or accept commands from a home-automation system (works for Agile via Home Assistant or similar). Savings: a 4-person household heating 180L from 15°C to 50°C twice a day uses ~6 kWh/day. Shifting that to a 12p cheap rate vs 28p flat rate saves ~£0.96/day = ~£350/year just on the cylinder cycle. Combined with running the central heating on the same shifted schedule, smart-tariff savings on a heat-pump install often pay for the install premium over a like-for-like gas replacement within 5–7 years.",
        },
      ]}
      sources={[
        {
          name: "HSE — Approved Code of Practice L8 (Legionella)",
          url: "https://www.hse.gov.uk/pubns/books/l8.htm",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Heat pump installation standard MIS 3005",
          url: "https://mcscertified.com/standards/",
          accessedDate: "May 2026",
        },
        {
          name: "WRAS — Water Regulations Advisory Scheme",
          url: "https://www.wras.co.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pumps + hot water",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>Why hot water is its own design problem</h2>
      <p>
        On a gas-boiler retrofit, hot water is an afterthought —
        the existing cylinder or combi keeps working, you only
        change the heat source. On a heat-pump retrofit, hot
        water is half the design conversation. Three reasons:
      </p>
      <ul>
        <li>
          <strong>Heat pumps are slow.</strong> 2–4 hours to
          reheat a cylinder from cold to 50°C, vs ~20 minutes
          for a gas boiler. So you need bigger storage.
        </li>
        <li>
          <strong>Heat pumps don&rsquo;t love 60°C.</strong> COP
          drops sharply above 50°C, so the operating sweet spot
          is ~48–52°C. Lower than gas-fired hot-water systems
          typically run.
        </li>
        <li>
          <strong>Combi homes need a cylinder added.</strong>{" "}
          ~50% of UK homes have combis; for those, the heat
          pump install also installs a cylinder + relocates the
          hot-water plumbing.
        </li>
      </ul>
      <p>
        These three together mean hot-water planning isn&rsquo;t
        just &ldquo;pick a tank size&rdquo; — it involves
        layout, scheduling, tariff alignment, and a Legionella
        protocol. Worth getting right at the design stage.
      </p>

      <h2>Sizing the cylinder</h2>
      <p>
        UK 2026 sizing convention for heat-pump cylinders:
      </p>
      <ul>
        <li><strong>1 person:</strong> 90–120L</li>
        <li><strong>2 people:</strong> 150–180L</li>
        <li><strong>3 people:</strong> 180–210L</li>
        <li><strong>4 people:</strong> 210–250L</li>
        <li><strong>5+ people:</strong> 250–300L+</li>
      </ul>
      <p>
        Adjust upwards if you have:
      </p>
      <ul>
        <li>Multiple bathrooms used in quick succession.</li>
        <li>Baths rather than showers (a bath is ~80L of hot water).</li>
        <li>Power showers or rain heads (12+ L/min flow).</li>
        <li>A whirlpool or large free-standing bath.</li>
      </ul>
      <p>
        Adjust downwards (cautiously) if you have:
      </p>
      <ul>
        <li>Genuine space constraints (loft installs in low eaves, etc.).</li>
        <li>Spread-out usage patterns (no clustered showers).</li>
        <li>Comfort with occasional immersion top-ups during busy weeks.</li>
      </ul>
      <p>
        Default rule of thumb: <strong>45 litres per person</strong>.
        That works out at 180L for a typical 4-person household
        and is the most common quote-stage default.
      </p>

      <h2>Vented vs unvented — the easy decision</h2>
      <p>
        Unvented cylinders are now the default for 90%+ of UK
        heat-pump installs. Why:
      </p>
      <ul>
        <li>
          <strong>Mains pressure</strong> to all taps and
          showers without needing a pump. 3–6 bar typical.
        </li>
        <li>
          <strong>No loft cold-water tank required.</strong>{" "}
          Frees up loft space and removes a maintenance item.
        </li>
        <li>
          <strong>Better mixer-shower performance.</strong>{" "}
          High-flow rain heads + body jets need mains pressure;
          gravity-fed vented systems can&rsquo;t deliver.
        </li>
      </ul>
      <p>
        Vented cylinders persist where mains pressure or flow
        is low (some rural locations on shared supply), or
        where the existing loft tank is hard to remove. In
        those edge cases, your installer may suggest an
        accumulator + pump combo with a vented cylinder.
      </p>
      <p>
        Cost difference: unvented adds ~£300–£600 over an
        equivalent vented cylinder, and the installer needs to
        be G3 qualified for the safety plumbing.
      </p>

      <h2>The heating schedule that gives best COP</h2>
      <p>
        Counter-intuitively, the best schedule for heat-pump
        hot water is NOT &ldquo;keep the cylinder hot all
        day&rdquo; — it&rsquo;s scheduled cycles. Two patterns
        cover most households:
      </p>
      <p>
        <strong>Single overnight cycle</strong> — heat to 50°C
        between 1am and 5am. Works for households whose
        hot-water use is concentrated in mornings (showers
        before work/school). Tank stays warm enough through the
        day for evening washing-up.
      </p>
      <p>
        <strong>Twin daily cycle</strong> — heat to 50°C at
        4am–6am AND again at 1pm–3pm. Works for households
        with evening showers or anyone who wants more reserve
        capacity. Better fit for busy 4-person households.
      </p>
      <p>
        Both patterns let the heat pump run when ambient
        temperatures suit it (early-morning being cold but not
        the COLDEST), and align with most UK smart-tariff
        cheap-rate windows. Your installer will program the
        schedule during commissioning based on your usage
        patterns + tariff.
      </p>

      <h2>The weekly Legionella cycle</h2>
      <p>
        HSE Approved Code of Practice L8 requires hot-water
        cylinders to reach 60°C at least once per week to kill
        Legionella bacteria. Heat pumps run 50°C as the daily
        target, so the weekly cycle uses the integrated 3 kW
        immersion heater to boost the cylinder to 60°C for
        ~1 hour.
      </p>
      <p>
        Cost: ~3 kWh × £0.28 (flat rate) = £0.84 per week =
        £44/year. Half that if scheduled to a cheap-rate
        window. Negligible.
      </p>
      <p>
        This happens automatically. Most installers schedule
        it for 2am–3am on Sunday so it never affects your daily
        usage. You don&rsquo;t need to do anything.
      </p>

      <h2>The backup immersion — and when it fires</h2>
      <p>
        Every heat-pump cylinder ships with a 3 kW backup
        immersion heater. It fires in three circumstances:
      </p>
      <ul>
        <li>
          <strong>Weekly Legionella cycle</strong> — automatic,
          discussed above.
        </li>
        <li>
          <strong>Holiday boost</strong> — if you arrive home
          to a cold cylinder and want hot water in 30 minutes
          rather than 3 hours. Manual button or app trigger.
        </li>
        <li>
          <strong>Heat-pump fault</strong> — if the unit fails,
          immersion can run the hot-water side until the
          installer attends.
        </li>
      </ul>
      <p>
        The immersion is NOT for daily use — it&rsquo;s 3–4×
        more expensive per kWh of hot water than the heat pump
        is. Confirm during commissioning that the controller
        prefers the heat pump and only falls back to immersion
        in defined scenarios.
      </p>

      <h2>Smart-tariff alignment</h2>
      <p>
        Most heat-pump tariffs (Octopus Cosy, Octopus Go,
        British Gas HomeEnergy) have defined cheap-rate
        windows of 5–7 hours per day at a third to a half of
        the flat rate. Scheduling the cylinder cycle inside
        the cheap window can save £150–£350/year on a typical
        4-person household.
      </p>
      <p>
        Variable tariffs (Octopus Agile, Tracker) require a
        smart controller or Home Assistant integration to
        shift the schedule daily — more setup but bigger
        savings, often £400+/year if you also shift the
        central-heating run pattern.
      </p>
      <p>
        See the upcoming{" "}
        <a href="/compare/heat-pump-tariffs-2026">
          heat pump tariffs comparison
        </a>{" "}
        for tariff-specific guidance.
      </p>

      <h2>Where the cylinder physically goes</h2>
      <p>
        A typical 180L cylinder is roughly 600mm diameter ×
        1500mm tall; a 250L is 600mm × 1800mm. Add 100–150mm
        clearance on top for the immersion + pipework. Common
        locations in priority order:
      </p>
      <ul>
        <li>
          <strong>Existing airing cupboard</strong> — easiest
          if it already housed a hot-water cylinder. Often the
          old cylinder was smaller, so the new one is a tight
          fit.
        </li>
        <li>
          <strong>Utility room or downstairs cupboard</strong>{" "}
          — common in homes that converted to a combi and
          removed the original cylinder.
        </li>
        <li>
          <strong>Garage (if attached + insulated)</strong> —
          works if there&rsquo;s a frost-protection plan;
          cylinders should not freeze.
        </li>
        <li>
          <strong>Loft</strong> — possible but pipework runs
          longer + you lose head-pressure unless unvented.
          Confirm joist strength can take the full-cylinder
          load (~250kg).
        </li>
      </ul>
      <p>
        Your installer should propose the cylinder location
        during the{" "}
        <a href="/guides/mcs-site-visit-what-to-expect">
          MCS site visit
        </a>{" "}
        and confirm it in the written quote. If you&rsquo;re
        not happy with their proposed location, raise it
        before signing — relocating after install is
        expensive.
      </p>

      <h2>The summary</h2>
      <p>
        Hot-water planning for a heat pump comes down to:
        cylinder size (45L/person rule of thumb), unvented vs
        vented (unvented for 90% of installs), heating
        schedule (1–2 cycles per day, not continuous), weekly
        Legionella cycle (automatic), and tariff alignment
        (move the cycle to cheap-rate hours). Combi-replacement
        homes also need physical space for the cylinder, which
        is usually the airing cupboard or utility room. Get
        these decisions made at the quote stage — they affect
        cost, comfort, and running expense for the next 15+
        years.
      </p>
    </AEOPage>
  );
}
