// /guides/bus-application-walkthrough — BUS application explainer.
//
// First production guide page. Step-by-step walkthrough of how the
// £7,500 Boiler Upgrade Scheme grant actually flows from MCS-
// certified installer through Ofgem to your invoice. Most UK
// homeowners only encounter this once + the official guidance is
// fragmented across GOV.UK + Ofgem + MCS — this guide gathers it
// in one place with the practical timeline + what could go wrong.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/bus-application-walkthrough";

export const metadata: Metadata = {
  title: "BUS grant application walkthrough 2026: step-by-step UK guide",
  description:
    "How the £7,500 Boiler Upgrade Scheme grant actually flows from installer through Ofgem to your invoice. Timeline, paperwork, what can go wrong.",
  alternates: { canonical: URL },
  openGraph: {
    title: "BUS grant application walkthrough 2026: step-by-step UK guide",
    description:
      "Practical step-by-step of how the £7,500 BUS grant works in 2026 UK installs.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function BusApplicationWalkthrough() {
  return (
    <AEOPage
      headline="How the BUS grant application works in 2026: a step-by-step UK guide"
      description="How the £7,500 Boiler Upgrade Scheme grant actually flows from installer through Ofgem to your invoice. Timeline, paperwork, what can go wrong."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · BUS scheme"
      kind="howto"
      howToTotalTime="P10W"
      howToSteps={[
        {
          name: "Hire an MCS-certified installer",
          text: "Find a heat-pump installer with active MCS certification at mcscertified.com. Verify the installer's MCS number AND that the specific heat-pump product is on the MCS product register before signing anything.",
        },
        {
          name: "Receive a quote with BUS deduction applied",
          text: "The installer quotes the gross install cost and applies the £7,500 BUS deduction as a line item. Your contractually-owed amount is the net figure (gross minus £7,500).",
        },
        {
          name: "Sign the BUS consent form + installation contract",
          text: "Two documents: the standardised Ofgem BUS consent form authorising the installer to claim the grant on your behalf, and the installer's standard installation contract referencing the gross + net amounts.",
        },
        {
          name: "Verify EPC validity + clear insulation recommendations",
          text: "The EPC must be less than 10 years old. Any loft or cavity insulation recommendations must be cleared (work done with fresh EPC OR exemption applies) before the grant applies. Typical clearance: 2-6 weeks.",
        },
        {
          name: "Install + commissioning",
          text: "Install typically takes 2-3 working days on site. Commissioning follows: installer runs the system, tunes weather compensation, issues the MCS Installation Certificate. You pay the NET-of-grant invoice at this point.",
        },
        {
          name: "Installer submits the BUS claim to Ofgem",
          text: "After commissioning + MCS registration, the installer submits the BUS claim. Ofgem processes within 4-6 weeks and pays £7,500 directly to the installer. You're not involved in this leg — keep your MCS certificate and invoices for your records.",
        },
      ]}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "BUS application walkthrough" },
      ]}
      directAnswer="The £7,500 Boiler Upgrade Scheme grant is applied for by your MCS-certified installer, not by you. Ofgem pays the £7,500 directly to the installer; you see it as a line-item discount on your final invoice. The application happens after the install is commissioned and registered with MCS. Typical end-to-end timeline: 4–10 weeks from initial quote to grant-discounted commissioning. The homeowner's job is to consent to the application, hold a valid EPC + cleared insulation recommendations, and verify the installer is MCS-certified."
      tldr={[
        "Your INSTALLER applies for BUS, not you — they receive the £7,500 and discount your invoice.",
        "Eligibility: owner-occupier or private rented, England or Wales, EPC valid with loft + cavity recommendations cleared.",
        "Timeline: 4–10 weeks from quote to grant-discounted commissioning.",
        "Documentation: signed consent form authorising installer to claim on your behalf.",
        "If anything goes wrong post-install, MCS + Ofgem dispute paths exist — keep all paperwork.",
      ]}
      faqs={[
        {
          question:
            "Do I need to apply for the BUS grant myself?",
          answer:
            "No. The MCS-certified installer who completes your install applies on your behalf. You sign a consent form authorising the application; the installer submits paperwork to Ofgem after commissioning, Ofgem pays the £7,500 to the installer, and the installer deducts that amount from your final invoice. You never handle the £7,500 yourself. This is intentional — the scheme is designed to reduce friction by routing payment through the trade rather than reimbursing homeowners after the fact.",
        },
        {
          question:
            "When does the £7,500 actually come off my bill?",
          answer:
            "On the final invoice, which the installer issues after commissioning. The mechanics: you pay the installer the net amount (gross install cost minus the £7,500); the installer claims the grant from Ofgem after submitting commissioning paperwork; Ofgem reimburses the installer within 4–6 weeks. The risk window — between the installer discounting your invoice and receiving Ofgem's payment — is carried by the installer, not you. Practical implication: pay the net amount when invoiced, no separate grant handling.",
        },
        {
          question:
            "What if my EPC has insulation recommendations that need clearing?",
          answer:
            "Most UK EPCs include 'recommended improvements' such as loft insulation, cavity wall insulation, or double glazing. The 2024 BUS rules require any loft or cavity recommendations on your current EPC to be CLEARED before the grant applies. 'Cleared' means either: the work is done (insulation installed, new EPC issued reflecting this), OR an exemption applies (listed building, conservation area, etc.). Your installer will check the EPC during quoting and flag this. Typical clearance is 2–6 weeks if work is needed.",
        },
        {
          question:
            "What can go wrong with a BUS application?",
          answer:
            "Three common issues: (1) your EPC is more than 10 years old and Ofgem requires a fresh one — costs ~£60-£120 and adds 1-2 weeks; (2) loft/cavity recommendations aren't cleared — same paperwork loop as Q3 above; (3) the installer's MCS certification has lapsed or the specific product isn't on the MCS product register. Issue #3 is the most serious because it can void the grant entirely; verify the installer's MCS number at mcscertified.com/find-an-installer before signing anything. Less common: ownership disputes, council planning consent issues for the outdoor unit, supply-chain delays beyond the standard window.",
        },
        {
          question:
            "What happens if I'm renting or in a leasehold flat?",
          answer:
            "BUS grants are available for properties whose owner consents. If you're a tenant, the landlord applies. If you're a leasehold flat owner, you'll typically need the freeholder's consent + may need management company sign-off on the outdoor-unit siting before the install can proceed. The grant amount is the same; the paperwork is more complex. Some councils and housing associations have streamlined consent processes for leasehold BUS installs.",
        },
      ]}
      sources={[
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Boiler Upgrade Scheme administrator guidance",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer + product register",
          url: "https://mcscertified.com/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Find an Energy Performance Certificate",
          url: "https://www.gov.uk/find-energy-certificate",
          accessedDate: "May 2026",
        },
        {
          name: "DESNZ — Heat and Buildings Strategy",
          url: "https://www.gov.uk/government/publications/heat-and-buildings-strategy",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>Who applies, who gets paid, who decides</h2>
      <p>
        The BUS scheme is administered by Ofgem on behalf of DESNZ
        (Department for Energy Security and Net Zero). The grant
        is paid through MCS-certified installers — not directly
        to homeowners. This is the most important thing to
        understand because it reverses the intuitive flow of
        most government grants you might expect.
      </p>
      <p>
        The sequence:
      </p>
      <ol>
        <li>
          <strong>You hire an MCS-certified installer.</strong> They
          quote you the gross install cost.
        </li>
        <li>
          <strong>The installer applies the £7,500 as a deduction
          to the quote.</strong> Your contractually-owed amount is
          the net figure.
        </li>
        <li>
          <strong>You sign a BUS consent form</strong> authorising
          the installer to claim the grant on your behalf, plus
          a standard installation contract.
        </li>
        <li>
          <strong>The install happens, then commissioning.</strong>{" "}
          You pay the installer the NET amount.
        </li>
        <li>
          <strong>The installer submits the BUS claim to Ofgem</strong>{" "}
          after registering the install on the MCS scheme.
        </li>
        <li>
          <strong>Ofgem pays £7,500 to the installer</strong> within
          4–6 weeks of a clean claim.
        </li>
      </ol>
      <p>
        You never see the £7,500 in your bank account — the
        installer carries the cash-flow risk between discounting
        your invoice and receiving Ofgem&rsquo;s payment.
        That&rsquo;s why the scheme requires the installer to be
        MCS-certified: it gates participation to firms with the
        accreditation and financial stability to handle the
        timing gap.
      </p>

      <h2>Eligibility — three things that must be true</h2>
      <p>
        Before the £7,500 can apply, three conditions must be
        met:
      </p>
      <ul>
        <li>
          <strong>Property in England or Wales.</strong> Scotland
          and Northern Ireland have separate schemes (Home Energy
          Scotland, Renewable Heat Premium NI). The BUS itself
          covers only English and Welsh properties.
        </li>
        <li>
          <strong>Owner-occupier or private rented sector.</strong>{" "}
          Council houses and housing-association properties are
          generally excluded (handled through ECO and other
          scheme routes). Owner-occupiers + landlords renting to
          private tenants are eligible.
        </li>
        <li>
          <strong>Valid EPC with insulation recommendations
          cleared.</strong> The EPC must be less than 10 years
          old. Any &ldquo;loft insulation&rdquo; or &ldquo;cavity
          wall insulation&rdquo; recommendation on the EPC must
          be EITHER completed (with a fresh EPC reflecting the
          completion) or exempted via specific criteria (listed
          building, technical infeasibility, etc.). Other
          recommendations (e.g. double glazing, draught proofing)
          don&rsquo;t block the grant.
        </li>
      </ul>

      <h2>The paperwork — what you actually sign</h2>
      <p>
        Three documents matter in a typical BUS install:
      </p>
      <ul>
        <li>
          <strong>BUS consent form (Ofgem).</strong> Authorises
          the installer to claim the grant on your behalf and
          collect the £7,500 from Ofgem. Standardised Ofgem form,
          one page, signed before commissioning. Don&rsquo;t
          sign this until you&rsquo;ve seen the net-of-grant
          quoted price and are happy with the installer.
        </li>
        <li>
          <strong>Installation contract.</strong> Your
          installer&rsquo;s standard contract for the install
          itself. Should reference the gross + net amounts, the
          BUS deduction line, the deposit / staged payment
          structure if any, the warranty, and the commissioning
          timetable.
        </li>
        <li>
          <strong>MCS Installation Certificate (post-install).</strong>{" "}
          Issued by the installer after commissioning, registered
          with MCS&rsquo;s database. This is YOUR proof of a
          compliant install — keep the certificate; it&rsquo;s
          required for the grant claim AND for warranty / future
          house sale.
        </li>
      </ul>

      <h2>The typical timeline</h2>
      <p>
        Realistic BUS install timeline for a UK 3-bed semi in 2026:
      </p>
      <ul>
        <li>
          <strong>Week 0:</strong> You request quotes from 2–3
          MCS-certified installers. They visit, run heat-loss
          surveys.
        </li>
        <li>
          <strong>Weeks 1–2:</strong> Quotes return. You compare,
          pick an installer. Sign installation contract + BUS
          consent form.
        </li>
        <li>
          <strong>Weeks 2–4:</strong> Equipment ordered, lead time
          on the heat pump unit + cylinder. Installer schedules
          install date.
        </li>
        <li>
          <strong>Weeks 4–5:</strong> Install (typically 2–3
          working days on site).
        </li>
        <li>
          <strong>Week 5:</strong> Commissioning — installer runs
          the system, tunes weather compensation, sets up your
          tariff if relevant, issues MCS Installation Certificate.
          You pay the NET-of-grant invoice.
        </li>
        <li>
          <strong>Weeks 5–11:</strong> Installer submits BUS claim,
          Ofgem processes (4–6 weeks typical), £7,500 paid to
          installer. You&rsquo;re not involved in this leg.
        </li>
      </ul>
      <p>
        End-to-end: 4–10 weeks from quote to commissioning. If
        your EPC needs renewal or insulation needs clearing, add
        2–4 weeks.
      </p>

      <h2>What could go wrong — and how to avoid it</h2>
      <p>
        Three common BUS-application issues:
      </p>
      <ul>
        <li>
          <strong>EPC out of date.</strong> Ofgem requires the
          EPC to be less than 10 years old. ~15% of UK
          owner-occupied homes have EPCs older than this. Fresh
          EPC costs ~£60–£120 + 1–2 weeks. Check your EPC validity
          at gov.uk/find-energy-certificate before requesting
          quotes — saves time if you need to commission a fresh
          one early.
        </li>
        <li>
          <strong>Insulation recommendations uncleared.</strong>{" "}
          ~60% of UK EPCs flag loft or cavity insulation as
          &ldquo;recommended&rdquo;. If yours does, you&rsquo;ll
          need to either complete the insulation work OR show an
          exemption applies. Loft top-up costs £400–£1,500;
          cavity wall £1,500–£3,500. Often the same trade can
          quote both insulation + heat pump if you mention it
          early.
        </li>
        <li>
          <strong>Installer or product not MCS-certified.</strong>{" "}
          The grant requires both the installer&rsquo;s firm AND
          the specific heat-pump model to be MCS-certified at the
          time of install. Lapsed certifications happen
          occasionally. Verify at mcscertified.com/find-an-
          installer (installer search) and mcscertified.com/
          find-a-product (product search) before signing.
        </li>
      </ul>

      <h2>If something goes wrong post-install</h2>
      <p>
        If the install completes but the BUS payment fails — the
        installer can&rsquo;t claim the grant for some reason —
        responsibility depends on the contract you signed. Most
        standard installer contracts pass the grant-failure risk
        to the homeowner (you owe the gross amount if the grant
        doesn&rsquo;t pay out). Check this clause carefully
        before signing. Some installers offer to absorb the risk;
        most don&rsquo;t.
      </p>
      <p>
        Dispute resolution paths if the install or the grant
        process goes wrong:
      </p>
      <ol>
        <li>
          <strong>Installer&rsquo;s complaints process</strong> —
          most MCS installers have a documented complaints policy
          with a 14-day initial response window.
        </li>
        <li>
          <strong>MCS Complaints Service</strong> at
          mcscertified.com/raise-a-complaint — independent
          adjudication on MCS-certified installs.
        </li>
        <li>
          <strong>Renewable Energy Consumer Code (RECC)</strong>{" "}
          for consumer protection on renewable-energy installs.
          Most MCS installers are RECC-registered.
        </li>
        <li>
          <strong>Ofgem</strong> for BUS-specific scheme disputes
          (grant payment, eligibility decisions).
        </li>
      </ol>

      <h2>Before you start — the pre-survey shortcut</h2>
      <p>
        The free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
        runs through BUS eligibility for your specific property
        before you contact any installer:
      </p>
      <ul>
        <li>Checks your EPC validity + flags any uncleared insulation recs.</li>
        <li>Confirms England/Wales eligibility.</li>
        <li>Generates an installer-ready report with property heat-loss indication.</li>
        <li>Saves 1–2 weeks of pre-quote diligence.</li>
      </ul>

      <h2>The summary</h2>
      <p>
        The BUS grant works because the homeowner-side complexity
        is minimal: sign two pieces of paper (consent form +
        contract), pay the net invoice, keep the MCS certificate
        for your records. The £7,500 mechanics — Ofgem, installer
        claim, payment timing — happen on the installer&rsquo;s
        side. The three things to get right BEFORE quoting are
        EPC validity, cleared insulation recommendations, and
        verifying installer + product MCS certification at
        mcscertified.com. Everything else flows from a competent
        MCS installer&rsquo;s standard process.
      </p>

      <h2>Related reading</h2>
      <ul>
        <li>
          <a href="/guides/fabric-first-retrofit-before-heat-pump">
            Fabric-first retrofit before a heat pump
          </a>{" "}
          — how to clear the loft + cavity recommendations
          that gate the BUS grant, and which insulation
          measures most help heat-pump performance.
        </li>
        <li>
          <a href="/guides/mcs-site-visit-what-to-expect">
            MCS heat pump site visit: what to expect
          </a>{" "}
          — the installer survey that produces the quote on
          which your BUS application is based.
        </li>
        <li>
          <a href="/compare/heat-pump-vs-gas-boiler">
            Heat pump vs gas boiler comparison
          </a>{" "}
          — the decision context most BUS applicants are
          working through alongside the grant paperwork.
        </li>
      </ul>
    </AEOPage>
  );
}
