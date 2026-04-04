const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = "https://api.hubapi.com";

/**
 * Create or update a HubSpot contact when a lead provides their email
 * or a new user account is created.
 */
export async function upsertHubSpotContact(params: {
  email: string;
  source: "lead" | "user";
  firstName?: string;
  lastName?: string;
}) {
  if (!HUBSPOT_API_KEY) {
    console.warn("HUBSPOT_API_KEY not set — skipping HubSpot sync");
    return null;
  }

  const { email, source, firstName, lastName } = params;

  const properties: Record<string, string> = {
    email,
    lifecyclestage: source === "lead" ? "lead" : "customer",
    hs_lead_status: source === "lead" ? "NEW" : "CONNECTED",
  };

  if (firstName) properties.firstname = firstName;
  if (lastName) properties.lastname = lastName;

  try {
    // Try to create the contact
    const createRes = await fetch(`${BASE_URL}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({ properties }),
    });

    if (createRes.ok) {
      const data = await createRes.json();
      console.log(`HubSpot: Created contact for ${email} (${source})`, data.id);
      return data;
    }

    // If conflict (409), contact already exists — update instead
    if (createRes.status === 409) {
      const updateRes = await fetch(
        `${BASE_URL}/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify({ properties }),
        }
      );

      if (updateRes.ok) {
        const data = await updateRes.json();
        console.log(`HubSpot: Updated contact for ${email} (${source})`, data.id);
        return data;
      }

      const errText = await updateRes.text().catch(() => "");
      console.error("HubSpot update error:", updateRes.status, errText);
      return null;
    }

    const errText = await createRes.text().catch(() => "");
    console.error("HubSpot create error:", createRes.status, errText);
    return null;
  } catch (err) {
    console.error("HubSpot sync error:", err);
    return null;
  }
}
