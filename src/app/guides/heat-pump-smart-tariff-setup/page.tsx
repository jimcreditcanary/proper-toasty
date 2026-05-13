// /guides/heat-pump-smart-tariff-setup — smart-tariff setup guide.
//
// The "post-commissioning" guide. By the time most homeowners
// install a heat pump they've thought about kit and contractors
// but very little about the tariff side, which is where 20-40%
// of running cost can be optimised. This guide walks through
// schedule configuration, weather compensation, app integration,
// and the trade-offs between fixed-window and dynamic tariffs.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/heat-pump-smart-tariff-setup";

export const metadata: Metadata = {
  title: "Setting up a heat pump smart tariff: UK 2026 guide",
  description:
    "Schedule configuration, weather compensation, app integration — how to actually run a heat pump on a UK smart tariff for lowest running cost.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Setting up a heat pump smart tariff: UK 2026 guide",
    description:
      "Schedule, weather compensation, app integration — how to actually run a heat pump on a UK smart tariff.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpSmartTariffSetup() {
  return (
    <AEOPage
      headline="Setting up a heat-pump smart tariff in UK 2026"
      description="Schedule configuration, weather compensation, app integration — how to actually run a heat pump on a UK smart tariff for lowest running cost."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Tariffs + controls"
      kind="howto"
      howToTotalTime="P2M"
      howToSteps={[
        {
          name: "Pick a heat-pump-specific tariff",
          text: "Fixed-window options: Octopus Cosy (three cheap windows daily), British Gas HomeEnergy (single overnight cheap rate), EDF GoElectric Heat Pump. Dynamic options: Octopus Agile (half-hourly pricing), Octopus Tracker (daily). Pick fixed-window first; consider dynamic after 6-12 months.",
        },
        {
          name: "Enable + tune weather compensation",
          text: "Single biggest lever. Heat pump scales flow temperature to outdoor temperature. Every 5°C lower flow temp = 10-15% better COP. Start at the installer's commissioning curve, tune down 1-2°C per week across the first winter until comfort drops, then back off one notch.",
        },
        {
          name: "Configure the heating schedule",
          text: "Pre-heat the house during cheap-rate windows (target +1-2°C, finish 30-60 min before window ends). Coast during peak windows (drop to maintenance e.g. 18°C). Schedule the cylinder reheat inside the longest cheap window. Use the heat pump's built-in scheduler.",
        },
        {
          name: "Pick a smart controller (dynamic tariffs only)",
          text: "Skip for fixed-window tariffs. For Agile or Tracker: Homely (£200 + ~£10/mo, plug-and-play), Adia (Octopus partner), or Home Assistant (free, runs on Raspberry Pi, DIY). Smart controller pulls day-ahead prices and shifts loads automatically.",
        },
        {
          name: "Confirm SMETS2 smart meter",
          text: "Mandatory for any UK heat-pump-specific tariff. Half-hourly settlement via the DCC network. SMETS1 meters may need firmware updates or replacement. Book the install before signing up — adds 2-6 weeks if you don't already have one.",
        },
        {
          name: "Monitor + tune across the first month",
          text: "Days 1-7: observe consumption pattern in supplier app. Days 7-14: set basic schedule. Days 14-28: tune weather-comp curve down. Days 28-60: review billed cost vs flat-rate. End of winter: consider stepping up to dynamic tariff for the last 10-20% of savings.",
        },
      ]}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "Setting up a heat pump smart tariff" },
      ]}
      directAnswer="To run a heat pump on a UK smart tariff you need three things: (1) a heat-pump-friendly tariff with defined cheap-rate windows or live half-hourly pricing, (2) weather compensation enabled on the heat pump so flow temperature scales with outside conditions, and (3) a schedule that pushes the heating + hot-water cycles into the cheap-rate windows. Done well this cuts running cost by 25–40% vs running on a flat single-rate tariff. The best fixed-window tariffs in May 2026 are Octopus Cosy and British Gas HomeEnergy; the best dynamic options are Octopus Agile and Tracker, which need a smart controller (Homely, MyEnergi Eddi, or Home Assistant) to react to daily price changes."
      tldr={[
        "Smart tariffs typically save 25-40% on running cost vs flat single-rate.",
        "Fixed-window tariffs (Octopus Cosy, British Gas HomeEnergy) have set cheap hours — simple to schedule.",
        "Dynamic tariffs (Octopus Agile, Tracker) vary daily — bigger savings but need smart controller.",
        "Weather compensation is the single biggest COP improvement — enable it during commissioning.",
        "Schedule heating preheat 2-3 hours before cheap-rate window ends, not after it starts.",
        "Hot-water cycle in the cheap window saves ~£300/year on a 4-person household.",
        "Smart-meter (SMETS2) is mandatory for any half-hourly settled tariff.",
      ]}
      faqs={[
        {
          question:
            "What is the cheapest UK heat-pump tariff in May 2026?",
          answer:
            "It depends on your usage pattern. For households with predictable schedules and 5+ kWh/day of shiftable load, Octopus Cosy (cheap rates 4am-7am, 1pm-4pm, 10pm-12am) is typically cheapest at ~12-13p/kWh in those windows. For tech-savvy households happy to use smart automation, Octopus Agile averages ~14-16p/kWh blended but can hit negative pricing in surplus-wind periods — great savings if you can react. British Gas HomeEnergy heat-pump tariff (cheap rate 11pm-5am) is competitive at ~13p/kWh and simpler for households without home automation. Avoid Economy 7 — it's designed for storage heaters not heat pumps and the rate gap is too narrow.",
        },
        {
          question:
            "What is weather compensation and why does it matter?",
          answer:
            "Weather compensation (sometimes called 'weather curve' or 'load compensation') is a control feature where the heat pump's flow temperature scales with outdoor temperature: cold day = higher flow temp, mild day = lower flow temp. This matters because heat pump efficiency (COP) drops sharply at higher flow temperatures, so you want the LOWEST flow temp that still keeps the house warm. A well-tuned weather compensation curve typically improves seasonal COP by 15-25% vs a fixed flow temperature. Almost every UK heat pump sold post-2020 supports this; many are installed with it OFF or poorly tuned. Ask your installer during commissioning to set up + show you the weather-comp curve, and tune it across the first winter (lower the curve a few degrees at a time until you hit the comfort floor).",
        },
        {
          question:
            "How do I schedule the heating to use cheap-rate hours?",
          answer:
            "Two approaches depending on your heat pump's controls. Standard: use the heat pump's built-in scheduler (every modern unit has one) to set a higher target flow temperature during cheap-rate windows and a 'maintenance' temperature outside them — the system pre-warms the house during cheap hours and coasts through expensive hours. Aim to FINISH the warming push 30-60 minutes before the cheap window ends so the house has heat reserve for the peak period. Advanced: smart controllers like Homely, Adia, or Home Assistant integrations let the system make these decisions dynamically based on weather forecast + tariff price feed. The basic scheduler covers 70-80% of the savings; the smart controllers chase the last 20%.",
        },
        {
          question:
            "Can I run a heat pump on Economy 7?",
          answer:
            "You can but it's almost always the wrong choice. Economy 7 has a 7-hour night rate (typically 12-7am or 1-8am, varies by region) that's only 30-40% cheaper than the day rate. Heat-pump-specific tariffs like Octopus Cosy have rates 50-60% cheaper in their cheap windows and offer additional cheap periods during the day, when you actually want to be heating. The main reason to consider E7 is if you already have a storage-heater contract that's hard to switch — in that case look at heat-pump tariffs at next renewal. The other case: rural Scotland where heat-pump-specific tariffs are limited; E7 may be the practical default until more suppliers extend coverage.",
        },
        {
          question:
            "What's the difference between fixed-window and dynamic tariffs?",
          answer:
            "Fixed-window tariffs have the same cheap-rate hours every day — Octopus Cosy is 4am-7am, 1pm-4pm, and 10pm-12am, day in day out. You program the heat-pump schedule once and forget it. Dynamic (or 'agile') tariffs have prices that change every 30 minutes based on the wholesale electricity market — sometimes negative (you get paid to use power), sometimes 35p+/kWh during evening peaks. Octopus Agile and Tracker are the main UK options. Dynamic tariffs typically average 15-25% cheaper than fixed-window for households that automate their consumption, but you need a smart controller that can pull the day-ahead price feed and shift loads automatically. For most homeowners, fixed-window is the right starting tariff; consider dynamic once you've lived with a heat pump for 6-12 months and want to optimise further.",
        },
        {
          question:
            "Do I need a smart meter to use a heat-pump tariff?",
          answer:
            "Yes — every heat-pump-specific UK tariff requires a SMETS2 smart meter (the second-generation smart meter, with WAN connectivity to the central data communications company). The meter sends half-hourly consumption to your supplier so they can bill the time-of-use rates correctly. If you don't already have one, your supplier will install one free as part of the tariff onboarding. SMETS1 meters from before 2018 may need a firmware update or replacement to work with HH settlement. Worth checking before you sign up — booking the smart-meter install adds 2-6 weeks to the tariff switch.",
        },
      ]}
      sources={[
        {
          name: "Octopus Energy — heat pump tariffs",
          url: "https://octopus.energy/smart/cosy-octopus/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Time of Use tariff guidance",
          url: "https://www.ofgem.gov.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Heat pump commissioning standard MIS 3005",
          url: "https://mcscertified.com/standards/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pumps + tariffs",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>The three pillars of a low-running-cost heat pump</h2>
      <p>
        Three things determine how much your heat pump costs to
        run after the install is commissioned:
      </p>
      <ol>
        <li>
          <strong>The tariff you&rsquo;re on.</strong> Standard
          variable vs heat-pump-specific can be 25–40% difference
          on the same usage profile.
        </li>
        <li>
          <strong>Weather compensation tuning.</strong> Whether
          the heat pump runs the LOWEST flow temp the house
          can tolerate. 15–25% impact on seasonal COP.
        </li>
        <li>
          <strong>The schedule.</strong> Whether you&rsquo;re
          shifting consumption into the cheap hours of your
          tariff. 10–30% impact depending on tariff shape.
        </li>
      </ol>
      <p>
        Done together, the three can take a heat pump from
        &ldquo;running cost slightly worse than gas&rdquo; to
        &ldquo;30–50% cheaper than gas&rdquo;. The gap matters
        because it determines whether the install actually pays
        back over its lifetime.
      </p>

      <h2>UK heat-pump tariffs in May 2026 — the lineup</h2>
      <h3>Fixed-window tariffs</h3>
      <p>
        These have the same cheap-rate hours every day. Easy
        to set up; you program the heat-pump scheduler once
        and forget about it.
      </p>
      <ul>
        <li>
          <strong>Octopus Cosy</strong> — three cheap windows
          per day (4am–7am, 1pm–4pm, 10pm–12am). Most popular
          heat-pump tariff in the UK. Cheap rate ~12–13p/kWh,
          peak ~38p/kWh. Eligibility: must have a heat pump or
          EV; SMETS2 smart meter required.
        </li>
        <li>
          <strong>British Gas HomeEnergy</strong> — single
          cheap window 11pm–5am at ~13p/kWh. Simpler than Cosy
          but with less daytime flexibility. Works well for
          households that can pre-heat overnight and coast.
        </li>
        <li>
          <strong>EDF GoElectric Heat Pump</strong> — cheap
          window 12am–5am at ~14p/kWh. Similar shape to British
          Gas; better for some regions.
        </li>
      </ul>

      <h3>Dynamic tariffs</h3>
      <p>
        Prices change every 30 minutes based on the wholesale
        market. Bigger savings potential but requires a smart
        controller that can react to price changes.
      </p>
      <ul>
        <li>
          <strong>Octopus Agile</strong> — half-hourly pricing
          published the previous afternoon at 4pm. Can hit
          negative pricing in surplus-wind periods. Average
          ~14–16p/kWh for a heat-pump household that automates.
        </li>
        <li>
          <strong>Octopus Tracker</strong> — daily pricing
          (not half-hourly) tied to the wholesale day-ahead
          rate. Less volatile than Agile; easier to schedule
          a day in advance. Average ~13–15p/kWh.
        </li>
      </ul>

      <h2>Weather compensation — the single biggest tweak</h2>
      <p>
        Heat-pump efficiency (COP) is fundamentally a function
        of the temperature difference between the heat source
        (outside air) and the heat sink (your radiators). The
        smaller the gap, the higher the COP.
      </p>
      <p>
        Rough rule: every 5°C lower flow temperature gives
        ~10–15% better COP. So running at 35°C flow on a mild
        day vs 50°C gives ~30–40% better efficiency than running
        a fixed 50°C all winter.
      </p>
      <p>
        Weather compensation automates this — the heat pump
        reads outdoor temperature and adjusts flow temperature
        on a curve. Cold day = higher flow temp to compensate
        for higher heat loss; mild day = lower flow temp because
        the house doesn&rsquo;t need much.
      </p>
      <p>
        A typical UK weather-comp curve for a well-insulated
        post-1990 home:
      </p>
      <ul>
        <li><strong>−3°C outside:</strong> 50°C flow</li>
        <li><strong>+2°C outside:</strong> 42°C flow</li>
        <li><strong>+7°C outside:</strong> 35°C flow</li>
        <li><strong>+12°C outside:</strong> 30°C flow (or off)</li>
      </ul>
      <p>
        Most installers commission with a conservative curve
        that errs warm. Tune it down across the first winter:
        lower the curve a couple of degrees, live with it for
        a week, check comfort. Iterate until you hit the
        threshold where comfort drops, then go back one notch.
        This is the biggest single saving you can make
        post-install — and it&rsquo;s free.
      </p>

      <h2>Scheduling — push consumption into cheap windows</h2>
      <p>
        The basic pattern for any time-of-use tariff:
      </p>
      <ul>
        <li>
          <strong>Pre-heat the house</strong> during cheap-rate
          windows. Bump the room thermostat target up by 1–2°C
          starting 1–2 hours before the cheap window starts;
          target reaches the higher temp by mid-window.
        </li>
        <li>
          <strong>Coast during expensive windows.</strong> Drop
          target back to a maintenance setpoint (e.g. 18°C);
          house stays comfortable on thermal mass.
        </li>
        <li>
          <strong>Hot-water cylinder cycle</strong> sits
          entirely inside a cheap window. Schedule the 2–4
          hour cylinder reheat in the longest cheap block.
        </li>
      </ul>
      <p>
        Practical example — Octopus Cosy schedule for a 4-person
        household:
      </p>
      <ul>
        <li>
          <strong>4am–7am cheap window:</strong> heating target
          21°C (pre-warm for morning). Cylinder reheats here.
        </li>
        <li>
          <strong>7am–1pm peak rate:</strong> heating coast to
          18°C maintenance.
        </li>
        <li>
          <strong>1pm–4pm cheap window:</strong> heating target
          20°C (pre-warm for evening).
        </li>
        <li>
          <strong>4pm–10pm peak rate:</strong> heating coast.
          House stays warm on thermal mass + radiator residual.
        </li>
        <li>
          <strong>10pm–12am cheap window:</strong> top-up to
          19°C; quick boost before bed if needed.
        </li>
      </ul>

      <h2>Smart controllers — what each one actually does</h2>
      <p>
        For dynamic tariffs (Agile, Tracker) you need a smart
        controller that pulls the day-ahead price feed and
        shifts loads in response. Three popular UK options:
      </p>
      <ul>
        <li>
          <strong>Homely</strong> — heat-pump-native controller
          launched by an MCS-affiliated startup. Plug-and-play
          with most ASHP brands; pulls Octopus Agile prices
          automatically and adjusts the schedule daily. £200
          unit + ~£10/month subscription. Easiest setup.
        </li>
        <li>
          <strong>Adia</strong> — similar concept, partnered
          with Octopus directly. Slightly cheaper monthly fee.
        </li>
        <li>
          <strong>Home Assistant</strong> — DIY route. Free
          software, runs on a Raspberry Pi (~£60). Maximum
          flexibility but requires technical setup. Community
          maintains integrations for most heat pumps + Octopus
          tariffs.
        </li>
      </ul>
      <p>
        For fixed-window tariffs (Cosy, BGE HomeEnergy) you
        don&rsquo;t need a smart controller — the heat
        pump&rsquo;s own scheduler is enough.
      </p>

      <h2>SMETS2 smart meters — the gatekeeper</h2>
      <p>
        Every UK heat-pump tariff requires a SMETS2 (second
        generation) smart meter. The meter reports half-hourly
        consumption to your supplier via the central DCC (Data
        Communications Company) network — that&rsquo;s how
        they bill the time-of-use rates correctly.
      </p>
      <p>
        If you already have one, you&rsquo;re ready. If not,
        your supplier will install one free during tariff
        onboarding. SMETS1 meters (installed 2014–2018) may
        need firmware updates to support half-hourly settlement;
        some need full replacement. Lead time: 2–6 weeks for a
        new install or upgrade booking.
      </p>
      <p>
        Confirm meter status before you sign up to a smart
        tariff — &ldquo;need smart meter installed first&rdquo; is
        the most common onboarding delay.
      </p>

      <h2>What to do in your first month on a smart tariff</h2>
      <ol>
        <li>
          <strong>Day 1–7:</strong> Watch the consumption pattern
          in your supplier&rsquo;s app. Note when peaks happen.
        </li>
        <li>
          <strong>Day 7–14:</strong> Set up the basic schedule
          (pre-heat in cheap windows, coast in peaks). Adjust
          the cylinder cycle to sit in the longest cheap block.
        </li>
        <li>
          <strong>Day 14–28:</strong> Tune the weather-comp
          curve down 1–2 degrees per week until comfort drops,
          then back off one step.
        </li>
        <li>
          <strong>Day 28–60:</strong> Review billed cost. Compare
          to the same month on a flat-rate tariff — most
          households see 25–35% reduction once schedule + comp
          are tuned.
        </li>
        <li>
          <strong>End of winter:</strong> Consider switching to
          a dynamic tariff (Agile / Tracker) if you want to
          chase additional savings.
        </li>
      </ol>

      <h2>The summary</h2>
      <p>
        A heat-pump install only realises its full running-cost
        advantage when paired with a heat-pump-specific tariff,
        weather compensation, and a schedule that pushes load
        into cheap-rate hours. Start with a fixed-window
        tariff (Cosy or BGE HomeEnergy), get weather
        compensation enabled at commissioning, and tune the
        schedule across the first month. Once you&rsquo;re
        confident, consider stepping up to a dynamic tariff
        with a smart controller for the last 10–20% of savings.
        These three pieces together typically take the
        running-cost gap vs gas from break-even to clearly
        cheaper — which is the case for the install paying
        back over its 15+ year life.
      </p>
    </AEOPage>
  );
}
