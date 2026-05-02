// /installer/leads/[leadId]/propose
//
// Builder UI for a written quote (proposal). Server-rendered shell
// pulls the lead context + the latest existing proposal (if any),
// then hands off to the client builder.
//
// If the latest proposal is still a draft, we resume editing it
// rather than creating a parallel second draft. Once a proposal is
// sent, "propose again" creates a fresh draft seeded from the
// previous line items so the installer can tweak + send v2.

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { presetsFor, type LineItem } from "@/lib/proposals/schema";
import { ProposalBuilderClient } from "./client";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ leadId: string }>;
}

interface ExistingProposal {
  id: string;
  status: "draft" | "sent" | "accepted" | "declined";
  line_items: LineItem[];
  cover_message: string | null;
  vat_rate_bps: number;
  homeowner_token: string;
}

export default async function ProposePage({ params }: PageProps) {
  const { leadId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=/installer/leads/${leadId}/propose`);
  }

  const admin = createAdminClient();

  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Send proposal"
        backLink={{ href: "/installer/leads", label: "Back to leads" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            Your account isn&rsquo;t linked to an installer profile yet,
            so we can&rsquo;t send proposals. Claim your profile from the
            installer signup page first.
          </p>
        </div>
      </PortalShell>
    );
  }

  // Auth-gate the lead by installer_id.
  const { data: lead } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, contact_name, contact_email, property_address, property_postcode, installer_acknowledged_at, wants_heat_pump, wants_solar, wants_battery",
    )
    .eq("id", leadId)
    .eq("installer_id", installer.id)
    .maybeSingle();
  if (!lead) {
    notFound();
  }

  // Pre-acknowledged guard — same as the report viewer.
  if (!lead.installer_acknowledged_at) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Send proposal"
        backLink={{ href: "/installer/leads", label: "Back to leads" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">
            Accept this lead first
          </p>
          <p className="text-sm text-amber-900 mt-1 leading-relaxed">
            You can only send a proposal once you&rsquo;ve accepted the
            booking. Open the lead from your inbox to accept first.
          </p>
        </div>
      </PortalShell>
    );
  }

  // Find the latest proposal for this lead. Resume drafts; show the
  // last sent proposal as a "previous" hint so the installer knows
  // they're starting v2.
  const { data: latest } = await admin
    .from("installer_proposals")
    .select(
      "id, status, line_items, cover_message, vat_rate_bps, homeowner_token",
    )
    .eq("installer_lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      status: "draft" | "sent" | "accepted" | "declined";
      line_items: Json;
      cover_message: string | null;
      vat_rate_bps: number;
      homeowner_token: string;
    }>();

  const resumeDraft: ExistingProposal | null =
    latest && latest.status === "draft"
      ? {
          id: latest.id,
          status: latest.status,
          line_items: coerceLineItems(latest.line_items),
          cover_message: latest.cover_message,
          vat_rate_bps: latest.vat_rate_bps,
          homeowner_token: latest.homeowner_token,
        }
      : null;

  // If the latest is sent/accepted/declined, seed a fresh draft from
  // its line items so revisions are easy.
  const seed: { lineItems: LineItem[]; coverMessage: string | null; vatRateBps: number } =
    resumeDraft
      ? {
          lineItems: resumeDraft.line_items,
          coverMessage: resumeDraft.cover_message,
          vatRateBps: resumeDraft.vat_rate_bps,
        }
      : latest
        ? {
            lineItems: coerceLineItems(latest.line_items),
            coverMessage: latest.cover_message,
            vatRateBps: latest.vat_rate_bps,
          }
        : {
            lineItems: presetsFor({
              wantsHeatPump: lead.wants_heat_pump,
              wantsSolar: lead.wants_solar,
              wantsBattery: lead.wants_battery,
            }).map((p, i) => ({
              id: `preset-${i}`,
              description: p.description,
              quantity: p.quantity,
              unit_price_pence: p.unit_price_pence,
            })),
            coverMessage: null,
            vatRateBps: 0,
          };

  const previousSent =
    latest && latest.status !== "draft" ? latest : null;

  return (
    <PortalShell
      portalName="Installer"
      pageTitle={
        resumeDraft
          ? "Continue your draft proposal"
          : previousSent
            ? "Send a revised proposal"
            : "Send a proposal"
      }
      pageSubtitle={
        lead.contact_name
          ? `For ${lead.contact_name}${lead.property_address ? ` · ${lead.property_address}` : ""}`
          : (lead.property_address ?? "Quote line items + send to the homeowner.")
      }
      backLink={{
        href: `/installer/reports/${leadId}`,
        label: "Back to pre-survey report",
      }}
    >
      {previousSent && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5 text-sm">
          <p className="text-slate-700">
            <span className="font-semibold text-navy">Previous quote</span>{" "}
            sent on{" "}
            {previousSent.status === "draft" ? "—" : "previously"}{" "}
            was{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
              {previousSent.status}
            </span>
            . Edit and re-send below — this creates a v2; the original
            stays in your proposals list.
          </p>
        </div>
      )}

      <ProposalBuilderClient
        leadId={leadId}
        leadContext={{
          contactName: lead.contact_name,
          propertyAddress: lead.property_address,
          propertyPostcode: lead.property_postcode,
          wantsHeatPump: lead.wants_heat_pump,
          wantsSolar: lead.wants_solar,
          wantsBattery: lead.wants_battery,
        }}
        existingDraft={resumeDraft ?? null}
        seed={seed}
      />

      <div className="mt-8 text-center">
        <Link
          href="/installer/proposals"
          className="text-xs text-slate-500 hover:text-coral underline"
        >
          ← All proposals
        </Link>
      </div>
    </PortalShell>
  );
}

function coerceLineItems(raw: Json): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).flatMap((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      typeof (row as { description?: unknown }).description !== "string" ||
      typeof (row as { quantity?: unknown }).quantity !== "number" ||
      typeof (row as { unit_price_pence?: unknown }).unit_price_pence !== "number"
    ) {
      return [];
    }
    const r = row as {
      id?: unknown;
      description: string;
      quantity: number;
      unit_price_pence: number;
    };
    return [
      {
        id: typeof r.id === "string" ? r.id : crypto.randomUUID(),
        description: r.description,
        quantity: r.quantity,
        unit_price_pence: r.unit_price_pence,
      },
    ];
  });
}
