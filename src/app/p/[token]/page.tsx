// /p/[token] — homeowner-facing proposal view.
//
// Tokenised, no login required. The page itself is just a server-
// rendered shell that hands off to the client which loads via
// /api/proposals/[token]/load and renders accept/decline.

import { ProposalViewClient } from "./client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProposalPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-cream py-6 sm:py-10 px-3">
      <div className="max-w-3xl mx-auto">
        <ProposalViewClient token={token} />
      </div>
    </main>
  );
}
