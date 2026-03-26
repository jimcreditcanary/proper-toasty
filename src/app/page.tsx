import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        whoamipaying.co.uk
      </h1>
      <p className="text-muted-foreground max-w-md text-lg">
        Verify invoices before you pay. We check company details, VAT numbers,
        and bank accounts so you can pay with confidence.
      </p>
      <div className="flex gap-4">
        <Link
          href="/auth/login"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2.5 text-sm font-medium"
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="border-input hover:bg-accent rounded-md border px-6 py-2.5 text-sm font-medium"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
