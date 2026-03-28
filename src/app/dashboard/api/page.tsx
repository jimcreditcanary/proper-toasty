import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
import { Separator } from "@/components/ui/separator";
import { Coins, Key, BookOpen, Activity } from "lucide-react";
import { ApiKeyManager } from "@/components/api-key-manager";
import { BuyCreditsDialog } from "@/components/buy-credits-dialog";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ApiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();

  const [profileResult, logsResult] = await Promise.all([
    admin.from("users").select("credits, api_key").eq("id", user.id).single(),
    admin
      .from("api_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const credits = profileResult.data?.credits ?? 0;
  const apiKey = profileResult.data?.api_key ?? null;
  const logs = logsResult.data ?? [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.whoamipaying.co.uk";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">API</h1>
          <p className="text-sm text-muted-foreground">
            Verify invoices programmatically
          </p>
        </div>
        <div className="flex gap-2">
          <BuyCreditsDialog />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
              <Activity className="size-3.5" />
              API calls (total)
            </CardDescription>
            <CardTitle className="text-2xl">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* API Key */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-4" />
            API Key
          </CardTitle>
          <CardDescription>
            Use this key in the Authorization header to authenticate API requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyManager initialKey={apiKey} />
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-4" />
            Documentation
          </CardTitle>
          <CardDescription>
            How to use the WhoAmIPaying verification API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint */}
          <div>
            <h3 className="text-sm font-semibold">Endpoint</h3>
            <code className="mt-1 block rounded-md bg-muted px-3 py-2 text-sm">
              POST {appUrl}/api/v1/verify
            </code>
          </div>

          <Separator />

          {/* Auth */}
          <div>
            <h3 className="text-sm font-semibold">Authentication</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Include your API key in the Authorization header:
            </p>
            <code className="mt-1 block rounded-md bg-muted px-3 py-2 text-sm">
              Authorization: Bearer your_api_key
            </code>
          </div>

          <Separator />

          {/* Request */}
          <div>
            <h3 className="text-sm font-semibold">Request Body</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a JSON body with the fields you want to verify. At least one field is required.
              Each request costs 1 credit.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">
{`{
  "company_name": "Acme Ltd",
  "vat_number": "417589169",
  "company_number": "11300735",
  "account_number": "32474465",
  "sort_code": "040003"
}`}
            </pre>
          </div>

          <Separator />

          {/* Fields */}
          <div>
            <h3 className="text-sm font-semibold">Fields</h3>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex gap-3">
                <code className="shrink-0 text-muted-foreground">company_name</code>
                <span>Company or business name (required for bank verification)</span>
              </div>
              <div className="flex gap-3">
                <code className="shrink-0 text-muted-foreground">vat_number</code>
                <span>UK VAT registration number — triggers HMRC lookup</span>
              </div>
              <div className="flex gap-3">
                <code className="shrink-0 text-muted-foreground">company_number</code>
                <span>Companies House registration number — triggers CH lookup</span>
              </div>
              <div className="flex gap-3">
                <code className="shrink-0 text-muted-foreground">account_number</code>
                <span>Bank account number — triggers bank verification (requires sort_code and company_name)</span>
              </div>
              <div className="flex gap-3">
                <code className="shrink-0 text-muted-foreground">sort_code</code>
                <span>Bank sort code (with or without dashes)</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Example curl */}
          <div>
            <h3 className="text-sm font-semibold">Example</h3>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">
{`curl -X POST ${appUrl}/api/v1/verify \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company_name": "Acme Ltd",
    "vat_number": "417589169",
    "company_number": "11300735",
    "account_number": "32474465",
    "sort_code": "04-00-03"
  }'`}
            </pre>
          </div>

          <Separator />

          {/* Response */}
          <div>
            <h3 className="text-sm font-semibold">Response</h3>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">
{`{
  "reference_id": "uuid",
  "credits_remaining": 9,
  "duration_ms": 1234,
  "results": {
    "companies_house": {
      "found": true,
      "data": { ... }
    },
    "hmrc_vat": {
      "found": true,
      "data": { ... }
    },
    "bank_verification": {
      "verified": true,
      "data": { ... }
    }
  }
}`}
            </pre>
          </div>

          <Separator />

          {/* Errors */}
          <div>
            <h3 className="text-sm font-semibold">Error Codes</h3>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex gap-3">
                <Badge variant="outline">401</Badge>
                <span>Invalid or missing API key</span>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline">402</Badge>
                <span>Insufficient credits</span>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline">400</Badge>
                <span>No fields provided in request body</span>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline">500</Badge>
                <span>Internal server error</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Logs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            Usage Logs
          </CardTitle>
          <CardDescription>Recent API requests</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No API calls yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate an API key and make your first request
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {log.method} {log.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status_code >= 200 && log.status_code < 300
                            ? "default"
                            : "destructive"
                        }
                      >
                        {log.status_code}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.credits_used}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(log.created_at)}
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
