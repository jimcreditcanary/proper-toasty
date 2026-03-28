import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isOBConnectEnabled } from "@/lib/obconnect";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = typeof params.id === "string" ? params.id : null;

  if (!id) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("ob_payments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!payment) redirect("/dashboard");

  const sandboxMode = !isOBConnectEnabled();
  const status = payment.status;

  const statusConfig: Record<
    string,
    {
      icon: typeof CheckCircle2;
      color: string;
      bgColor: string;
      title: string;
      description: string;
    }
  > = {
    COMPLETED: {
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      title: "Payment sent successfully",
      description:
        "Your payment has been completed and funds are on their way.",
    },
    AUTHORISED: {
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      title: "Payment authorised and processing",
      description:
        "Your payment has been authorised by your bank and is now being processed.",
    },
    FAILED: {
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      title: "Payment could not be completed",
      description:
        payment.reason ||
        "There was an issue processing your payment. Please try again or contact your bank.",
    },
    CANCELLED: {
      icon: Ban,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      title: "Payment was cancelled",
      description: "You cancelled this payment. No funds have been taken.",
    },
  };

  const config = statusConfig[status] ?? statusConfig.FAILED;
  const StatusIcon = config.icon;

  return (
    <div className="flex min-h-screen flex-col">
      {sandboxMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          <span className="font-medium">&#9888; Payment sandbox</span> —
          OBConnect not connected
        </div>
      )}

      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div
              className={`mx-auto mb-3 flex size-16 items-center justify-center rounded-full ${config.bgColor}`}
            >
              <StatusIcon className={`size-8 ${config.color}`} />
            </div>
            <CardTitle className="text-xl">{config.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {config.description}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment details */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payee</span>
                <span className="font-medium">{payment.payee_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium font-mono">
                  &pound;{Number(payment.amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sort Code</span>
                <span className="font-mono text-xs">{payment.sort_code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account</span>
                <span className="font-mono text-xs">
                  {payment.account_number}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{payment.reference}</span>
              </div>
              {payment.completed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{formatDate(payment.completed_at)}</span>
                </div>
              )}
            </div>

            <Badge
              variant="outline"
              className="w-full justify-center py-1.5 text-xs"
            >
              Payment ID: {payment.id.slice(0, 8)}
            </Badge>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {status === "FAILED" && payment.verification_id && (
                <Button
                  variant="outline"
                  className="flex-1"
                  render={
                    <Link
                      href={`/dashboard/results/${payment.verification_id}`}
                    />
                  }
                >
                  <RefreshCw className="mr-1.5 size-4" />
                  Retry
                </Button>
              )}
              <Button
                className="flex-1"
                render={<Link href="/dashboard" />}
              >
                <ArrowLeft className="mr-1.5 size-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
