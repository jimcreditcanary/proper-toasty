-- Second batch of Journal content — 10 more SEO-targeted guide posts
-- complementing supabase/seeds/blog-launch.sql.
--
-- Targets the next ring of high-intent UK homeowner queries:
--   - air-source vs ground-source comparison
--   - "will it work in an old house?" objection
--   - running cost (vs upfront)
--   - noise / planning concerns
--   - solar + heat pump combination
--   - Smart Export Guarantee (SEG)
--   - best tariff (Octopus Cosy etc.)
--   - flat / leasehold edge case
--   - 2035 gas boiler ban (news angle)
--   - insulation prerequisite
--
-- Same idempotent pattern as batch 1 — keyed on slug, ON CONFLICT
-- updates content rather than duplicating. cover_image left null
-- here; the existing blog-cover-images.sql pattern applies if/when
-- per-post imagery lands.

insert into public.blog_posts (slug, title, excerpt, content, category, author, published, published_at)
values

-- ────────────────────────────────────────────────────────────────────
(
  'air-source-vs-ground-source-heat-pump',
  'Air source vs ground source heat pump: which is right for your home?',
  'Air source heat pumps suit 95% of UK homes. Ground source pays back faster but needs land or a borehole. Here is how to choose without overspending.',
  '<p>For most UK homes, the answer is <strong>air source</strong>. Ground source is more efficient and cheaper to run, but the install costs are 2-3× higher and you need either a big garden or money for a borehole. Ground source only beats air source on whole-life cost when you have the space and plan to stay 15+ years.</p>

<p>Here is a clean side-by-side, not the marketing version.</p>

<h2>How they actually work</h2>

<p>Both pumps move heat from outside to inside — they do not generate heat, they <em>relocate</em> it. The difference is where they pull from.</p>

<ul>
  <li><strong>Air source (ASHP):</strong> a fridge-sized box outside the property pulls warmth out of the air, even at -15°C. Around 90% of UK heat-pump installs.</li>
  <li><strong>Ground source (GSHP):</strong> a network of buried pipes (a "ground array") pulls heat from the soil, where temperature is steadier than the air. Either laid horizontally (needs a tennis-court-sized garden) or drilled vertically as a borehole.</li>
</ul>

<h2>Cost — what you actually pay</h2>

<p>Both qualify for the <a href="/blog/boiler-upgrade-scheme-explained">£7,500 Boiler Upgrade Scheme</a> grant. After the grant:</p>

<ul>
  <li><strong>Air source:</strong> typically £2,500-£6,500 net for an average UK home.</li>
  <li><strong>Ground source:</strong> £15,000-£25,000 net. The borehole alone runs £8,000-£15,000.</li>
</ul>

<p>The gap is the buried infrastructure — pipes, drilling rigs, ground reinstatement. The pump itself is comparably priced.</p>

<h2>Efficiency — why ground source costs less to run</h2>

<p>Heat pumps are rated by their Seasonal Coefficient of Performance (SCOP) — how many units of heat they produce per unit of electricity used.</p>

<ul>
  <li><strong>Air source:</strong> SCOP 3.0-4.0 (modern units). Drops in cold snaps when the outside air gets close to freezing.</li>
  <li><strong>Ground source:</strong> SCOP 4.0-5.0. The ground stays around 8-12°C year-round even when the air is below zero, so efficiency is steadier.</li>
</ul>

<p>For a typical 12,000 kWh/yr heat demand at 30p/kWh electricity: ASHP costs roughly £900-£1,200/yr to run, GSHP £700-£900/yr. The ~£200-£300/yr saving rarely makes up the £10k+ install premium within a normal ownership window.</p>

<h2>When ground source is genuinely worth it</h2>

<ul>
  <li>You have a large garden (1,000m²+) — horizontal arrays avoid borehole costs.</li>
  <li>You are building new — trenches are easy when the soil is already turned.</li>
  <li>Heritage / conservation property where an outdoor unit would be refused.</li>
  <li>You plan to stay 15+ years and you are heating a high-demand property (4-bed+).</li>
</ul>

<h2>When air source is the obvious answer</h2>

<ul>
  <li>You are retrofitting an existing home — almost always.</li>
  <li>You have a small or paved garden.</li>
  <li>You want the simpler, faster install (1-3 days vs 1-2 weeks).</li>
  <li>You need to budget around the BUS grant.</li>
</ul>

<h2>What about hybrid systems?</h2>

<p>A hybrid pairs an air source heat pump with a small gas boiler that kicks in on the coldest days. You lose BUS eligibility (it requires a fully fossil-free system) and the maintenance is doubled. Hard to recommend over a properly-sized standalone heat pump in 2026.</p>

<h2>How to decide</h2>

<p>If you are in a typical UK home with a normal-sized garden: air source. If you have land and plan to stay long-term: get a ground source quote alongside an air source one and compare 15-year running costs against the install premium. Our <a href="/check">free pre-survey check</a> shows the install size and running cost for an air source system on your specific property in five minutes.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'do-heat-pumps-work-in-old-houses',
  'Do heat pumps work in old houses? The honest answer for UK homes',
  'Yes, heat pumps work in pre-1930s homes — but you need bigger radiators, decent insulation, and a properly-sized system. Here is what actually matters.',
  '<p><strong>Yes — heat pumps work in old houses.</strong> The ones that fail are not victims of their age, they are victims of bad design: an undersized pump, the original radiators, and zero attention to draughts. Get those three right and a Victorian terrace can run on a heat pump as well as a 2024 new-build.</p>

<p>Here is what actually matters in an older property.</p>

<h2>The radiator question</h2>

<p>Heat pumps run cooler water through your radiators (45-50°C) than a gas boiler (65-75°C). To heat a room with cooler water, you need more radiator surface area. In practice that means 30-50% bigger radiators in most rooms.</p>

<p>This is the single biggest reason people think heat pumps "do not work" in old homes. They get a quote that keeps the existing radiators, the system runs flat-out trying to deliver heat through undersized panels, and the homeowner blames the heat pump.</p>

<ul>
  <li>A K2 (double-panel) usually replaces a K1 (single-panel) one-for-one in the same wall space.</li>
  <li>Radiator upgrades typically add £1,500-£3,000 to a heat pump install. Often included in the headline quote.</li>
  <li>Underfloor heating works even better but is rarely worth retrofitting through an existing floor.</li>
</ul>

<h2>The insulation question</h2>

<p>You do not need to insulate every wall before getting a heat pump. You do need to make sure heat is not pouring out of obvious places.</p>

<ul>
  <li><strong>Loft insulation</strong> to current standards (270mm). The BUS grant requires this anyway.</li>
  <li><strong>Cavity wall insulation</strong> if you have unfilled cavities. Also BUS-required.</li>
  <li><strong>Draught-proofing</strong> around sash windows, floorboards, letterboxes. Cheap and high-impact.</li>
  <li><strong>Solid wall insulation</strong> is nice-to-have, not essential. Most Victorian homes run heat pumps fine without it.</li>
</ul>

<p>EPC band E or above is a reasonable target before installing. We have a separate guide on <a href="/blog/insulation-before-heat-pump">insulation prerequisites for heat pumps</a>.</p>

<h2>The sizing question</h2>

<p>An older home loses more heat than a modern one — typically 80-120 W/m² versus 40-60 W/m² for a recent build. That means a 3-bed Victorian needs an 8-10 kW heat pump where a 3-bed new-build needs 5-6 kW.</p>

<p>A proper installer will do a heat-loss survey on the day, room by room. Walk away from anyone quoting from desktop estimates alone — they will undersize, and the system will struggle in January.</p>

<h2>What about period features?</h2>

<p>Heat pumps and heritage homes coexist fine.</p>

<ul>
  <li>The outdoor unit is the size of a fridge. Tucked behind a side return or in a back garden corner, it is invisible from the street.</li>
  <li>Listed buildings need consent for the outdoor unit (same as a satellite dish). Most consent applications go through.</li>
  <li>Conservation areas usually classify heat pumps as permitted development under MCS planning rules — no application needed.</li>
</ul>

<h2>Real running costs in an old home</h2>

<p>A well-installed heat pump in a Victorian terrace typically achieves SCOP 2.8-3.5 — slightly below modern homes but well above the breakeven point with mains gas. Expect annual running costs of £900-£1,400 for a 3-bed in this category.</p>

<p>If your installer is quoting SCOP 4.0+ on a Victorian property, push back. They are likely showing best-case lab figures, not real-world performance.</p>

<h2>The bottom line</h2>

<p>Heat pumps work in old houses when designed properly. They fail when an installer treats them as a like-for-like boiler swap. The premium you pay over the cheapest quote almost always reflects bigger radiators, a proper heat-loss survey, and competent commissioning — and that premium is the difference between a system you love and one you hate. Run our <a href="/check">free pre-survey check</a> to see what a heat pump install looks like on your specific property.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'heat-pump-running-costs-uk',
  'Heat pump running costs UK 2026: the real numbers',
  'A typical UK home spends £900-£1,400 a year running a heat pump — usually less than gas, much less than oil. Here is what drives the bill.',
  '<p>Three numbers matter: how much heat your home needs, how efficient the pump is, and what you pay per kWh of electricity. Get those right and the running cost is predictable. Most marketing materials get the third one wrong.</p>

<h2>The headline figures</h2>

<p>For a typical UK home (3-bed semi, EPC C-D, decent insulation):</p>

<ul>
  <li><strong>Heat pump:</strong> £900-£1,400/yr at standard tariff, £600-£900/yr on a heat-pump-friendly tariff.</li>
  <li><strong>Gas boiler:</strong> £950-£1,300/yr at current gas prices.</li>
  <li><strong>Oil boiler:</strong> £1,400-£2,000/yr.</li>
  <li><strong>Electric storage heaters:</strong> £1,800-£2,500/yr.</li>
</ul>

<p>Heat pumps are usually cheaper than gas, dramatically cheaper than oil or electric. But the spread depends almost entirely on your tariff.</p>

<h2>Why the tariff matters so much</h2>

<p>A gas boiler turns 1 kWh of gas into ~0.9 kWh of heat. A heat pump turns 1 kWh of electricity into ~3 kWh of heat. So electricity has to be more than 3.3× the gas price for a heat pump to lose on running costs.</p>

<p>At standard variable tariff, electricity is around 28-30p/kWh and gas around 6-7p/kWh — a ratio of ~4.3×. That is right on the edge.</p>

<p>On a heat-pump-specific tariff (Octopus Cosy, OVO Heat Pump Plus, EDF Heat Pump Tracker), you pay 13-18p/kWh during off-peak hours when the pump runs hardest. The ratio drops to ~2.5×, and the heat pump runs about 30-40% cheaper than gas. Our <a href="/blog/best-tariff-for-heat-pump-uk">guide to heat-pump tariffs</a> walks through which one fits which household.</p>

<h2>What pushes your bill up</h2>

<ul>
  <li><strong>Bad install</strong> — undersized radiators or a flow temp set too high. The pump runs in inefficient cycles.</li>
  <li><strong>Cold snaps</strong> — efficiency drops below freezing. Expect 10-20% higher running costs in January.</li>
  <li><strong>Hot water demand</strong> — a teenager-heavy household with frequent hot showers can add £100-£200/yr.</li>
  <li><strong>Standard tariff</strong> — never. If you have a heat pump, switch to a heat-pump tariff.</li>
</ul>

<h2>What brings it down</h2>

<ul>
  <li><strong>Time-of-use tariff</strong> with the pump scheduled to run on cheap-rate hours.</li>
  <li><strong>Solar PV + battery</strong> — the heat pump runs on free electricity during summer hot-water cycles, and battery-stored cheap-rate electricity overnight.</li>
  <li><strong>Lower flow temperature</strong> — every 5°C drop in flow temp lifts SCOP by ~10%.</li>
  <li><strong>Weather compensation</strong> — a control feature that adjusts flow temp based on outside temperature. Should be enabled by default; check yours is.</li>
</ul>

<h2>How to estimate your own running cost</h2>

<p>Take your annual gas usage in kWh (on your bill). Divide by SCOP (use 3.0 as a conservative estimate). Multiply by your electricity rate.</p>

<p>Worked example: 12,000 kWh/yr gas demand → 4,000 kWh/yr electricity demand → £1,200/yr at 30p/kWh, or £640/yr at 16p/kWh on a heat-pump tariff.</p>

<h2>The bigger picture</h2>

<p>Running costs are roughly comparable to gas at standard tariff and 30-40% cheaper on a heat-pump tariff. Combine with solar and the running cost can drop to under £500/yr for a typical household. The £7,500 BUS grant covers most of the install premium, so the payback maths is more about whether you would have replaced your boiler anyway than whether the running cost is lower.</p>

<p>Run our <a href="/check">free pre-survey check</a> for a personalised running-cost estimate based on your property and current heating fuel.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'heat-pump-noise-rules-uk',
  'Heat pump noise: how loud are they, and what UK rules apply?',
  'Modern heat pumps run at 40-50 dB at 1m — quieter than a fridge. Permitted-development rules cap noise at the neighbour boundary. Here is what to expect.',
  '<p>The "heat pumps are noisy" objection is mostly a hangover from 10-year-old units. <strong>A modern heat pump runs at 40-55 dB at 1 metre</strong> — about as loud as a quiet conversation, and quieter than the boiler in most kitchens. Sited correctly, your neighbours will not hear it.</p>

<h2>The numbers</h2>

<p>Common decibel comparisons:</p>

<ul>
  <li>20 dB — whisper</li>
  <li>40-50 dB — modern heat pump at 1m, fridge running</li>
  <li>50-60 dB — normal conversation</li>
  <li>60-70 dB — heat pump at 1m running flat-out on the coldest day</li>
  <li>70-80 dB — vacuum cleaner</li>
</ul>

<p>Sound drops by 6 dB every time you double the distance. So a 50 dB unit at 1m is 44 dB at 2m, 38 dB at 4m. A neighbour 5m away across a fence hears it at a level somewhere between rustling leaves and a quiet office.</p>

<h2>What the rules actually say</h2>

<p>Heat pumps qualify as <strong>permitted development</strong> in England (so no planning application needed) provided they meet the MCS Planning Standards. The relevant noise rule:</p>

<ul>
  <li>Sound at <strong>1 metre from the neighbour''s nearest habitable window</strong> must not exceed <strong>42 dB(A)</strong> — calculated using the MCS-020 method.</li>
</ul>

<p>For most installs that means siting the unit at least 1-3m from the boundary, depending on which model and how reflective the surrounding walls are. Your installer should run the MCS-020 calculation as part of the quote and provide a compliance certificate.</p>

<h2>Wales, Scotland, Northern Ireland</h2>

<ul>
  <li><strong>Wales:</strong> permitted-development rules updated in 2023 — broadly similar to England. Some restrictions in conservation areas.</li>
  <li><strong>Scotland:</strong> permitted development with more permissive thresholds (1m from boundary, no specific dB limit at the boundary).</li>
  <li><strong>Northern Ireland:</strong> usually requires planning permission. Check with your local council.</li>
</ul>

<h2>What makes a heat pump noisy</h2>

<ul>
  <li><strong>Cold weather</strong> — the fan ramps up to maintain output. The unit is loudest at -3 to -8°C.</li>
  <li><strong>Defrost cycles</strong> — every 30-90 minutes in damp cold weather, the unit briefly reverses to defrost itself. Lasts 5-10 minutes, can be slightly louder than normal operation.</li>
  <li><strong>Bad siting</strong> — placing the unit in a tight corner reflects sound. Against a brick wall is worse than against a fence with garden behind.</li>
  <li><strong>Anti-vibration mounts missing</strong> — vibration through the wall structure carries sound into the house. Cheap installs skip the mounts; quality ones include them.</li>
</ul>

<h2>How to keep noise low</h2>

<ul>
  <li>Insist on a model with a <strong>quoted sound power level under 55 dB(A)</strong> — most current Mitsubishi, Daikin, Vaillant and Samsung units meet this.</li>
  <li>Site the unit <strong>away from bedroom windows</strong> (yours and your neighbour''s).</li>
  <li>Use <strong>anti-vibration feet and pads</strong> as standard.</li>
  <li>Avoid placing in <strong>tight three-walled corners</strong> — they amplify sound by 3-6 dB.</li>
  <li>Add an <strong>acoustic screen</strong> if you have a tight boundary — costs £200-£500 and drops perceived noise by another 5-10 dB.</li>
</ul>

<h2>What to do if a neighbour complains</h2>

<p>The MCS-020 compliance certificate from your installer is your defence — if it shows the unit is within 42 dB(A) at the neighbour''s window, the council cannot enforce against it. A polite conversation before install (showing them the spec sheet and your siting plan) avoids most issues entirely.</p>

<p>Run our <a href="/check">free pre-survey check</a> for a sense of where the unit would go on your property and what the install looks like.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'solar-and-heat-pump-together',
  'Solar panels and a heat pump together: does it make sense?',
  'Combining solar with a heat pump cuts running costs by 30-50% in most UK homes. Here is when the maths works — and when to install one before the other.',
  '<p>Yes, almost always. <strong>A heat pump is the single best appliance to pair with solar panels</strong> because it converts cheap (or free) electricity into heat at 3-4× efficiency. A typical UK home running both saves £400-£800/yr on top of either system on its own.</p>

<p>Here is what to think about before committing.</p>

<h2>How they actually combine</h2>

<p>The summer half of the year is when solar generates most. It is also when your heat pump runs least — only producing hot water, not space heating. So summer-generated solar electricity goes straight into hot-water cycles, displacing grid imports.</p>

<p>The winter half of the year is when your heat pump runs hardest. Solar still generates (about 30-40% of summer output) and offsets some of that demand. Combined with a battery, you can also store cheap overnight electricity and use it during the morning heat-up cycle.</p>

<h2>The numbers for a typical home</h2>

<p>3-bed semi, 4kWp solar array, 6kW heat pump:</p>

<ul>
  <li>Solar generates ~3,500 kWh/yr.</li>
  <li>Heat pump consumes ~4,000 kWh/yr.</li>
  <li>About 35-50% of solar generation lines up with heat-pump demand (rest is exported or covers other household use).</li>
  <li>Self-consumed solar saves ~£300-£500/yr; exported solar earns ~£100-£200/yr via the Smart Export Guarantee.</li>
</ul>

<p>Add a 5 kWh battery and you can store more solar for evening use, lifting savings by another £100-£200/yr.</p>

<h2>Install sequence — which one first?</h2>

<p>If you are doing both within 12 months of each other, do them <strong>together</strong>:</p>

<ul>
  <li>One scaffolding visit, one electrician day, one DNO notification.</li>
  <li>The installer can size the inverter and consumer unit for both loads from the start.</li>
  <li>Combined commissioning means smart controls (e.g. solar diverter to the hot water cylinder) work out of the box.</li>
</ul>

<p>If you can only do one now:</p>

<ul>
  <li><strong>Heat pump first</strong> if your boiler is dying or you want to claim the BUS grant before scheme changes.</li>
  <li><strong>Solar first</strong> if your roof needs replacing soon (the panels will outlast the underlying tiles by decades) or you are about to add an EV.</li>
</ul>

<h2>Sizing — getting it right</h2>

<p>Your heat pump should be sized to your heat loss, not your solar generation — never undersize the pump to "match" solar. Cold January days are when you need full heat output, and the sun is not generating then.</p>

<p>Your solar array should be sized to fill the available roof area, capped only by your inverter or DNO limits. Most UK roofs accommodate 4-8 kWp without exporting more than the standard G98 limit.</p>

<h2>Hot water diversion — the cheap upgrade</h2>

<p>A solar diverter (£300-£500 fitted) routes excess solar electricity into the hot water cylinder''s immersion element when there is nothing else to consume it. Means almost zero summer electricity cost for hot water.</p>

<p>The heat pump can do the same job more efficiently when the cylinder needs heating — but on bright summer afternoons when the cylinder is already warm, the diverter prevents the energy going to the grid for 5-7p/kWh export rate.</p>

<h2>Tariff strategy</h2>

<p>With both systems installed, the optimal tariff is usually a time-of-use one (Octopus Cosy, OVO Heat Pump Plus). Set the heat pump to run hot-water cycles during off-peak hours, let solar cover daytime demand, and use a battery to time-shift any remaining gap.</p>

<p>Whole-house running costs for an average 3-bed combining heat pump + solar + battery on a smart tariff: typically £400-£700/yr — a small fraction of the £2,000-£3,000/yr most homes pay on gas + grid electricity.</p>

<h2>The bottom line</h2>

<p>If you are getting one, plan for both. The marginal cost of adding solar to a heat pump install is ~£5,000-£8,000 net of the inverter you would have needed anyway. Payback is typically 6-9 years and the systems share a 25-year operational lifespan. Run our <a href="/check">free pre-survey check</a> to see what a combined install looks like on your roof.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'smart-export-guarantee-explained',
  'Smart Export Guarantee (SEG): what UK solar owners actually earn in 2026',
  'SEG pays you for every kWh you export from your solar panels. Rates run 1p-15p/kWh depending on supplier — here is how to pick a tariff that pays.',
  '<p>The Smart Export Guarantee replaced the Feed-in Tariff in 2020. <strong>Every UK supplier with 150,000+ customers must offer some sort of export rate</strong> — but the rates vary by 15× between the worst and best deals. Picking the right tariff is the difference between £40/yr and £400/yr in export income.</p>

<h2>How SEG works</h2>

<ul>
  <li>You install solar panels (under 5 MW capacity).</li>
  <li>You apply for SEG with a supplier — they require an MCS certificate, a smart meter, and proof of inverter spec.</li>
  <li>The smart meter measures every kWh exported to the grid.</li>
  <li>The supplier credits or pays you for those kWh at the agreed rate.</li>
</ul>

<p>You can be on a different supplier for import (electricity you buy) and export (electricity you sell). Pick the cheapest import tariff and the highest export tariff independently.</p>

<h2>What the rates look like in 2026</h2>

<p>A non-exhaustive snapshot — confirm before switching:</p>

<ul>
  <li><strong>Octopus Outgoing Fixed:</strong> 15p/kWh flat. Strong all-round option for non-Octopus import customers.</li>
  <li><strong>Octopus Outgoing Agile:</strong> half-hourly, often peaks above 25p/kWh on sunny afternoons. Best for those who can time exports.</li>
  <li><strong>Octopus Outgoing for Octopus customers:</strong> bonus 4-6p/kWh on top of the Fixed rate.</li>
  <li><strong>EDF Export Variable:</strong> 5-7p/kWh.</li>
  <li><strong>British Gas Export and Earn Plus:</strong> 6.4p/kWh.</li>
  <li><strong>OVO Energy:</strong> 4-15p depending on plan.</li>
  <li><strong>E.ON Next:</strong> 16.5p/kWh on Next Export Premium.</li>
  <li><strong>Worst-in-class:</strong> 1-3p/kWh from suppliers that pay the legal minimum to discourage take-up.</li>
</ul>

<p>Octopus Energy and E.ON consistently lead. Pricing changes — always check the supplier''s current rate before switching.</p>

<h2>How much will I actually earn?</h2>

<p>Typical UK home with a 4 kWp solar array generates ~3,500 kWh/yr. Roughly 50-70% gets self-consumed (used in the home directly) and 30-50% gets exported.</p>

<ul>
  <li>1,200 kWh exported × 5p/kWh = £60/yr (low-end SEG)</li>
  <li>1,200 kWh exported × 15p/kWh = £180/yr (mid-range)</li>
  <li>1,500 kWh exported × 25p/kWh on Agile (peak times) = £375/yr (best case, requires battery + smart export timing)</li>
</ul>

<p>The bigger your battery and the smarter your control, the more you can shift export into peak rates.</p>

<h2>Eligibility — what you need</h2>

<ul>
  <li>An MCS certificate for your solar install (your installer provides this — keep it safe).</li>
  <li>A smart meter capable of half-hourly export readings (SMETS2, or SMETS1 in smart-mode).</li>
  <li>Less than 5 MW of total generation capacity (effectively, every domestic install).</li>
  <li>An eligible inverter (effectively, every modern grid-tied inverter).</li>
</ul>

<h2>Common mistakes to avoid</h2>

<ul>
  <li><strong>Sticking with your default supplier''s SEG.</strong> The default is rarely competitive. Switch.</li>
  <li><strong>Ignoring the import side.</strong> A 15p export rate paired with a 35p import rate beats a 5p export rate paired with a 25p import rate, but only just. Look at both halves.</li>
  <li><strong>Not registering for SEG at all.</strong> About 20% of solar owners never apply. That is free money left on the table.</li>
</ul>

<h2>SEG with a battery</h2>

<p>A battery lets you time-shift when you export. Charge from cheap-rate electricity overnight (5-7p/kWh on a smart tariff), then export the stored energy during peak rate windows in the early evening (sometimes 25p+ on Agile). Done well, this can add £100-£200/yr to a household''s total energy income — though it is more setup than most people want.</p>

<h2>The bottom line</h2>

<p>Treat SEG as a switch-and-forget — pick the highest-paying tariff that matches your import setup, register with the certificate your installer gives you, then forget it for a year. Revisit annually because supplier rates change. For a typical 4 kWp install, expect £100-£250/yr from SEG alongside whatever you save on imports. Run our <a href="/check">free pre-survey check</a> for a personalised export estimate based on your roof.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'best-tariff-for-heat-pump-uk',
  'Best electricity tariff for a heat pump: 2026 UK guide',
  'Heat-pump tariffs cut your running cost by 30-50% versus standard variable. Here is which tariff suits which household, with real numbers.',
  '<p>If you have a heat pump on a standard variable tariff, you are probably paying 30-40% more than you need to. <strong>Heat-pump-specific tariffs charge a much cheaper rate during off-peak hours when the pump runs hardest.</strong> Picking the right one depends on your daily usage pattern, whether you have a battery, and whether you are already an EV owner.</p>

<h2>What "heat-pump tariff" actually means</h2>

<p>A few suppliers offer either a separate cheap rate for the heat pump circuit (requires a second meter) or a whole-house time-of-use tariff with cheap windows when the pump is most economical to run.</p>

<p>The latter is more common — same meter, cheap rate at certain hours, you schedule the pump to do its hardest work then.</p>

<h2>The contenders in 2026</h2>

<p>Pricing changes. Use this as a shortlist, then check current rates on the supplier''s site.</p>

<ul>
  <li><strong>Octopus Cosy:</strong> three rates per day. Cheapest 13p/kWh from 04:00-07:00 and 13:00-16:00. Standard 25p/kWh otherwise. Peak 38p/kWh from 16:00-19:00. Built specifically for heat pumps. No requirement to be an Octopus heat pump customer — just a smart meter.</li>
  <li><strong>OVO Heat Pump Plus:</strong> 15p/kWh fixed for everything the heat pump consumes, regardless of time of day. Requires an OVO-installed heat pump or a compatible third-party install. Simpler if you cannot easily schedule the pump.</li>
  <li><strong>EDF Heat Pump Tracker:</strong> tracks wholesale price, typically averaging 20-22p/kWh. Variable monthly. Good for those comfortable with some price uncertainty.</li>
  <li><strong>Octopus Agile:</strong> half-hourly pricing tracking the wholesale market. Cheap most of the time (often 5-15p/kWh), expensive in the 16:00-19:00 peak window. Best for households that can schedule heat-pump runs around the price.</li>
  <li><strong>British Gas Heat Pump Tariff:</strong> 12-month fixed rate around 18-20p/kWh whole-house. Less aggressive than Octopus Cosy but no scheduling needed.</li>
</ul>

<h2>Which one suits which household</h2>

<ul>
  <li><strong>Default recommendation:</strong> Octopus Cosy. Three windows are easy to schedule around, the off-peak rate is genuinely cheap, and there is no peak penalty if you avoid 16:00-19:00.</li>
  <li><strong>Battery owner:</strong> Octopus Agile. Charge the battery on cheapest half-hours overnight, run the heat pump and other loads from the battery during expensive periods.</li>
  <li><strong>EV owner with smart charging:</strong> Octopus Intelligent Go (different tariff again — gives 7p/kWh from 23:30-05:30 for the whole house, including the heat pump). Often the cheapest combo if the EV is the dominant load.</li>
  <li><strong>You hate fiddling:</strong> OVO Heat Pump Plus. One rate, no scheduling, smaller saving but zero effort.</li>
  <li><strong>Solar owner:</strong> Octopus Cosy + Octopus Outgoing Fixed for export. Cheap import in cheap windows, decent export earnings the rest of the time.</li>
</ul>

<h2>How to schedule the heat pump for time-of-use tariffs</h2>

<p>Most modern heat pump controllers (Mitsubishi Ecodan, Daikin Altherma, Vaillant aroTHERM) support time schedules from the wall controller or a phone app. Set:</p>

<ul>
  <li><strong>Hot water cycle</strong> in the cheap morning window (04:00-07:00 on Octopus Cosy). The cylinder holds heat for 12+ hours, so morning heating gives you hot water all day.</li>
  <li><strong>Space heating boost</strong> in the cheap afternoon window (13:00-16:00). Pre-heat the house before the peak window.</li>
  <li><strong>Setback during peak</strong> (16:00-19:00). Drop the target by 1-2°C — the house thermal mass carries you through.</li>
</ul>

<p>Done well this can drop the average rate from ~28p/kWh on standard variable to ~16p/kWh on Cosy.</p>

<h2>Real-world savings</h2>

<p>For a typical 3-bed running 4,000 kWh/yr through the heat pump:</p>

<ul>
  <li><strong>Standard variable (29p/kWh):</strong> £1,160/yr running cost.</li>
  <li><strong>OVO Heat Pump Plus (15p/kWh flat):</strong> £600/yr.</li>
  <li><strong>Octopus Cosy with smart scheduling (avg ~16p/kWh):</strong> £640/yr.</li>
  <li><strong>Octopus Agile with battery + scheduling (avg ~12p/kWh):</strong> £480/yr.</li>
</ul>

<p>The £500-£700/yr saving versus standard variable is real money. It is also more than the typical install premium for a heat pump pays back annually.</p>

<h2>Common mistakes</h2>

<ul>
  <li><strong>Staying on default tariff after install.</strong> Suppliers do not flag the better tariff for you.</li>
  <li><strong>Picking time-of-use without enabling scheduling.</strong> If your pump runs flat-out during the 38p peak, you are worse off than standard variable.</li>
  <li><strong>Forgetting about export.</strong> If you have solar, the export-tariff side often matters more than the import side. See our <a href="/blog/smart-export-guarantee-explained">SEG guide</a>.</li>
</ul>

<h2>The bottom line</h2>

<p>Switch within a month of your heat pump going live. Octopus Cosy is the safest default; OVO Heat Pump Plus if you cannot face scheduling. Run our <a href="/check">free pre-survey check</a> for a personalised running-cost estimate that includes tariff comparisons.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'heat-pump-for-flat-or-leasehold',
  'Can I get a heat pump in a flat or leasehold property?',
  'Heat pumps in flats are possible but tricky. Freeholder consent, balcony siting, communal systems — here is what is realistic in 2026.',
  '<p>Heat pumps in flats are <strong>technically possible</strong> but practically difficult. The two blockers are space for the outdoor unit and getting freeholder consent. Around 70% of UK flats can be retrofitted given the right circumstances; 30% are blocked by lease terms or building constraints.</p>

<h2>What you can install</h2>

<ul>
  <li><strong>Air-to-air mini-split:</strong> like a Japanese-style aircon. Cools and heats. One outdoor unit per indoor unit. Around £2,500-£4,500 per room. Quick install (1 day). Does NOT qualify for the Boiler Upgrade Scheme.</li>
  <li><strong>Air-to-water heat pump:</strong> the standard whole-house heat pump that runs hot water + radiators. £8,000-£14,000 install. £7,500 BUS grant available. Requires space for a hot water cylinder and outdoor unit.</li>
  <li><strong>Communal heat pump:</strong> a shared system serving all flats, installed by the building owner. Increasingly common in new-build apartment blocks. Almost never retrofitted into existing buildings.</li>
</ul>

<p>For flat owners, the realistic options are an air-to-air mini-split (no grant but easier install) or — if you have a balcony / dedicated wall space and freeholder consent — an air-to-water system with the £7,500 grant.</p>

<h2>The freeholder problem</h2>

<p>Almost every leasehold flat needs freeholder consent for an outdoor unit attached to the external wall. Most leases include "alterations" clauses requiring written permission. The freeholder cannot unreasonably withhold consent — but they can charge consent fees (£200-£500), require a legal survey (£300-£800), and impose ongoing maintenance obligations.</p>

<p>Realistic timeline: 8-16 weeks from application to consent for cooperative freeholders, longer for absentee or institutional freeholders. Budget £500-£1,500 in consent fees and legal costs.</p>

<h2>Where the outdoor unit can go</h2>

<ul>
  <li><strong>Balcony:</strong> works for ground- and lower-floor flats. Avoid bedroom windows above. Anti-vibration mounts essential.</li>
  <li><strong>External wall bracket:</strong> small unit suspended from the wall. Common for upper flats. Requires structural assessment.</li>
  <li><strong>Roof / communal area:</strong> requires the building manager to approve and is rarely allowed for individual leaseholders.</li>
  <li><strong>Garden (ground floor):</strong> easy, treat as a normal house install.</li>
</ul>

<p>Ducted units (where the outdoor unit serves multiple indoor units inside one flat) are increasingly available and reduce the visual impact.</p>

<h2>The hot water cylinder problem</h2>

<p>Air-to-water heat pumps need a hot water cylinder — typically 200-300 litres for a 2-bed flat. That is roughly the footprint of a tall wardrobe. Most flats with combi boilers have no cylinder space. Options:</p>

<ul>
  <li>Convert an airing cupboard or storage cupboard.</li>
  <li>Use a slim-profile or stacked cylinder (1m × 1m × 2m).</li>
  <li>Stick with combi-style instant hot water — incompatible with most heat pumps, but a few hybrid systems (Vaillant aroTHERM Plus + flow boiler) can work.</li>
</ul>

<h2>Will the BUS grant pay out?</h2>

<p>Yes, for leasehold flats — the grant is available to the property "owner of record" which includes leaseholders. You need:</p>

<ul>
  <li>Freeholder consent in writing (don''t skip this — Ofgem will ask).</li>
  <li>An EPC for your individual flat (not the whole building).</li>
  <li>The standard insulation prerequisites met (loft insulation rarely applies to flats; cavity wall does if your flat has external cavity walls).</li>
  <li>An MCS-certified installer who has experience with flat installs.</li>
</ul>

<h2>What about communal heating systems?</h2>

<p>If your building has a communal boiler / district heating, you cannot install your own heat pump — your contribution to heating is paid via service charges. Pressure your management company to switch the communal system to a heat pump (becoming more common, but slow).</p>

<h2>The cost reality</h2>

<p>For a 2-bed flat where everything works:</p>

<ul>
  <li>Air-to-water heat pump: £8,500 install − £7,500 BUS = £1,000 net.</li>
  <li>Plus freeholder consent + legal: £500-£1,500.</li>
  <li>Plus cylinder cupboard conversion (if needed): £500-£2,000.</li>
  <li><strong>Realistic all-in: £2,000-£4,500.</strong></li>
</ul>

<p>Compared to a £1,500-£2,500 boiler replacement, the maths still works given the 5-7 year payback on running costs.</p>

<h2>The bottom line</h2>

<p>Possible in most flats; smooth in well-managed buildings with cooperative freeholders; impossible if your lease is restrictive or your building is communal-heated. Always start with the lease and the freeholder before getting installer quotes. Run our <a href="/check">free pre-survey check</a> to see what the install would look like on your specific property — it works on flats too.</p>',
  'Guides',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'gas-boiler-ban-uk-2035',
  'Gas boiler ban UK 2035: what is actually happening and what to do',
  'New-build gas boilers are banned in 2025-2027 in most UK regions. Replacement bans for existing homes are softer than the headlines suggest. Here is the real timeline.',
  '<p>The "gas boiler ban" gets reported as if you will be ripped from your home in 2035 with a heat pump strapped to your back. The reality is softer, more staggered, and only really binding on new-builds for now. <strong>If you have a working gas boiler in 2026, you can keep it through its natural lifespan and replace it like-for-like into the 2030s.</strong> What is changing is what gets installed in new builds and the financial incentives around upgrades.</p>

<h2>The actual timeline</h2>

<p>What is currently confirmed:</p>

<ul>
  <li><strong>2025:</strong> Future Homes Standard requires all new-build homes in England to be heat-pump-ready. Most new-builds being completed in 2025+ already include a heat pump.</li>
  <li><strong>2025-2027:</strong> Several local authorities (Greater London, Manchester, Glasgow) phase out gas connections in new-build planning consents.</li>
  <li><strong>2035:</strong> Originally proposed as the cut-off for installing new gas boilers in existing homes. Currently <strong>under review by government</strong> — has been pushed back from earlier dates twice and may be pushed back again.</li>
  <li><strong>2050:</strong> UK net-zero target. Some form of gas-boiler phase-out is required by this date to meet the legal commitment.</li>
</ul>

<p>So: new builds yes, existing homes still uncertain. The 2035 date is policy intent, not law.</p>

<h2>What this means for existing homeowners</h2>

<p>If you live in an existing home with a gas boiler:</p>

<ul>
  <li>Your current boiler can run until end-of-life. No retrofit obligation.</li>
  <li>You can replace a broken boiler with a new gas one through at least 2030, probably later.</li>
  <li>Repair parts and gas servicing remain available throughout the boiler''s life. Gas safe engineers will not be obsoleted overnight.</li>
  <li>You will probably feel financial pressure to switch — BUS grant, ECO scheme, future carbon taxes — rather than a hard ban.</li>
</ul>

<h2>What this means for landlords</h2>

<p>Landlords face stricter rules sooner. The proposed Minimum Energy Efficiency Standards (MEES) require all rental properties to reach EPC Band C by 2030 (date uncertain). Most C-rated retrofits in older stock effectively require a heat pump, since gas boilers cap the achievable rating in poorly-insulated buildings.</p>

<h2>What this means for new-build buyers</h2>

<p>Almost all new-build homes in 2025+ come with heat pumps as standard. If you are buying off-plan, ask:</p>

<ul>
  <li>Which heat-pump model is specified.</li>
  <li>Whether the radiators are sized for low-flow-temperature operation.</li>
  <li>Whether the developer is providing a SCOP figure (a real one, not a marketing one).</li>
  <li>What the warranty looks like and who handles servicing.</li>
</ul>

<h2>The hydrogen question</h2>

<p>You will read articles claiming we will all run hydrogen boilers instead. The honest answer: <strong>this is unlikely for domestic heating</strong>. The UK''s Hydrogen Village trials (Whitby, Redcar) were both cancelled in 2023-2024. The Climate Change Committee, the National Infrastructure Commission, and most independent analysts agree hydrogen will be used in industry and heavy transport, not in homes. Plan around heat pumps, not hydrogen.</p>

<h2>What to do now</h2>

<ul>
  <li><strong>If your boiler is under 8 years old:</strong> nothing. Run it to end-of-life. Plan a heat pump for replacement time.</li>
  <li><strong>If your boiler is 8-12 years old:</strong> get a heat-pump quote alongside any replacement-boiler quote when it next breaks. The £7,500 BUS grant currently makes the maths competitive.</li>
  <li><strong>If your boiler is 12+ years old:</strong> start the heat-pump conversation now. Boilers in this age bracket fail unpredictably; you do not want to be making a £10k decision in February with a cold house.</li>
  <li><strong>If you are doing a major renovation:</strong> install the heat pump as part of the project. Pipework and insulation work cost a fraction when done alongside other works.</li>
</ul>

<h2>The bottom line</h2>

<p>The 2035 ban is a policy intent for new gas boilers, not an obligation to rip out working ones. Most homeowners will switch to heat pumps voluntarily as boilers fail and grant economics keep improving. There is no need to panic; there is good reason to plan. Run our <a href="/check">free pre-survey check</a> for a personalised view of when a heat pump makes sense for your property.</p>',
  'News',
  'Propertoasty',
  true,
  now()
),

