// /compare/heat-pump-finance-options — finance-comparison page.
//
// Different shape from a brand or fuel-type comparison: the
// question isn't "which heat pump" but "how do I pay for it after
// the £7,500 BUS grant covers most of the cost?" Five major
// finance paths in the UK 2026: pay outright, installer 0% APR
// finance, green mortgage, secured personal loan, heat-pump-as-
// a-service (emerging subscription model).
//
// Editorial sensitivity: finance content needs to be especially
// careful about regulatory framing (FCA, consumer credit). No
// promotional claims about specific lenders; describe the
// mechanism + trade-offs; point readers to FCA-authorised
// comparison sources for current rates.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/heat-pump-finance-options";

export const metadata: Metadata = {
  title: "Heat pump finance options UK 2026: 0% deals, green mortgages, cash",
  description:
    "After the £7,500 BUS grant, the typical UK heat-pump net cost is £1,500–£6,500. Compare cash, 0% installer finance, green mortgages, and the new heat-pump-as-a-service model.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Heat pump finance options UK 2026: 0% deals, green mortgages, cash",
    description:
      "How UK homeowners pay for the post-grant balance — every option compared.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpFinanceOptions() {
  return (
    <AEOPage
      headline="How to pay for a heat pump in 2026: five UK finance paths compared"
      description="After the £7,500 BUS grant, the typical UK heat-pump net cost is £1,500–£6,500. Compare cash, 0% installer finance, green mortgages, and the new heat-pump-as-a-service model."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Finance"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Heat pump finance options" },
      ]}
      directAnswer="After the £7,500 Boiler Upgrade Scheme grant, the typical UK homeowner pays £1,500–£6,500 net for an air-source heat pump install. Five main paths cover that balance: cash from savings, 0% APR installer finance (typically 24–60 month terms), green mortgage add-ons from major UK banks, secured personal loans, and heat-pump-as-a-service subscription contracts. Cash is cheapest in absolute terms; 0% installer finance is often the best risk-adjusted option for households without spare savings."
      tldr={[
        "BUS grant covers most of the cost; finance addresses the £1,500–£6,500 net balance.",
        "0% APR installer finance: real product, FCA-regulated; check the term length and any deposit required.",
        "Green mortgages: cheapest rates among non-cash options, but you pay over 25-30 years.",
        "Heat-pump-as-a-service: emerging UK product, you don't own the heat pump — read terms carefully.",
        "BUS grant payment goes to the installer, not the homeowner — finance amounts are quoted NET of grant.",
      ]}
      faqs={[
        {
          question:
            "Does the £7,500 BUS grant get paid to me or the installer?",
          answer:
            "The installer. Ofgem pays the BUS grant directly to the MCS-certified installer who completes your install, and the installer applies it as a deduction from your invoice. You see the £7,500 as a line-item discount on the final quote. This matters for finance: any installer 0% APR offer or other finance you take out is for the NET amount after the grant deduction, not the gross install cost.",
        },
        {
          question:
            "How does installer 0% APR finance actually work?",
          answer:
            "Most large MCS heat-pump installers partner with FCA-authorised consumer credit providers (Hitachi Capital, Klarna, Novuna, V12) to offer 0% APR over 24, 36, or 48 months. The installer takes a discount or 'subvention' from the headline price to fund the lender's cost of capital; you pay equal monthly instalments with no interest. Eligibility requires a credit check; deposits typically 0-20% required. After the promo term ends, the loan is settled — there's no balloon payment or rate change because it's been 0% the whole time.",
        },
        {
          question:
            "What's a green mortgage and how does it apply to a heat pump?",
          answer:
            "A green mortgage is a UK mortgage product with a preferential interest rate (typically 0.05-0.25% below standard) for properties that meet specific energy-efficiency criteria — usually an EPC rating of B or C, sometimes specific upgrades like a heat pump. Some lenders also offer 'green additional borrowing' — letting you increase your mortgage to fund a heat pump install. Most major UK lenders (Halifax, NatWest, Nationwide, Barclays) have green products as of 2026. The advantage is the lowest rate of any non-cash option; the trade-off is paying over 25-30 years rather than 2-5 years.",
        },
        {
          question:
            "What is heat-pump-as-a-service and is it worth considering?",
          answer:
            "Heat-pump-as-a-service is an emerging UK product where a third party installs and owns the heat pump on your property; you pay a monthly fee for use + maintenance over typically 10-15 years, after which ownership may transfer. The model resembles solar power-purchase agreements that pre-existed in the UK solar market. It removes the upfront cost entirely but you don't own the asset, the monthly fee usually totals 1.5-2x the cash-equivalent cost over the contract term, and exiting the contract early can be costly. Read the FCA-regulated terms carefully. As of 2026 the market is small but growing.",
        },
      ]}
      sources={[
        {
          name: "FCA — Consumer credit register",
          url: "https://www.fca.org.uk/firms/financial-services-register",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Money Saving Expert — Green mortgages overview",
          url: "https://www.moneysavingexpert.com/mortgages/",
          accessedDate: "May 2026",
        },
        {
          name: "MoneyHelper — Personal loans + secured borrowing",
          url: "https://www.moneyhelper.org.uk/en/everyday-money/credit",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Boiler Upgrade Scheme guidance",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="UK heat-pump finance options — typical 2026 shape"
        headers={[
          "",
          "Cash (savings)",
          "0% installer finance",
          "Green mortgage add-on",
          "Secured personal loan",
          "Heat-pump-as-a-service",
        ]}
        rows={[
          ["Upfront cost (after BUS)", "£1,500–£6,500", "£0–£1,300 deposit", "£0", "£0", "£0"],
          ["Term length", "n/a", "24–60 months", "Mortgage term (25-30 yr)", "5–10 years", "10–15 years"],
          ["Typical interest rate", "0% (opportunity cost only)", "0% APR (promo)", "0.05–0.25% below SVR", "6–10% APR", "Implicit ~3–6% via monthly fee"],
          ["Total cost (£4,000 example)", "£4,000", "£4,000–£4,200", "£4,200–£5,500 over term", "£5,500–£7,500", "£6,000–£9,000 over contract"],
          ["You own the heat pump?", "Yes", "Yes (after final payment)", "Yes", "Yes", "No (until / if contract transfers)"],
          ["Credit check required?", "No", "Yes", "Full mortgage UW", "Yes", "Yes"],
          ["Property security?", "No", "No", "Yes — the mortgage is secured", "Yes — sometimes secured", "Usually contractual + property charge"],
          ["Exit / early settlement?", "n/a", "Usually free", "Standard mortgage overpayment limits", "Sometimes fees", "Usually significant exit costs"],
          ["BUS grant treatment", "Discounted at install", "Discounted at install (finance on net)", "Discounted at install", "Discounted at install", "Discounted at install"],
          ["Regulatory framework", "n/a", "FCA — consumer credit", "FCA — mortgages", "FCA — consumer credit", "FCA — varies by structure"],
        ]}
        footnote="All non-cash options require an FCA-authorised provider. Verify the specific lender's registration at fca.org.uk/firms/financial-services-register. Rates and terms shown are typical 2026 ranges; check current pricing with the provider."
      />

      <h2>The BUS-grant mechanics matter for every option</h2>
      <p>
        The £7,500 Boiler Upgrade Scheme grant is paid by Ofgem
        directly to your MCS-certified installer, who applies it
        as a line-item discount on your final invoice. The
        homeowner never receives the £7,500 in their bank
        account. Practical implications for finance:
      </p>
      <ul>
        <li>
          <strong>Quote the NET amount, not the gross.</strong>{" "}
          When asking installers for finance options, the relevant
          number is the net-of-grant balance. A £10,500 gross
          install becomes a £3,000 net amount to finance.
        </li>
        <li>
          <strong>Grant deduction happens automatically.</strong>{" "}
          You don&rsquo;t need to claim the grant separately; the
          installer handles the Ofgem application. You sign a
          consent form authorising the installer to claim on your
          behalf.
        </li>
        <li>
          <strong>If the install doesn&rsquo;t complete, the
          grant doesn&rsquo;t pay out.</strong> Finance providers
          structure their products around the typical 4–10 week
          install timeline. Some lenders disburse funds in
          tranches (deposit on order, balance on commissioning);
          confirm with your installer how their lender handles
          the timing.
        </li>
      </ul>

      <h2>Cash — the cheapest option in absolute terms</h2>
      <p>
        If you have £4,000+ in savings earning meaningfully less
        than 4–6% (typical instant-access savings rates in 2026),
        paying cash is the lowest total cost option. No interest,
        no fees, no exit charges, no FCA paperwork.
      </p>
      <p>
        The trade-off is opportunity cost. £4,000 from a Stocks &
        Shares ISA growing at ~7% real return compounds
        meaningfully over 20+ years; £4,000 from a Cash ISA at
        4-5% does too. For households with longer-horizon savings
        invested at higher real returns, financing the heat pump
        and keeping the savings invested can produce a better
        net outcome — provided the finance rate is materially
        below the investment return.
      </p>

      <h2>Installer 0% APR finance — the common path</h2>
      <p>
        Most large UK MCS installers offer 0% APR over 24, 36, or
        48 months through FCA-authorised consumer credit providers
        (Hitachi Capital, Klarna, Novuna, V12 typically). The
        installer absorbs the lender&rsquo;s cost of capital as a
        subvention from the headline price; you pay equal monthly
        instalments with no interest.
      </p>
      <ul>
        <li>
          <strong>Eligibility:</strong> credit check, typically
          requires a credit score in the upper half of the UK
          range. Adverse credit history (recent defaults, IVAs)
          may decline.
        </li>
        <li>
          <strong>Deposit:</strong> commonly 0–20%. Some
          installers waive the deposit; some require 10–20%
          upfront to qualify for the 0% rate.
        </li>
        <li>
          <strong>Documentation:</strong> standard consumer
          credit agreement. You receive a credit agreement, have
          a 14-day cooling-off period, can repay early without
          penalty.
        </li>
        <li>
          <strong>Watch for:</strong> the &ldquo;subvention&rdquo;
          discount. Some installers price the headline install
          higher to absorb the lender cost, then offer 0% finance
          on the higher number. A useful sanity check: ask for
          the cash-equivalent price separately — if it&rsquo;s
          materially lower than the financed quote, the &ldquo;0%
          APR&rdquo; isn&rsquo;t free, you&rsquo;re paying the
          finance cost via a markup.
        </li>
      </ul>

      <h2>Green mortgage add-on — cheapest non-cash option, longest term</h2>
      <p>
        UK major lenders (Halifax, NatWest, Nationwide, Barclays,
        Santander) offer green mortgage products with rates
        typically 0.05–0.25% below standard variable. Some go
        further and offer &ldquo;additional borrowing&rdquo; on
        top of an existing mortgage to fund energy-efficiency
        upgrades — the heat pump becomes part of your overall
        mortgage balance.
      </p>
      <ul>
        <li>
          <strong>Rate:</strong> typically 0.05–0.25% below the
          lender&rsquo;s standard variable, sometimes more on
          fixed-rate products. The lowest rate of any non-cash
          option.
        </li>
        <li>
          <strong>Term:</strong> the remaining mortgage term
          (commonly 20–30 years). Monthly payments are small but
          the total interest paid over the life is the highest of
          all options.
        </li>
        <li>
          <strong>Security:</strong> the heat pump becomes part of
          the mortgage-secured debt. The home is the security; if
          you default on the mortgage as a whole, repossession is
          possible.
        </li>
        <li>
          <strong>Documentation:</strong> full mortgage
          underwriting — affordability assessment, valuation,
          legal fees on the addition. More paperwork than a
          consumer credit agreement.
        </li>
        <li>
          <strong>Watch for:</strong> early-repayment charges if
          you overpay outside the lender&rsquo;s annual limits;
          the long term means you pay interest for far longer
          than other options. If you can clear the heat-pump
          balance within 5 years anyway, a green mortgage add-on
          may not be the cheapest total-cost route despite the
          lowest rate.
        </li>
      </ul>

      <h2>Secured personal loan — quick but expensive</h2>
      <p>
        Personal loans typically run 6–10% APR over 3–7 years for
        amounts in the £3,000–£10,000 range. Some products are
        unsecured; some are secured against the property (which
        means lower APR but introduces repossession risk).
      </p>
      <ul>
        <li>
          <strong>Rate:</strong> the highest of the non-cash
          options. £4,000 over 5 years at 8% APR adds ~£900 in
          interest.
        </li>
        <li>
          <strong>Speed:</strong> approval often in days;
          disbursement in 1–2 weeks. Fastest of the credit
          options if you need to act quickly.
        </li>
        <li>
          <strong>No installer dependency:</strong> the loan is
          between you and the lender; you can pay any installer.
          Useful if the installer you want doesn&rsquo;t offer
          finance.
        </li>
        <li>
          <strong>Watch for:</strong> secured vs unsecured
          framing. Some advertisements promise &ldquo;0% APR
          representative&rdquo; for the best credit scores only;
          most applicants don&rsquo;t qualify. Use the
          representative APR as a floor, not a ceiling.
        </li>
      </ul>

      <h2>Heat-pump-as-a-service — emerging, read the small print</h2>
      <p>
        A handful of UK firms now offer heat-pump-as-a-service:
        they install and own the heat pump on your property; you
        pay a monthly fee covering use + maintenance for typically
        10–15 years. The fee usually includes service contracts
        + breakdown cover. After the contract term, ownership may
        transfer to the homeowner, the contract may roll, or the
        provider may remove the equipment.
      </p>
      <ul>
        <li>
          <strong>Upside:</strong> no upfront cost, ever. No
          credit check on the install itself (though some
          providers credit-check the monthly payment commitment).
          Service + maintenance bundled.
        </li>
        <li>
          <strong>Downside:</strong> total cost over the contract
          typically 1.5–2× the cash-equivalent. You don&rsquo;t
          own the asset, so you can&rsquo;t sell the property
          with the heat pump included without provider consent
          (usually involves transferring the contract to the
          buyer or paying out the remaining balance).
        </li>
        <li>
          <strong>Regulatory framework:</strong> varies by
          structure. Some heat-pump-as-a-service products are
          regulated under consumer credit rules; some under
          lease/rental rules. Verify the provider&rsquo;s FCA
          authorisation and read the early-termination clauses
          carefully.
        </li>
        <li>
          <strong>Best fit:</strong> households without the
          credit profile for traditional finance, or with very
          high uncertainty about staying in the property long-
          term. Otherwise the total-cost premium is hard to
          justify.
        </li>
      </ul>

      <h2>How to compare your specific options</h2>
      <ol>
        <li>
          <strong>Get the cash-equivalent quote from your
          installer.</strong> Even if you plan to finance, you
          need the cash baseline to compare any finance offer
          against. Some installers won&rsquo;t volunteer it; ask
          explicitly.
        </li>
        <li>
          <strong>Compare TOTAL cost over the finance term, not
          monthly payment.</strong> A 10-year green mortgage at
          0.2% feels cheap monthly but adds more total interest
          than a 4-year 0% installer finance does.
        </li>
        <li>
          <strong>Verify FCA authorisation.</strong> Every
          legitimate finance product is provided by an FCA-
          authorised firm. Check the firm&rsquo;s registration at
          fca.org.uk/firms/financial-services-register. If you
          can&rsquo;t find the provider, that&rsquo;s a
          significant red flag.
        </li>
        <li>
          <strong>Check exit / early-settlement terms.</strong>{" "}
          Particularly important for green mortgages
          (early-repayment charges) and heat-pump-as-a-service
          (contract-exit fees).
        </li>
      </ol>

      <h2>What this means for most UK homeowners</h2>
      <p>
        For a typical UK 3-bed semi installing an air-source heat
        pump in 2026:
      </p>
      <ul>
        <li>
          <strong>£4,000+ in low-yield savings:</strong> pay
          cash. Cheapest in absolute terms.
        </li>
        <li>
          <strong>No spare savings but good credit:</strong> 0%
          installer finance, ideally 36–48 months. Best
          risk-adjusted option.
        </li>
        <li>
          <strong>Doing a wider energy retrofit (loft + cavity +
          heat pump):</strong> green mortgage add-on. Bundles the
          whole package at the lowest non-cash rate.
        </li>
        <li>
          <strong>Adverse credit:</strong> secured personal loan
          OR heat-pump-as-a-service. Compare carefully — secured
          loans have repossession risk but lower total cost than
          the subscription model.
        </li>
      </ul>

      <h2>The takeaway</h2>
      <p>
        The £7,500 BUS grant handles most of the heat-pump cost;
        finance addresses the remaining £1,500–£6,500. Cash is
        cheapest, 0% installer finance is the common compromise
        for households without spare savings, green mortgages are
        cheapest non-cash but pay over 25-30 years, secured loans
        are quick but expensive, and heat-pump-as-a-service is
        emerging but commands a meaningful total-cost premium.
        Every option works through an FCA-authorised provider —
        verify the lender registration before signing anything.
      </p>

      <h2>Related reading</h2>
      <ul>
        <li>
          <a href="/guides/heat-pump-payback-period-uk">
            Heat pump payback period UK 2026
          </a>{" "}
          — worked payback calculations help decide whether
          financing is worth the interest cost or whether cash
          out-performs over time.
        </li>
        <li>
          <a href="/guides/bus-application-walkthrough">
            BUS grant application walkthrough
          </a>{" "}
          — confirm grant eligibility before committing to a
          finance product; ineligibility shifts the funding
          gap dramatically.
        </li>
        <li>
          <a href="/guides/heat-pump-running-costs-vs-gas">
            Heat pump vs gas running costs UK 2026
          </a>{" "}
          — the running-cost saving is what justifies the
          install over a finance term; make sure the maths
          works.
        </li>
      </ul>
    </AEOPage>
  );
}
