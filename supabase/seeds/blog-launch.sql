-- Launch content for the Journal — 10 SEO-targeted guide posts
-- aimed at the high-intent UK homeowner queries that drive
-- /check sign-ups (heat pump value, solar suitability, BUS grant,
-- finance vs cash, sizing, installer choice, battery, install time).
--
-- Run in the Supabase SQL editor. Idempotent: each row is keyed on
-- the unique `slug` and uses ON CONFLICT (slug) DO UPDATE so re-runs
-- just refresh the content rather than duplicating.
--
-- Categories use the existing taxonomy (Guides / Stories / News) so
-- the existing CategoryBadge palette continues to work.
--
-- Content is plain HTML — the renderer drops it into a Tailwind
-- typography (`prose`) container so semantic tags do all the styling.
-- Internal links point at the pages crawlers can already find.

insert into public.blog_posts (slug, title, excerpt, content, category, author, published, published_at)
values

-- ────────────────────────────────────────────────────────────────────
(
  'is-a-heat-pump-worth-it-uk',
  'Is a heat pump worth it in the UK? An honest 2026 answer',
  'Heat pumps cut bills versus oil and LPG and break even with mains gas — when paired with the £7,500 BUS grant. Here is when one is genuinely worth it.',
  '<p>The honest answer: <strong>a heat pump is worth it for most UK homes that currently run on oil, LPG or electric heating, and a closer call for mains-gas households unless your boiler is already on its way out.</strong> The £7,500 Boiler Upgrade Scheme grant tilts the maths heavily in their favour for England and Wales — without it, the case is much weaker.</p>

<p>Here is what actually matters when deciding.</p>

<h2>What a heat pump costs after the grant</h2>

<p>A typical 3-bed UK semi gets a 6–9 kW air-source heat pump. Headline install prices sit around £10,000–£14,000 before the grant. The Boiler Upgrade Scheme knocks £7,500 off, taking the net cost to roughly £2,500–£6,500. That is broadly in line with replacing a high-end gas combi.</p>

<ul>
  <li><strong>Oil or LPG:</strong> almost always pays back within 5–8 years thanks to far higher fuel costs.</li>
  <li><strong>Electric storage heaters:</strong> savings of £400–£900 a year are common.</li>
  <li><strong>Mains gas:</strong> often roughly cost-neutral for now. Worth it if your boiler is over 12 years old or you want to add solar later.</li>
</ul>

<h2>Will it actually heat my home?</h2>

<p>Modern heat pumps deliver flow temperatures of 45–55°C, which works fine in well-insulated homes. Older properties with single glazing or no loft insulation sometimes need bigger radiators or one or two upgrades first. A pre-survey check picks this up before any installer visits.</p>

<h2>The practical questions to answer first</h2>

<ol>
  <li>Do you have at least 1 m² of outdoor space adjacent to a wall?</li>
  <li>Is your EPC band C or above (or close to it)?</li>
  <li>Do you have somewhere for a hot water cylinder if you currently run a combi?</li>
  <li>Are your radiators reasonable size, or is upgrading them affordable?</li>
</ol>

<p>If you answered yes to most of those, the case is strong. Run a free property check to see your specific numbers — typical yearly savings, BUS eligibility, suggested system size — at <a href="/check">propertoasty.com/check</a>.</p>

<h2>When a heat pump is not worth it</h2>

<p>There are honest scenarios where holding off makes sense:</p>

<ul>
  <li>Your gas boiler is under 5 years old and running well.</li>
  <li>Your home is poorly insulated and you can not realistically upgrade soon.</li>
  <li>You rent — although tenants in long leases sometimes negotiate this with landlords.</li>
  <li>You live in a listed building without permitted-development rights.</li>
</ul>

<h2>The bottom line</h2>

<p>For most UK homes off the gas grid, a heat pump pays back faster than people expect. For mains-gas households the answer depends on boiler age and how long you plan to stay. Either way, the BUS grant transforms the maths — and grants do not last forever, so the next 12–24 months are the right window to look properly.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'heat-pump-cost-uk-2026',
  'How much does a heat pump cost in the UK? Real 2026 prices',
  'Air-source heat pumps cost £10k–£14k installed in a typical UK home. After the £7,500 BUS grant, the net is £2.5k–£6.5k. Full breakdown inside.',
  '<p>Headline numbers first: <strong>an air-source heat pump for a 3-bed UK home costs £10,000–£14,000 installed, before any grant. After the £7,500 Boiler Upgrade Scheme, the net cost lands at £2,500–£6,500.</strong> Ground-source systems run 2–3× higher because of the borehole or trench works.</p>

<p>That price range is wider than it looks because the actual cost depends on five variables.</p>

<h2>What drives the price</h2>

<table>
  <thead>
    <tr><th>Factor</th><th>Cheap end</th><th>Expensive end</th></tr>
  </thead>
  <tbody>
    <tr><td>System size</td><td>5–6 kW (small flat / well-insulated 2-bed)</td><td>14–16 kW (large 4-bed / older fabric)</td></tr>
    <tr><td>Hot water cylinder</td><td>Reusing existing</td><td>New unvented + airing-cupboard rework</td></tr>
    <tr><td>Radiators</td><td>All current size adequate</td><td>2+ need upsizing</td></tr>
    <tr><td>Pipe runs</td><td>Indoor unit ≤3 m from outdoor</td><td>Long external runs / floors lifted</td></tr>
    <tr><td>Brand</td><td>Mid-market (Mitsubishi, Daikin)</td><td>Premium (Vaillant, Viessmann)</td></tr>
  </tbody>
</table>

<h2>What is included in a typical quote</h2>

<ul>
  <li>Outdoor heat pump unit</li>
  <li>Indoor controls + hot water cylinder (usually 200–250 litres)</li>
  <li>Pipework, electrical connection, condensate drain</li>
  <li>Removal of old boiler + commissioning</li>
  <li>MCS certificate (required for the grant)</li>
  <li>Manufacturer warranty (5–10 years typical)</li>
</ul>

<h2>What is often not included</h2>

<ul>
  <li>Radiator upgrades (if needed)</li>
  <li>Loft / cavity insulation</li>
  <li>Smart thermostats beyond the bundled controller</li>
  <li>Plinth / acoustic enclosure for the outdoor unit</li>
</ul>

<p>Get the radiator and insulation question answered up front. It is the single biggest reason quotes vary.</p>

<h2>Running costs</h2>

<p>A well-installed heat pump uses roughly 2,500–4,500 kWh of electricity a year for a typical 3-bed home. At ~28p/kWh that is £700–£1,260 a year. Add a heat-pump-friendly tariff (Octopus Cosy, Intelligent Octopus Go) and you are usually 10–25% lower than mains gas equivalent — and substantially lower than oil or LPG.</p>

<h2>Grants and finance</h2>

<p>The Boiler Upgrade Scheme covers £7,500 for an air-source heat pump in England and Wales. It is paid directly to the installer, so you only ever see the net price. No VAT on installation either (zero-rated until 2027).</p>

<p>If even the net cost is too steep up front, several lenders now do unsecured 5–10 year heat-pump loans at 7–9% APR. We cover whether to pay cash or finance in <a href="/blog/pay-cash-or-finance-heat-pump">our finance guide</a>.</p>

<h2>Get a price for your specific home</h2>

<p>Generic ranges only go so far. Use the free check at <a href="/check">propertoasty.com/check</a> to get a typical price band for your address, an indicative system size, and a list of MCS-certified installers in your postcode who can quote.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'will-solar-panels-work-on-my-house',
  'Will solar panels work on my house? A UK suitability guide',
  'Solar works on most UK roofs. The four real questions: orientation, pitch, shading and roof condition. Here is how to check yours in 5 minutes.',
  '<p>Solar PV works on the vast majority of UK homes. <strong>If your roof faces somewhere between east and west (avoiding north), is between 20° and 50° pitched, has minimal shading from chimneys or trees, and is in good structural shape, you can run solar.</strong> Even an east–west split roof works well — modern panels handle non-south orientations far better than old systems did.</p>

<h2>The four-factor suitability check</h2>

<h3>1. Orientation</h3>

<p>South-facing is best, but not by as much as people think. East or west loses about 15–20% versus south over the year. North-facing loses too much to be worthwhile. Many UK homes have an east–west split roof — that is fine, panels go on both sides.</p>

<h3>2. Pitch</h3>

<p>Most UK pitched roofs (typically 35–45°) are ideal. Anything between 20° and 50° works. Flat roofs need ballast frames, which works but adds cost and weight.</p>

<h3>3. Shading</h3>

<p>Hard shadows (chimneys, dormers, neighbouring trees) cost a panel its output for the part of the day it is in shadow. Optimisers and microinverters partly compensate but they cost more. Soft seasonal shading (a tree to the north) usually does not matter much.</p>

<h3>4. Roof condition</h3>

<p>Panels last 25–30 years. Your roof needs to last that long too. If you are due to re-tile within 10 years, do that first or factor a panel removal/refit (~£800–£1,200) into the maths.</p>

<h2>How big a system fits?</h2>

<p>A typical UK panel is 1.7 m × 1.1 m. A 3-bed semi roof with a clear south-facing pitch usually fits 8–14 panels (3.2–5.6 kWp). With our roof analysis we read this directly from satellite imagery and Google Solar API data, so the suitability answer is specific to your address rather than a postcode-level guess.</p>

<h2>What stops solar working</h2>

<ul>
  <li><strong>Heavy shading from a tall building or tree directly south.</strong></li>
  <li><strong>A flat or near-flat roof with limited weight-bearing capacity.</strong></li>
  <li><strong>Listed buildings without consent</strong> — though even Grade II often allows panels on rear elevations.</li>
  <li><strong>Conservation areas</strong> — usually fine, sometimes need planning.</li>
</ul>

<h2>What about cloudy UK weather?</h2>

<p>Honest answer: panels still produce 10–25% of peak output on overcast days. The UK gets 800–1,200 kWh of solar yield per kWp installed per year — south-coast homes do better, north Scotland less. A 4 kWp system in the Midlands typically generates 3,400–3,800 kWh a year, around 80–90% of an average home&apos;s electricity use.</p>

<h2>Get a roof-specific answer</h2>

<p>Run a free check at <a href="/check">propertoasty.com/check</a>. We pull your actual roof shape from satellite, calculate annual yield from PVGIS climate data, and tell you the exact kWp that fits — not a national average.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'are-solar-panels-worth-it-uk',
  'Are solar panels worth it in the UK in 2026?',
  'Solar pays back in 7–11 years for most UK homes, then runs free for another 15+. We show the maths with current install costs, tariffs and export rates.',
  '<p>Yes — for most UK homes solar pays back in <strong>7–11 years and then runs effectively free for another 15+</strong>. The maths is tighter than it was in 2020 because install prices fell, but it stayed worthwhile because import-electricity prices roughly doubled between 2021 and 2024 and never came all the way back down.</p>

<h2>The 4 kWp baseline scenario</h2>

<p>A typical 3-bed UK home installs a 4 kWp system (around 10 panels). That generates roughly 3,500 kWh a year on average (more in the south, less further north).</p>

<table>
  <thead>
    <tr><th>Item</th><th>Typical value</th></tr>
  </thead>
  <tbody>
    <tr><td>Install cost</td><td>£5,500–£7,500</td></tr>
    <tr><td>Annual generation</td><td>3,500 kWh</td></tr>
    <tr><td>Self-consumed (without battery)</td><td>~30% — saves at 28p/kWh</td></tr>
    <tr><td>Exported to grid (without battery)</td><td>~70% — paid 5–15p/kWh via SEG</td></tr>
    <tr><td>Annual saving</td><td>£600–£800</td></tr>
    <tr><td>Payback</td><td>8–10 years</td></tr>
    <tr><td>Lifetime ROI (25 yr panel life)</td><td>£8,000–£12,000 net of install</td></tr>
  </tbody>
</table>

<h2>Where the variables move the answer</h2>

<ul>
  <li><strong>Add a battery:</strong> self-consumption rises from ~30% to ~70%. Annual saving climbs to £900–£1,150 but you spend £3,500–£5,000 on the battery. Payback similar; lifetime ROI better.</li>
  <li><strong>South-facing roof + good pitch:</strong> annual generation can reach 4,200 kWh, knocking 1–2 years off payback.</li>
  <li><strong>EV at home:</strong> charging during daylight hours is essentially free for the part covered by solar. Adds £200–£400 a year of value.</li>
  <li><strong>SEG tariff matters.</strong> Octopus Outgoing pays 15p/kWh — over double some incumbents. Worth switching when you commission.</li>
</ul>

<h2>What kills the maths</h2>

<ul>
  <li>Buying a 6 kWp+ system you can not self-consume without a battery.</li>
  <li>Heavy shading reducing real-world yield by 30%+.</li>
  <li>Choosing the cheapest installer and getting cheap panels with sub-25-year warranties.</li>
  <li>Moving home before payback (you do recover some of it via the value added to the property — typically 4%).</li>
</ul>

<h2>VAT, planning, and other small print</h2>

<ul>
  <li>0% VAT on residential solar installation until April 2027.</li>
  <li>No grant for solar in England, Wales or Scotland (unlike heat pumps).</li>
  <li>Permitted development covers most homes — no planning needed unless you are listed or in a conservation area.</li>
  <li>Smart Export Guarantee (SEG) tariffs are mandated by Ofgem — every supplier with 150,000+ customers must offer one.</li>
</ul>

<h2>Get specific numbers for your address</h2>

<p>Generic averages are useful for the &quot;is it worth it&quot; gut check, but the actual answer depends on your roof. Run the check at <a href="/check">propertoasty.com/check</a> — we use real satellite data + UK PVGIS climate data to estimate your annual kWh, then back-calculate the saving against your actual tariff.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'pay-cash-or-finance-heat-pump',
  'Heat pump: should I pay cash or finance it?',
  'Cash wins on total cost, but unsecured heat-pump loans at 7–9% APR pay for themselves in years 4–10 thanks to bill savings. Here is the comparison.',
  '<p>Quick answer: <strong>pay cash if you have it sitting in a current account earning under 4% — the saved interest beats the borrowing cost. Finance if your alternative is dipping into emergency savings, an ISA earning more than the loan APR, or you would just rather not commit £5k+ in one hit.</strong></p>

<h2>The numbers, side by side</h2>

<p>Take a typical net cost of £5,000 (after the £7,500 BUS grant), 7% APR over 7 years, and an annual energy saving of £500.</p>

<table>
  <thead>
    <tr><th></th><th>Cash</th><th>Finance (7% / 7 yr)</th></tr>
  </thead>
  <tbody>
    <tr><td>Up-front payment</td><td>£5,000</td><td>£0</td></tr>
    <tr><td>Monthly payment</td><td>—</td><td>£75</td></tr>
    <tr><td>Total paid over 7 years</td><td>£5,000</td><td>£6,316</td></tr>
    <tr><td>Energy saved over 7 years</td><td>£3,500</td><td>£3,500</td></tr>
    <tr><td>Net cost over 7 years</td><td>£1,500</td><td>£2,816</td></tr>
    <tr><td>Cash flow in year 1</td><td>−£4,500</td><td>−£400</td></tr>
  </tbody>
</table>

<h2>When cash makes sense</h2>

<ul>
  <li>The money is in a low-interest savings account or current account.</li>
  <li>You do not need it for any other near-term spend.</li>
  <li>You want the simplest possible setup with no monthly bill.</li>
</ul>

<h2>When finance makes sense</h2>

<ul>
  <li>Your alternative cash is in a 5%+ ISA or fixed savings.</li>
  <li>You are about to move soon and would rather not lock up capital.</li>
  <li>You have a large home upgrade in flight and want to spread the cost.</li>
  <li>Your boiler has packed in and you need it now without raiding emergency savings.</li>
</ul>

<h2>What to look for in a loan</h2>

<ol>
  <li><strong>APR under 9%.</strong> Above that the maths gets uncomfortable.</li>
  <li><strong>No early-repayment penalty.</strong> Lets you dump it if circumstances change.</li>
  <li><strong>Fixed rate for the whole term.</strong> Variable rates kill the comparison.</li>
  <li><strong>Personal loan or green-mortgage top-up</strong> — green-mortgage rates are often 0.25–0.5% lower than standard.</li>
</ol>

<h2>What about extending your mortgage?</h2>

<p>If you have headroom, a green-mortgage extension is often the cheapest borrowing — sub-5% APR is common. Total interest is higher because the term is longer (20+ years), but the monthly payment is much lower. Treat it like cash for the &quot;is the heat pump worth it&quot; analysis.</p>

<h2>The honest answer</h2>

<p>For most homeowners with savings earning less than 4%, cash is marginally cheaper but the comfort of an emergency buffer matters more. Splitting the difference works fine — cash for the deposit, finance for the rest. The £500–£900 a year energy saving covers most of the loan repayments either way.</p>

<p>Run the numbers for your specific home at <a href="/check">propertoasty.com/check</a> — we estimate the annual saving against your actual tariff so you can plug it into the comparison above.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'boiler-upgrade-scheme-explained',
  'Boiler Upgrade Scheme: the £7,500 grant explained',
  'The Boiler Upgrade Scheme pays £7,500 toward a heat pump install in England and Wales. Who qualifies, what is excluded, and how to claim.',
  '<p>The Boiler Upgrade Scheme (BUS) is a UK government grant that pays <strong>£7,500 toward an air-source heat pump (or a biomass boiler in eligible properties)</strong> in England and Wales. Ground-source heat pumps qualify for the same £7,500. The grant is paid directly to your MCS-certified installer — you never see it as cash, but it comes off the quoted price.</p>

<p>It runs until at least 2028 (extended in the 2024 Spring Budget) but the budget is finite, so it operates on a first-come-first-served basis.</p>

<h2>Who qualifies</h2>

<ul>
  <li>You own the property (or have your landlord&apos;s permission and a lease &gt;3 years).</li>
  <li>The property is in England or Wales (Scotland has a different scheme — see below).</li>
  <li>You have an EPC issued in the last 10 years with no outstanding loft / cavity-wall recommendations (or a valid exemption letter).</li>
  <li>You are replacing a fossil-fuel system (gas, oil, LPG, coal) — direct electric counts too.</li>
  <li>The installation is MCS certified.</li>
</ul>

<h2>What is excluded</h2>

<ul>
  <li>New-build properties (different scheme — Future Homes Standard).</li>
  <li>Social housing in most cases (separate funding routes).</li>
  <li>Properties without an EPC (you can get one — costs ~£60).</li>
  <li>Hybrid systems where the heat pump is not the primary source.</li>
</ul>

<h2>How to claim</h2>

<ol>
  <li>Get an MCS-certified installer to quote.</li>
  <li>The installer applies for the BUS voucher on your behalf.</li>
  <li>Ofgem checks eligibility — usually takes 5–10 working days.</li>
  <li>Voucher is issued (valid 3 months).</li>
  <li>Installer commissions the system within the validity window.</li>
  <li>Installer claims the £7,500 from Ofgem after commissioning. You pay the net price.</li>
</ol>

<p>You never deal with Ofgem directly. If your installer is MCS certified they have done it dozens of times.</p>

<h2>What about Scotland and Northern Ireland?</h2>

<ul>
  <li><strong>Scotland:</strong> Home Energy Scotland Loan + Cashback — up to £7,500 grant + £7,500 interest-free loan. Stronger overall than the BUS.</li>
  <li><strong>Northern Ireland:</strong> No equivalent national scheme as of 2026. Some local-authority green-home grants exist sporadically.</li>
</ul>

<h2>Common reasons claims get rejected</h2>

<ul>
  <li>Outstanding loft-insulation recommendation on the EPC. Fix this first or get an exemption letter from a chartered surveyor.</li>
  <li>EPC over 10 years old. Cheap to renew.</li>
  <li>Property classed as new-build (less than 18 months from completion).</li>
  <li>Installer not MCS certified — happens more than you would expect.</li>
</ul>

<h2>Stacking with other schemes</h2>

<p>The BUS does not stack with ECO4 funding or with new-build incentives. It does stack with:</p>

<ul>
  <li>0% VAT on installation (until April 2027).</li>
  <li>Capital allowances (for landlords).</li>
  <li>Local-authority schemes in some areas (Cornwall, Manchester have offered top-ups).</li>
</ul>

<h2>Check your eligibility</h2>

<p>Run the free check at <a href="/check">propertoasty.com/check</a> — we cross-check your EPC and outdoor-space requirements against the live BUS rules and tell you whether you qualify in plain English.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'what-size-heat-pump-do-i-need',
  'What size heat pump do I need? UK sizing guide',
  'Most UK 3-bed homes need a 6–9 kW heat pump. The right size depends on heat loss, not house size — here is how to estimate yours quickly.',
  '<p>The short version: <strong>most UK 3-bed homes need a 6–9 kW air-source heat pump. Smaller flats and well-insulated 2-beds run on 4–6 kW. Big or older 4–5-bed homes can need 11–14 kW.</strong> But what actually drives the answer is heat loss, not floor area — a small Victorian terrace with single glazing can lose more heat than a large modern detached.</p>

<h2>The headline numbers</h2>

<table>
  <thead>
    <tr><th>Property</th><th>Typical heat loss</th><th>Recommended HP</th></tr>
  </thead>
  <tbody>
    <tr><td>1-bed flat, modern, EPC B+</td><td>2.5 kW</td><td>4–5 kW</td></tr>
    <tr><td>2-bed mid-terrace, EPC C</td><td>4 kW</td><td>5–6 kW</td></tr>
    <tr><td>3-bed semi, 1960–80s, EPC C</td><td>6 kW</td><td>7–8 kW</td></tr>
    <tr><td>3-bed Victorian, EPC D</td><td>8 kW</td><td>9–11 kW</td></tr>
    <tr><td>4-bed detached, 1960–80s, EPC C</td><td>9 kW</td><td>11–13 kW</td></tr>
    <tr><td>5-bed period, EPC E</td><td>14 kW+</td><td>14–16 kW (or two units)</td></tr>
  </tbody>
</table>

<p>The heat loss figure is design heat loss — kW needed at the coldest design day (-3°C in most of the UK, -5°C in Scotland). MCS installers must do an MCS Heat Loss Calculation as part of any compliant install — it is the document that drives sizing.</p>

<h2>Why oversizing is a problem</h2>

<p>An oversized heat pump cycles on and off rather than modulating cleanly. That hurts efficiency (lower COP) and shortens compressor life. A correctly-sized unit runs for long stretches at a low output and that is the optimum for COP.</p>

<h2>Why undersizing is also a problem</h2>

<p>If the heat pump can not meet design heat loss on the coldest day, it leans on its electric immersion backup. That defeats the point: the immersion runs at COP 1.0 (every 1 kWh in = 1 kWh out), versus a correctly-sized HP running at COP 3+ on cold days.</p>

<h2>The four inputs that determine size</h2>

<ol>
  <li><strong>Floor area + ceiling heights</strong> — gives total volume.</li>
  <li><strong>Fabric U-values</strong> — walls, roof, floor, glazing. Read off the EPC if known, or fall back to age-band defaults.</li>
  <li><strong>Air infiltration</strong> — older properties leak more.</li>
  <li><strong>Design temperature</strong> — colder regions need slightly larger sizing.</li>
</ol>

<h2>Quick estimate without an installer</h2>

<p>The rough rule: <strong>heat loss in kW ≈ floor area in m² ÷ floor-area heat-loss factor</strong>. The factor depends on age band:</p>

<ul>
  <li>Pre-1929: ÷10</li>
  <li>1930–1980: ÷12</li>
  <li>1980–2000: ÷15</li>
  <li>2000+: ÷20</li>
</ul>

<p>A 100 m² 1950s semi: 100 ÷ 12 ≈ 8.3 kW heat loss → 8–9 kW heat pump. This is rough — proper sizing is on a per-room basis with U-values, not whole-house averages — but it gets you in the right ballpark.</p>

<h2>What if my radiators are too small for the new size?</h2>

<p>That is the most common upgrade in heat-pump installs. Heat pumps run at 45–55°C flow rather than gas combi&apos;s 70–80°C, so you need slightly more radiator surface area. Your installer will flag the rooms where current radiators are undersized — usually 0–3 rooms in a typical home.</p>

<h2>Get a sizing estimate for your address</h2>

<p>Run the free check at <a href="/check">propertoasty.com/check</a> — we use your EPC fabric data + uploaded floorplan to give an indicative system size with the same maths an MCS installer would do on day one of a survey.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'how-long-does-heat-pump-installation-take',
  'How long does a heat pump installation take? UK timeline',
  'Most UK heat pump installs take 2–4 days on site, plus 6–10 weeks of lead time. Full timeline from quote to first warm radiator inside.',
  '<p>The on-site work for a typical UK heat pump install is <strong>2–4 days</strong>. The full timeline from your first quote request to having a warm home is <strong>6–14 weeks</strong> — most of that wait is BUS voucher processing and waiting for the installer&apos;s diary to clear, not the install itself.</p>

<h2>The full timeline at a glance</h2>

<table>
  <thead>
    <tr><th>Stage</th><th>Typical time</th></tr>
  </thead>
  <tbody>
    <tr><td>Initial enquiry → quote received</td><td>1–3 weeks</td></tr>
    <tr><td>Quote accepted → BUS voucher issued</td><td>2–3 weeks</td></tr>
    <tr><td>Voucher → installer slot</td><td>3–6 weeks</td></tr>
    <tr><td>Install on site</td><td>2–4 days</td></tr>
    <tr><td>Commissioning + handover</td><td>same week</td></tr>
    <tr><th>Total</th><th>6–14 weeks</th></tr>
  </tbody>
</table>

<h2>Day 1 — strip out + outdoor unit</h2>

<ul>
  <li>Old boiler removed, gas safely capped.</li>
  <li>Outdoor heat pump unit positioned, secured, and wired.</li>
  <li>Condensate drain run to a soakaway or downpipe.</li>
  <li>Hot water cylinder lifted into position.</li>
  <li>Heating off for the day — bring layers, kettle still works.</li>
</ul>

<h2>Day 2 — pipework + cylinder</h2>

<ul>
  <li>Indoor pipework run between the cylinder, the old boiler position and the new outdoor unit.</li>
  <li>Cylinder plumbed in (typical 200–250 L unvented).</li>
  <li>Existing radiators reconnected; any upgrades fitted.</li>
  <li>Power supply upgraded if needed (occasionally needs a separate consumer-unit feed).</li>
</ul>

<h2>Day 3 — commissioning</h2>

<ul>
  <li>System filled, vented, pressure-tested.</li>
  <li>Refrigerant charged + tested.</li>
  <li>Initial ramp-up — the system runs at low temp first to stabilise.</li>
  <li>Smart controls set up + paired to your phone.</li>
  <li>Walk-through with you on how to use the controller and what each setting does.</li>
</ul>

<h2>Day 4 (sometimes) — sign-off</h2>

<p>If the install needs anything bespoke — radiator upgrades in 2+ rooms, an acoustic enclosure, a complex pipe run — there is sometimes a final morning of finishing work. The MCS sign-off paperwork lands in your inbox shortly after.</p>

<h2>What slows the timeline down</h2>

<ul>
  <li><strong>Outstanding EPC recommendations</strong> — loft-insulation top-ups can add 1–2 weeks.</li>
  <li><strong>Roof / cladding work needed for the outdoor unit fixing</strong> — adds half a day.</li>
  <li><strong>Listed-building or conservation-area consent</strong> — adds 6–8 weeks if applicable.</li>
  <li><strong>Power upgrade by your DNO</strong> — 4–8 weeks if the property needs a 100A supply (rare).</li>
</ul>

<h2>What you can do to speed things up</h2>

<ol>
  <li>Get your EPC done early if it is over 10 years old.</li>
  <li>Sort any outstanding fabric recommendations before quoting.</li>
  <li>Have a photo or sketch of your existing boiler + cylinder space ready for the surveyor.</li>
  <li>Be flexible on the install week — installers will fit you in faster if you can take a Tuesday slot rather than insisting on a Monday.</li>
</ol>

<h2>Heating during the install</h2>

<p>You lose central heating for the day or two of the strip-out. Most installers schedule between April and October to dodge this entirely; if you must install in winter, plug-in oil-filled radiators handle the gap fine.</p>

<h2>Get installer availability for your postcode</h2>

<p>Run the free check at <a href="/check">propertoasty.com/check</a>. We list MCS-certified installers in your area with their next available site-visit slot, so you can see realistic dates rather than &quot;up to 14 weeks&quot;.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'is-a-home-battery-worth-it',
  'Is a home battery worth it with solar in the UK?',
  'A home battery costs £3,500–£5,000 and saves £150–£300 a year on its own. Worth it depends on tariff, EV ownership and how often you are home.',
  '<p>Quick answer: <strong>a home battery alone (no solar) is rarely worth it. Paired with solar it makes much more sense — typically 8–12 year payback. The maths gets dramatically better if you are on a time-of-use tariff or charge an EV at home.</strong></p>

<h2>Three battery scenarios, three different answers</h2>

<h3>1. Solar + battery</h3>

<p>This is the most common pairing. A 4 kWp solar system without a battery self-consumes ~30% of what it generates and exports the rest at the SEG rate (5–15p/kWh). With a 5 kWh battery that flips to ~70% self-consumption — saving the full retail rate (~28p/kWh) on what would otherwise have been exported.</p>

<table>
  <thead>
    <tr><th></th><th>Solar only</th><th>Solar + battery</th></tr>
  </thead>
  <tbody>
    <tr><td>Annual saving</td><td>£600–£800</td><td>£900–£1,150</td></tr>
    <tr><td>Up-front cost</td><td>£5,500–£7,500</td><td>£9,000–£12,500</td></tr>
    <tr><td>Payback</td><td>8–10 yr</td><td>9–12 yr</td></tr>
  </tbody>
</table>

<h3>2. Battery alone (no solar)</h3>

<p>This works only if you are on a time-of-use tariff like Octopus Go or Intelligent Octopus. The strategy: charge the battery overnight at 7p/kWh, discharge during the day at 28p/kWh. Saves around £150–£300 a year. With a £3,500 battery that is 12–24 year payback — most batteries are warranted for 10. <strong>Hard to make worthwhile on its own unless you have a specific reason (e.g. unreliable grid).</strong></p>

<h3>3. Battery + solar + EV</h3>

<p>This is where the maths gets compelling. The EV becomes a giant battery for free daytime charging. Annual savings climb to £1,200–£1,500 for a household that drives a typical 8,000 miles. Payback drops to 6–8 years.</p>

<h2>What size battery?</h2>

<ul>
  <li><strong>5 kWh:</strong> covers most of the evening for a 3-bed home using 8–10 kWh/day. Good starting size.</li>
  <li><strong>10 kWh:</strong> covers an EV charge or two days of off-grid running. Better fit if you generate &gt;4 kWp of solar.</li>
  <li><strong>13.5 kWh+ (Tesla Powerwall, etc.):</strong> overkill for most UK homes — you struggle to fill it from a typical solar setup.</li>
</ul>

<p>Rule of thumb: <strong>battery kWh ≈ 1.5× your average daily evening consumption</strong>. Bigger than that and you are paying for capacity you never fill.</p>

<h2>Lifetime + warranty</h2>

<p>Modern lithium-iron-phosphate (LFP) batteries — Tesla Powerwall, GivEnergy, FOX, Pylon — are warranted for 10 years and 6,000–10,000 cycles. Real-world life is closer to 15 years if you do not abuse them. Replacement at year 12–15 should be cheaper than today thanks to falling cell prices.</p>

<h2>Honest reasons not to buy a battery yet</h2>

<ul>
  <li>You are on a flat-rate import tariff and not planning to switch.</li>
  <li>You are out of the house all day and exporting most of your solar anyway — a Smart Export Guarantee tariff at 15p might serve you better.</li>
  <li>You are likely to move within 5 years (you recover some of the cost via house value, but not all).</li>
  <li>You can not site it somewhere reasonable — they prefer cool, dry indoor spaces.</li>
</ul>

<h2>Get specific numbers</h2>

<p>The right answer depends on your exact tariff, daily consumption shape, and existing solar. Run the free check at <a href="/check">propertoasty.com/check</a> — we model the with-battery vs without-battery savings using your real tariff and roof yield, not a national average.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'how-to-choose-mcs-installer',
  'How to choose an MCS-certified heat pump installer',
  'MCS certification is mandatory for the BUS grant. Beyond that, the differences between installers matter — here are the seven questions to ask.',
  '<p><strong>MCS certification is mandatory if you want the £7,500 Boiler Upgrade Scheme grant — the BUS only pays out for MCS installs.</strong> But MCS sets a floor, not a ceiling. The differences between MCS installers — design quality, brand allegiance, after-sales support, surveyor experience — make a bigger difference than the certification itself.</p>

<h2>What MCS guarantees</h2>

<ul>
  <li>The installer has been independently audited against the MCS heat-pump standards.</li>
  <li>They have a quality-management system (so you can complain through MCS if something goes wrong).</li>
  <li>They use heat-loss calculation methods aligned with MIS 3005.</li>
  <li>You can claim the BUS, ECO4 and most green-mortgage rates.</li>
</ul>

<h2>What MCS does not guarantee</h2>

<ul>
  <li>Sizing accuracy — some installers consistently oversize (their fault) or rely on quick rules of thumb.</li>
  <li>Brand neutrality — some are tied to a single manufacturer with worse warranties.</li>
  <li>That the surveyor will visit before quoting (some quote off photos).</li>
  <li>Long-term maintenance availability.</li>
</ul>

<h2>The seven questions to ask before signing</h2>

<ol>
  <li><strong>Will you do an MCS Heat Loss Calculation per room before quoting?</strong> Yes is the only acceptable answer. Whole-house estimates are not MCS-compliant.</li>
  <li><strong>Which manufacturers do you fit, and why?</strong> Be wary of installers who only fit one. Independents who can fit 3–5 brands are usually more honest about which suits your property.</li>
  <li><strong>What will the system flow temperature be?</strong> 45–55°C is normal. If they are quoting 60°C+ it suggests they have not designed for the radiators properly — efficiency suffers.</li>
  <li><strong>Will any radiators need upsizing?</strong> Get a written list. Surprise upgrades during install are the most common quote overrun.</li>
  <li><strong>What COP / SCOP are you targeting?</strong> SCOP of 3.0 is the minimum sensible target; 3.5+ is achievable on most modern installs.</li>
  <li><strong>Who handles warranty claims?</strong> Direct manufacturer warranty is best. &quot;Through us&quot; warranties go away if the installer goes out of business.</li>
  <li><strong>Can I see two recent installs in postcodes near mine?</strong> Most good installers will give you references on request.</li>
</ol>

<h2>Red flags</h2>

<ul>
  <li>Quoting without a site visit (acceptable for a rough indication, not for a contract).</li>
  <li>Pushing a particular brand for &quot;best price&quot;.</li>
  <li>Vague answers on heat-loss calc methodology.</li>
  <li>£200+ &quot;survey fees&quot; that are non-refundable if you do not proceed.</li>
  <li>Pressure to sign that day or lose a discount.</li>
</ul>

<h2>How many quotes should I get?</h2>

<p>Three is the sweet spot. One is too few — you have no comparison. Five+ wastes everyone&apos;s time. The variance between three quotes will tell you whether your property is straightforward (quotes within £1k of each other) or complex (£3k+ spread, suggesting different design assumptions).</p>

<h2>Vetting beyond MCS</h2>

<ul>
  <li><strong>Companies House</strong> — check incorporation date, last accounts. Avoid installers under 2 years old unless they came out of an established parent.</li>
  <li><strong>Trustpilot / Checkatrade</strong> — look at the 1- and 2-star reviews specifically.</li>
  <li><strong>Specialist trade bodies</strong> — Heat Pump Federation membership is a good marker.</li>
</ul>

<h2>How we help</h2>

<p>Our pre-survey check shortlists MCS-certified installers in your postcode based on capabilities (brand allegiance, site-visit availability, recent work in similar properties) — so you do not have to start from scratch on Google. Run it at <a href="/check">propertoasty.com/check</a>.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
)

on conflict (slug) do update set
  title       = excluded.title,
  excerpt     = excluded.excerpt,
  content     = excluded.content,
  category    = excluded.category,
  author      = excluded.author,
  published   = excluded.published,
  published_at = coalesce(blog_posts.published_at, excluded.published_at),
  updated_at  = now();
