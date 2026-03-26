import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Landmark,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Minus,
} from "lucide-react";
import type { Json } from "@/types/database";

type VerificationStatus = "verified" | "failed" | "not_checked" | "error";

function getVerificationStatus(
  result: Json | null,
  type: "companies_house" | "hmrc" | "bank"
): VerificationStatus {
  if (!result || typeof result !== "object" || Array.isArray(result))
    return "not_checked";
  if ("error" in result) return "error";
  if (type === "bank" && "verified" in result)
    return result.verified ? "verified" : "failed";
  if ("found" in result) return result.found ? "verified" : "failed";
  return "not_checked";
}

function StatusIcon({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "verified":
      return <CheckCircle2 className="size-5 text-emerald-600" />;
    case "failed":
      return <XCircle className="size-5 text-destructive" />;
    case "error":
      return <AlertCircle className="size-5 text-amber-500" />;
    default:
      return <Minus className="size-5 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const map: Record<
    VerificationStatus,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    verified: { label: "Verified", variant: "default" },
    failed: { label: "Not found", variant: "destructive" },
    error: { label: "Error", variant: "outline" },
    not_checked: { label: "Not checked", variant: "secondary" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

function CompanyDetails({ data }: { data: Json | null }) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, Json | undefined>;
  return (
    <div className="space-y-1 text-sm">
      {d.company_name && (
        <FieldRow label="Registered name" value={String(d.company_name)} />
      )}
      {d.company_status && (
        <FieldRow label="Status" value={String(d.company_status)} />
      )}
      {d.type && <FieldRow label="Type" value={String(d.type)} />}
      {d.date_of_creation && (
        <FieldRow label="Incorporated" value={String(d.date_of_creation)} />
      )}
      {d.registered_office_address &&
        typeof d.registered_office_address === "object" &&
        !Array.isArray(d.registered_office_address) && (
          <FieldRow
            label="Address"
            value={Object.values(d.registered_office_address)
              .filter(Boolean)
              .join(", ")}
          />
        )}
    </div>
  );
}

function VatDetails({ data }: { data: Json | null }) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, Json | undefined>;
  const target =
    d.target && typeof d.target === "object" && !Array.isArray(d.target)
      ? (d.target as Record<string, Json | undefined>)
      : d;
  return (
    <div className="space-y-1 text-sm">
      {target.name && <FieldRow label="Name" value={String(target.name)} />}
      {target.vatNumber && (
        <FieldRow label="VAT number" value={String(target.vatNumber)} />
      )}
      {target.address &&
        typeof target.address === "object" &&
        !Array.isArray(target.address) && (
          <FieldRow
            label="Address"
            value={Object.values(target.address).filter(Boolean).join(", ")}
          />
        )}
    </div>
  );
}

export default async function ScanResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: scan } = await supabase
    .from("scans")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) notFound();

  const chStatus = getVerificationStatus(
    scan.companies_house_result,
    "companies_house"
  );
  const vatStatus = getVerificationStatus(scan.hmrc_vat_result, "hmrc");
  const bankStatus = getVerificationStatus(scan.bank_verify_result, "bank");

  const scanStatus = scan.status as string;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/dashboard" />}>
        <ArrowLeft className="size-4 mr-1" />
        Back to dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{scan.file_name}</h1>
          <p className="text-sm text-muted-foreground">
            Scanned{" "}
            {new Date(scan.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge
          variant={
            scanStatus === "completed"
              ? "default"
              : scanStatus === "failed"
                ? "destructive"
                : "secondary"
          }
        >
          {scanStatus}
        </Badge>
      </div>

      <Separator className="my-6" />

      {/* Extracted fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <CardTitle>Extracted fields</CardTitle>
          </div>
          <CardDescription>
            Data extracted from the uploaded invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <FieldRow label="Company name" value={scan.company_name} />
            <FieldRow label="Company number" value={scan.company_number} />
            <FieldRow label="VAT number" value={scan.vat_number} />
            <FieldRow label="Sort code" value={scan.sort_code} />
            <FieldRow label="Account number" value={scan.account_number} />
          </div>
        </CardContent>
      </Card>

      {/* Verification results */}
      <h2 className="mt-8 mb-4 text-lg font-semibold">Verification results</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Companies House */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm">Companies House</CardTitle>
              </div>
              <StatusIcon status={chStatus} />
            </div>
            <div className="mt-1">
              <StatusBadge status={chStatus} />
            </div>
          </CardHeader>
          {chStatus === "verified" && scan.companies_house_result && (
            <CardContent>
              <Separator className="mb-3" />
              <CompanyDetails
                data={
                  (scan.companies_house_result as Record<string, Json>).data ??
                  scan.companies_house_result
                }
              />
            </CardContent>
          )}
        </Card>

        {/* HMRC VAT */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm">HMRC VAT</CardTitle>
              </div>
              <StatusIcon status={vatStatus} />
            </div>
            <div className="mt-1">
              <StatusBadge status={vatStatus} />
            </div>
          </CardHeader>
          {vatStatus === "verified" && scan.hmrc_vat_result && (
            <CardContent>
              <Separator className="mb-3" />
              <VatDetails
                data={
                  (scan.hmrc_vat_result as Record<string, Json>).data ??
                  scan.hmrc_vat_result
                }
              />
            </CardContent>
          )}
        </Card>

        {/* Bank Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm">Bank account</CardTitle>
              </div>
              <StatusIcon status={bankStatus} />
            </div>
            <div className="mt-1">
              <StatusBadge status={bankStatus} />
            </div>
          </CardHeader>
          {bankStatus === "verified" && (
            <CardContent>
              <Separator className="mb-3" />
              <p className="text-sm text-muted-foreground">
                Account number matches the company name on record.
              </p>
            </CardContent>
          )}
          {bankStatus === "failed" && (
            <CardContent>
              <Separator className="mb-3" />
              <p className="text-sm text-destructive">
                The account number does not match the company name provided.
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
