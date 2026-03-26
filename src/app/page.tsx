import Link from "next/link";
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
import { SiteHeader } from "@/components/site-header";
import {
  ShieldCheck,
  FileSearch,
  Building2,
  CreditCard,
  Zap,
  Lock,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 sm:py-32 text-center">
        <Badge variant="secondary" className="mb-4">
          Trusted invoice verification for UK businesses
        </Badge>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Verify invoices before you pay
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Upload any invoice and we&apos;ll check the company details, VAT
          number, and bank account against official UK registers — in seconds.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/auth/signup" />}>
            Start verifying invoices
          </Button>
          <Button variant="outline" size="lg" render={<Link href="#how-it-works" />}>
            See how it works
          </Button>
        </div>
      </section>

      <Separator />

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-2 text-muted-foreground">
            Three steps to verify any invoice
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSearch className="size-5" />
              </div>
              <CardTitle className="mt-3">1. Upload your invoice</CardTitle>
              <CardDescription>
                Upload a PDF or image of any invoice. Our AI extracts the key
                details automatically — company name, VAT number, company
                number, sort code, and account number.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <CardTitle className="mt-3">2. We run the checks</CardTitle>
              <CardDescription>
                We verify the company against Companies House, validate the VAT
                number with HMRC, and check the bank account matches the company
                name.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <CardTitle className="mt-3">3. Pay with confidence</CardTitle>
              <CardDescription>
                Get a clear breakdown of what matched and what didn&apos;t.
                Spot fraudulent invoices before making a payment.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything you need
          </h2>
          <p className="mt-2 text-muted-foreground">
            Built for businesses that take payment security seriously
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Companies House lookup",
              description:
                "Verify the company registration number against the official Companies House register.",
            },
            {
              icon: Building2,
              title: "HMRC VAT validation",
              description:
                "Check VAT numbers directly with HMRC to confirm they're valid and active.",
            },
            {
              icon: Lock,
              title: "Bank account matching",
              description:
                "Verify that the bank account number matches the company name on the invoice.",
            },
            {
              icon: Zap,
              title: "AI-powered extraction",
              description:
                "Our AI reads your invoices and extracts all key fields automatically. No manual entry needed.",
            },
            {
              icon: FileSearch,
              title: "PDF and image support",
              description:
                "Upload PDFs or photos of invoices. We handle scanned documents, screenshots, and more.",
            },
            {
              icon: CreditCard,
              title: "API access",
              description:
                "Integrate invoice verification into your own systems with our REST API. Use your API key to verify invoices programmatically.",
            },
          ].map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <feature.icon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="mt-2">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Simple credit-based pricing
          </h2>
          <p className="mt-2 text-muted-foreground">
            Buy credits, use them when you need. No subscriptions.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
          {[
            { credits: 10, price: "£5", per: "£0.50", label: "Starter" },
            { credits: 50, price: "£20", per: "£0.40", label: "Business", popular: true },
            { credits: 200, price: "£60", per: "£0.30", label: "Enterprise" },
          ].map((plan) => (
            <Card
              key={plan.label}
              className={plan.popular ? "ring-2 ring-primary" : ""}
            >
              <CardHeader>
                {plan.popular && (
                  <Badge className="w-fit mb-1">Most popular</Badge>
                )}
                <CardTitle>{plan.label}</CardTitle>
                <CardDescription>
                  {plan.credits} credits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{plan.price}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.per} per verification
                </p>
                <Button
                  className="mt-4 w-full"
                  variant={plan.popular ? "default" : "outline"}
                  render={<Link href="/auth/signup" />}
                >
                  Get started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Stop paying fraudulent invoices
        </h2>
        <p className="mt-2 text-muted-foreground">
          Join businesses that verify before they pay.
        </p>
        <Button size="lg" className="mt-6" render={<Link href="/auth/signup" />}>
          Create your free account
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          &copy; {new Date().getFullYear()} WhoAmIPaying. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
