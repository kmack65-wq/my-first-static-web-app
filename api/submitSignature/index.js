// /api/submitSignature/index.js
const fetch = require("node-fetch"); // Ensure node-fetch v2.x in package.json

module.exports = async function (context, req) {
  try {
    const {
      fullName,
      companyName,
      jobSite,
      phone,
      email,
      superintendent,
      // Optional for later if you wire a signature pad:
      signatureBase64
      // flowType // OMITTED because the list doesn't have a FlowType column
    } = req.body || {};

    // ---- Basic validation (match your UI) ----
    if (!fullName || !companyName) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "text/plain" },
        body: "Full Name and Company Name are required"
      };
      return;
    }

    const { TENANT_ID, CLIENT_ID, CLIENT_SECRET, SITE_ID, LIST_ID } = process.env;

    // ---- Env validation ----
    const missing = [];
    if (!TENANT_ID) missing.push("TENANT_ID");
    if (!CLIENT_ID) missing.push("CLIENT_ID");
    if (!CLIENT_SECRET) missing.push("CLIENT_SECRET");
    if (!SITE_ID) missing.push("SITE_ID");
    if (!LIST_ID) missing.push("LIST_ID");
    if (missing.length) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "text/plain" },
        body: `Missing required environment variables: ${missing.join(", ")}`
      };
      return;
    }

    const encSiteId = encodeURIComponent(SITE_ID);

    // =========================
    // 1) Acquire Graph token
    // =========================
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials"
        })
      }
    );

    if (!tokenRes.ok) {
      const t = await safeText(tokenRes);
      return fail(context, tokenRes.status, `Token request failed: ${t}`);
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return fail(context, 500, "Failed to obtain access token (no access_token in response).");
    }

    // =========================
    // 2) Create list item
    // =========================
    // NOTE: Job_x0020_Site is a CHOICE column with allowTextEntry=false,
    // so 'jobSite' MUST be exactly one of the configured choices.
    const fields = {
      Title: fullName,                            // REQUIRED
      Company_x0020_Name: companyName,            // REQUIRED
      ...(jobSite ? { Job_x0020_Site: jobSite } : {}),
      ...(phone ? { Phone: phone } : {}),
      ...(email ? { Email: email } : {}),
      ...(superintendent ? { Superintendent: superintendent } : {}),
      Submitted_x0020_At: new Date().toISOString(),
      Acknowledged: true
      // Do NOT send FlowType unless the list has that column
    };

    const createItemRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${encSiteId}/lists/${LIST_ID}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields })
      }
    );

    if (!createItemRes.ok) {
      const t = await safeText(createItemRes);
      return fail(context, createItemRes.status, `Create item failed: ${t}`);
    }

    const itemJson = await createItemRes.json();
    const itemId = itemJson?.id;
    if (!itemId) return fail(context, 500, "Create item succeeded but no 'id' returned.");

    // Success
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { itemId }
    };
  } catch (err) {
    context.log.error("submitSignature error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "text/plain" },
      body: err.message || "Unknown error"
    };
  }
};

// ---------- helpers ----------
function fail(context, status, message) {
  context.res = { status, headers: { "Content-Type": "text/plain" }, body: message };
}

async function safeText(res) {
  try { return await res.text(); } catch { return "<no-body>"; }
}