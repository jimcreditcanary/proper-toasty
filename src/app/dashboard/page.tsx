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

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
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

  const { data: scans } = await supabase
    .from("scans")
    .select("id, file_name, status, company_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const credits = profile?.credits ?? 0;
  const totalScans = scans?.length ?? 0;
  const completedScans =
    scans?.filter((s) => s.status === "completed").length ?? 0;

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
              Invoices verified
            </CardDescription>
            <CardTitle className="text-2xl">{completedScans}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Total scans
            </CardDescription>
            <CardTitle className="text-2xl">{totalScans}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Scan history */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
          <CardDescription>
            Your recent invoice verifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!scans || scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No scans yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload an invoice to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/scans/${scan.id}`}
                        className="font-medium underline underline-offset-4 hover:text-primary"
                      >
                        {scan.file_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {scan.company_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANTS[scan.status] ?? "outline"}
                      >
                        {scan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(scan.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
