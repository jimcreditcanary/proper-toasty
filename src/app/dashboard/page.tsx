import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BuyCreditsDialog } from "@/components/buy-credits-dialog";
import { Coins, FileCheck, Clock, Upload } from "lucide-react";

const RISK_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  LOW: { label: "Low Risk", variant: "default" },
  MEDIUM: { label: "Medium Risk", variant: "secondary" },
  HIGH: { label: "High Risk", variant: "destructive" },
  UNKNOWN: { label: "Unknown", variant: "outline" },
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  processing: "secondary",
  pending: "outline",
  failed: "destructive",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number | null | undefined) {
  if (amount == null) return "—";
  return `£${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

type HistoryRow = {
  id: string;
  created_at: string;
  source: "verification" | "scan";
  fileName: string | null;
  accountName: string | null;
  amount: number | null;
  risk: string | null;
  status: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  // Fetch both verifications and legacy scans
  const { data: verifications } = await supabase
    .from("verifications")
    .select("id, created_at, status, payee_name, company_name_input, extracted_company_name, invoice_amount, extracted_invoice_amount, marketplace_listed_price, overall_risk, flow_type, invoice_file_path, marketplace_item_title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: scans } = await supabase
    .from("scans")
    .select("id, file_name, status, company_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Merge into a unified history list
  const history: HistoryRow[] = [];

  if (verifications) {
    for (const v of verifications) {
      const name = v.extracted_company_name || v.company_name_input || v.payee_name || v.marketplace_item_title || null;
      const amount = v.extracted_invoice_amount ?? v.invoice_amount ?? v.marketplace_listed_price ?? null;
      const fileName = v.invoice_file_path
        ? v.invoice_file_path.split("/").pop() ?? null
        : v.flow_type === "marketplace"
          ? "Marketplace"
          : "Manual entry";
      history.push({
        id: v.id,
        created_at: v.created_at,
        source: "verification",
        fileName,
        accountName: name,
        amount: amount != null ? Number(amount) : null,
        risk: v.overall_risk,
        status: v.status ?? "pending",
      });
    }
  }

  if (scans) {
    for (const s of scans) {
      // Skip if there's already a verification with the same ID
      if (history.some((h) => h.id === s.id)) continue;
      history.push({
        id: s.id,
        created_at: s.created_at,
        source: "scan",
        fileName: s.file_name,
        accountName: s.company_name,
        amount: null,
        risk: null,
        status: s.status,
      });
    }
  }

  // Sort by date descending
  history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const credits = profile?.credits ?? 0;
  const totalCount = history.length;
  const completedCount = history.filter((h) => h.status === "completed").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Upload and verify invoices
          </p>
        </div>
        <div className="flex gap-2">
          <BuyCreditsDialog />
          <Button render={<Link href="/verify" />}>
            <Upload className="size-4 mr-1.5" />
            Verify an invoice
          </Button>
        </div>
      </div>

      {/* Low credits alert */}
      {credits > 0 && credits < 5 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <Coins className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              You have {credits} credit{credits === 1 ? "" : "s"} remaining
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
              Top up now so you&apos;re ready for your next check.
            </p>
          </div>
          <BuyCreditsDialog />
        </div>
      )}

      {/* No credits alert */}
      {credits === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <Coins className="size-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              You have no credits
            </p>
            <p className="text-xs text-red-700/80 dark:text-red-400/80">
              Buy credits to start verifying invoices and payments.
            </p>
          </div>
          <BuyCreditsDialog />
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Coins className="size-3.5" />
              Credits remaining
            </CardDescription>
            <CardTitle className="text-2xl">{credits}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <FileCheck className="size-3.5" />
              Verifications completed
            </CardDescription>
            <CardTitle className="text-2xl">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Total checks
            </CardDescription>
            <CardTitle className="text-2xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* History table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Verification history</CardTitle>
          <CardDescription>Your recent verification checks</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No verifications yet</p>
              {credits > 0 ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    You have {credits} credit{credits === 1 ? "" : "s"} ready to use.
                  </p>
                  <Button size="sm" render={<Link href="/verify" />}>
                    <Upload className="size-4 mr-1.5" />
                    Run your first check
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Buy credits to start verifying invoices and payments.
                  </p>
                  <BuyCreditsDialog />
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => {
                  const href = row.source === "verification"
                    ? `/dashboard/results/${row.id}`
                    : `/dashboard/scans/${row.id}`;
                  const riskInfo = row.risk ? RISK_BADGE[row.risk] ?? RISK_BADGE.UNKNOWN : null;
                  return (
                    <TableRow key={`${row.source}-${row.id}`}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={href}
                          className="font-medium underline underline-offset-4 hover:text-primary"
                        >
                          {row.fileName ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.accountName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(row.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.status === "completed" && riskInfo ? (
                          <Badge variant={riskInfo.variant}>{riskInfo.label}</Badge>
                        ) : row.status !== "completed" ? (
                          <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                            {row.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