-- ────────────────────────────────────────────────────────────────────
(
  'insulation-before-heat-pump',
  'Do I need insulation before a heat pump? UK 2026 guide',
  'Loft and cavity wall insulation are required for the BUS grant. Solid wall insulation is not — but worth doing if you have it. Here is the realistic order.',
  '<p>The short version: <strong>loft insulation and cavity wall insulation are required for the BUS grant</strong>. Solid wall insulation is not — and rarely worth doing in a typical retrofit. You do not need a Passivhaus to run a heat pump; you need a sensibly-insulated home.</p>

<h2>What the BUS grant actually requires</h2>

<p>Ofgem''s rules for the £7,500 Boiler Upgrade Scheme include "minimum insulation requirements". Specifically:</p>

<ul>
  <li><strong>Loft insulation</strong> if recommended on your EPC — must be installed (or you must have an exemption) before the heat pump.</li>
  <li><strong>Cavity wall insulation</strong> if recommended on your EPC and your home has unfilled cavities — same rule.</li>
  <li><strong>No requirement for solid wall insulation</strong> — even if your home is solid-wall (Victorian/Edwardian terrace, pre-war detached). The economics rarely justify it for a heat pump install.</li>
</ul>

<p>The rules apply at the point your installer registers the BUS application. Your installer will check your EPC against the requirements during the quote.</p>

<h2>Why insulation matters for heat pumps specifically</h2>

<p>Heat pumps run at lower flow temperatures (45-50°C) than gas boilers (65-75°C). They deliver heat more slowly and steadily. If your home loses heat fast (poor insulation, single-glazed windows, draughty floorboards), the pump struggles to keep up — runs longer, draws more power, costs more.</p>

<p>A well-insulated home running a heat pump achieves SCOP 3.5-4.0. A poorly-insulated home with the same pump might only get SCOP 2.5, costing 30-40% more to run.</p>

<h2>The realistic order of works</h2>

<p>If you are starting from a typical UK home with average insulation:</p>

<ol>
  <li><strong>Loft insulation</strong> (~£300-£700). Top up to 270mm depth. Do this anyway — it is the highest-impact and cheapest measure.</li>
  <li><strong>Cavity wall insulation</strong> (~£500-£1,500). Free or heavily subsidised through ECO4 if you qualify.</li>
  <li><strong>Draught-proofing</strong> (~£100-£500 DIY, more for sash window restoration). Cheap, fast, instantly noticeable.</li>
  <li><strong>Heat pump install</strong>.</li>
  <li><strong>Solid wall insulation</strong> — only if you can do it as part of a wider renovation (re-rendering, internal refit). Standalone retrofits cost £8,000-£15,000+ for diminishing returns.</li>
</ol>

<h2>Solid wall insulation — the honest assessment</h2>

<p>External wall insulation costs £80-£150/m² fitted. A typical 3-bed terrace has ~80-100m² of external wall, so £6,400-£15,000 for a full wrap. Internal wall insulation is similar pricing but reduces room sizes.</p>

<p>For most homes, the running-cost saving from solid wall insulation is £150-£400/yr — a 15-30 year payback. The BUS grant maths does not require it. Walk away from any installer who insists you "need" it before they will fit your heat pump.</p>

<h2>What "EPC Band C" actually means</h2>

<p>You will hear the figure "Band C or above" thrown around as a heat-pump prerequisite. <strong>This is not a regulatory requirement</strong> — it is a rule of thumb for whether your home runs a heat pump efficiently. Band D-E homes can run heat pumps fine if the install is sized correctly and the basic insulation is in place.</p>

<p>What does change at Band C: the gap between flow temp and outside temp the pump can handle. A Band G home with a 6kW pump might struggle in January; the same home at Band D handles fine.</p>

<h2>Quick wins before install day</h2>

<ul>
  <li><strong>Loft hatch insulation</strong> — most lofts are insulated; the hatch is not. £20 of foam strip and self-adhesive insulation.</li>
  <li><strong>Pipework lagging</strong> — exposed hot water pipes in the loft or under the floor. £30-£50.</li>
  <li><strong>Letterbox brush + door seals</strong> — £30 from a hardware shop.</li>
  <li><strong>Chimney balloon</strong> — £25 if you have an unused open chimney pulling cold air in.</li>
  <li><strong>Smart thermostat</strong> — comes with most heat-pump installs. Set zoning correctly from day one.</li>
</ul>

<h2>The bottom line</h2>

<p>Get loft and cavity sorted before the heat pump (legally required for BUS, cheap to do). Do not let an installer talk you into solid wall insulation as a precondition — the maths rarely supports it. Run our <a href="/check">free pre-survey check</a>; the report flags any insulation prerequisites for your specific property based on your EPC.</p>',
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
