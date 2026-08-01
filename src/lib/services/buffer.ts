// Buffer GraphQL API client — thin wrapper for the daily social
// agent (/api/cron/social-agent).
//
// Buffer replaced their v1 REST API with a GraphQL endpoint at
// https://api.buffer.com. Every request is a POST with a Bearer
// token. Docs: https://developers.buffer.com
//
// We only use two operations:
//   - listChannels():  discover connected profile IDs at cold start
//   - createPost():    publish immediately to a single channel
//
// Channel IDs are cached in-module for the lifetime of the Vercel
// function invocation (they change so rarely that even the daily
// cron pays a negligible startup cost).

const BUFFER_ENDPOINT = "https://api.buffer.com";

export type BufferService =
  | "twitter"
  | "facebook"
  | "linkedin"
  | "instagram";

export interface BufferChannel {
  id: string;
  name: string;
  service: BufferService;
  organizationId: string;
}

interface BufferGraphQLError {
  message: string;
  path?: string[];
}

interface BufferGraphQLResponse<T> {
  data?: T;
  errors?: BufferGraphQLError[];
}

// One place to derive the auth token so the fail-loud check
// happens at the call site, not inside GraphQL error handling.
function requireToken(): string {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "BUFFER_ACCESS_TOKEN is not set. Add it to Vercel env before running the social agent.",
    );
  }
  return token;
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = requireToken();
  const res = await fetch(BUFFER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Buffer API returned HTTP ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as BufferGraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `Buffer GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }
  if (!json.data) {
    throw new Error("Buffer GraphQL response had no data field");
  }
  return json.data;
}

// ─── Channel discovery ────────────────────────────────────────────

interface AccountResponse {
  account: {
    organizations: Array<{
      id: string;
      channels: Array<{
        id: string;
        name: string;
        service: string;
      }>;
    }>;
  };
}

let channelCache: BufferChannel[] | null = null;

/**
 * Fetch all channels connected to the authenticated Buffer account.
 * Cached in-module for the lifetime of the Node process — Vercel
 * cron invocations pay one round-trip per run, other callers
 * (manual triggers, tests) piggyback the same cache.
 *
 * `service` values Buffer returns include: "twitter", "facebook",
 * "linkedin", "instagram", "threads", "pinterest", "tiktok",
 * "bluesky", "youtube", "mastodon", "shopify". We only care about
 * the first four; consumers filter on `BufferService`.
 */
export async function listChannels(force = false): Promise<BufferChannel[]> {
  if (channelCache && !force) return channelCache;
  const data = await graphql<AccountResponse>(
    `query GetChannels {
      account {
        organizations {
          id
          channels {
            id
            name
            service
          }
        }
      }
    }`,
  );
  const flat: BufferChannel[] = [];
  for (const org of data.account.organizations) {
    for (const c of org.channels) {
      flat.push({
        id: c.id,
        name: c.name,
        service: c.service as BufferService,
        organizationId: org.id,
      });
    }
  }
  channelCache = flat;
  return flat;
}

/**
 * Look up the channel id for a given service.
 *
 * Resolution order:
 *   1. Env override — BUFFER_CHANNEL_LINKEDIN etc. If set, used
 *      verbatim. Zero API round-trip, immune to Buffer scope
 *      restrictions on account.organizations. This is the primary
 *      path Jim uses.
 *   2. Fallback — call listChannels() and match on service. Only
 *      works if the Buffer token has organizations-read scope.
 *
 * Returns null if the platform isn't connected (env unset AND API
 * has no matching channel).
 */
const ENV_KEY: Record<BufferService, string> = {
  linkedin: "BUFFER_CHANNEL_LINKEDIN",
  twitter: "BUFFER_CHANNEL_TWITTER",
  facebook: "BUFFER_CHANNEL_FACEBOOK",
  instagram: "BUFFER_CHANNEL_INSTAGRAM",
};

export async function findChannelId(
  service: BufferService,
): Promise<string | null> {
  const envValue = process.env[ENV_KEY[service]];
  if (envValue && envValue.trim().length > 0) return envValue.trim();
  const channels = await listChannels();
  const match = channels.find((c) => c.service === service);
  return match?.id ?? null;
}

// ─── Post creation ────────────────────────────────────────────────

// Buffer's createPost returns a union type — success or error
// variants. The GraphQL client must use inline fragments to query
// each variant separately. `__typename` tells us which variant
// we got back.
interface CreatePostSuccess {
  __typename: "PostActionSuccess";
  post: {
    id: string;
    status: string;
    sentAt: string | null;
  } | null;
}

interface CreatePostError {
  __typename: string;
  message?: string;
  code?: string;
}

interface CreatePostResponse {
  createPost: CreatePostSuccess | CreatePostError;
}

export interface CreatePostArgs {
  channelId: string;
  /** Body text. Include the destination URL inline — Buffer parses
   *  links from text on every service. */
  text: string;
}

export interface CreatePostResult {
  id: string;
  status: string;
  sentAt: string | null;
}

/**
 * Create a post AND publish it immediately (`mode: shareNow`).
 * Buffer returns the post row with a status like "sent" once
 * the platform accepts it — actual live-on-platform confirmation
 * is asynchronous, but a returned id means Buffer took ownership.
 */
export async function createPost(
  args: CreatePostArgs,
): Promise<CreatePostResult> {
  const data = await graphql<CreatePostResponse>(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess {
          post {
            id
            status
            sentAt
          }
        }
        ... on InvalidInputError {
          message
          field
          validationErrors {
            field
            message
          }
        }
        ... on NotFoundError { message }
        ... on UnauthorizedError { message }
        ... on UnexpectedError { message }
        ... on RestProxyError { message }
        ... on LimitReachedError { message }
      }
    }`,
    {
      input: {
        channelId: args.channelId,
        text: args.text,
        // ShareMode enum: valid values TBD (introspecting). "shareNow"
        // is what Buffer's docs example shows; may need to be lowercase
        // like the other enums.
        mode: "shareNow",
        // SchedulingType enum: "automatic" | "notification" (lowercase,
        // per introspection). "automatic" = Buffer publishes on the
        // user's behalf directly to the platform.
        schedulingType: "automatic",
        // Both required (NON_NULL in the schema) even for shareNow.
        needsApproval: false,
        assets: [],
      },
    },
  );
  const payload = data.createPost;
  if (payload.__typename !== "PostActionSuccess") {
    // Union variant we haven't modelled — surface the whole payload
    // so the runbook can see what Buffer actually returned.
    throw new Error(
      `Buffer createPost returned ${payload.__typename}: ${JSON.stringify(payload)}`,
    );
  }
  const post = (payload as CreatePostSuccess).post;
  if (!post) {
    throw new Error("Buffer PostActionSuccess had null post");
  }
  return post;
}
