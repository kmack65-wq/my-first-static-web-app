// /api/subcontractorAck/index.js
const fetch = require("node-fetch"); // Ensure node-fetch v2 in package.json
const fs = require("fs");
const path = require("path");
const generateReceipt = require("../shared/generateReceipt");

module.exports = async function (context, req) {
  let tmpFilePath = null;

  try {
    const { itemId, fullName, companyName } = req.body || {};

    // ---- Basic payload validation ----
    if (!itemId || !fullName || !companyName) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "text/plain" },
        body: "itemId, fullName, and companyName are required"
      };
      return;
    }

    const {
      TENANT_ID,
      CLIENT_ID,
      CLIENT_SECRET,
      SITE_ID,
      LIST_ID
    } = process.env;

    // ---- Env validation (fail fast) ----
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
    // 1) Get Graph access token
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
      throw withStatus(tokenRes.status, `Token request failed: ${t}`);
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      throw withStatus(500, "Failed to obtain access token (no access_token in response).");
    }

    // =========================
    // 2) Generate receipt PDF
    // =========================
    const { filePath, fileName } = await generateReceipt({
      fullName,
      companyName
    });

    tmpFilePath = filePath; // so we can clean up in finally
    const fileBuffer = fs.readFileSync(filePath);

    // =========================
    // 3) Ensure folders exist
    //    /SafetySignatures/Receipts
    // =========================
    const baseRoot = `https://graph.microsoft.com/v1.0/sites/${encSiteId}/drive/root:`;
    await ensureFolder(accessToken, `${baseRoot}/SafetySignatures`);
    await ensureFolder(accessToken, `${baseRoot}/SafetySignatures/Receipts`);

    // =========================
    // 4) Upload PDF to Drive
    // =========================
    const uploadUrl =
      `https://graph.microsoft.com/v1.0/sites/${encSiteId}` +
      `/drive/root:/SafetySignatures/Receipts/${encodeURIComponent(fileName)}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/pdf"
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errText = await safeText(uploadRes);
      throw withStatus(uploadRes.status, `Upload failed: ${errText}`);
    }

    const uploadJson = await uploadRes.json();
    const receiptUrl = uploadJson.webUrl;

    // =========================
    // 5) Update the SP list item
    //     fields endpoint (PATCH)
    // =========================
    const updateFieldsUrl =
      `https://graph.microsoft.com/v1.0/sites/${encSiteId}` +
      `/lists/${LIST_ID}/items/${itemId}/fields`;

    const patchRes = await fetch(updateFieldsUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // Internal name from your schema
        ReceiptUrlText: receiptUrl
      })
    });

    if (!patchRes.ok) {
      const errText = await safeText(patchRes);
      throw withStatus(patchRes.status, `List update failed: ${errText}`);
    }

    // Success
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { success: true, receiptUrl }
    };

  } catch (err) {
    // Log full error; return status/message upstream
    context.log.error("subcontractorAck error:", err);
    const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    context.res = {
      status,
      headers: { "Content-Type": "text/plain" },
      body: err.message || "Unknown error"
    };
  } finally {
    // Best-effort cleanup
    try {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (cleanupErr) {
      context.log.warn("Failed to cleanup temp file:", cleanupErr);
    }
  }
};

// ---------- Helpers ----------

function withStatus(statusCode, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

async function safeText(res) {
  try { return await res.text(); } catch { return "<no-body>"; }
}

async function ensureFolder(accessToken, rootPlusPath) {
  // rootPlusPath example: ".../drive/root:/SafetySignatures"
  // 1) Try to get the folder (200 => exists)
  const getRes = await fetch(`${rootPlusPath}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (getRes.ok) return; // already exists

  // 2) If not found, create via path children API
  // Create only the last segment under its parent; for nested paths call twice (we do)
  const parts = rootPlusPath.split("/drive/root:/")[1]; // e.g. "SafetySignatures" or "SafetySignatures/Receipts"
  const segs = parts.split("/");

  // Build parent path and folder name
  const folderName = segs[segs.length - 1];
  const parentPath = segs.slice(0, -1).join("/"); // may be ""

  const parentUrl =
    parentPath.length > 0
      ? `${rootPlusPath.split("/drive/root:")[0]}/drive/root:/${parentPath}:/children`
      : `${rootPlusPath.split("/drive/root:")[0]}/drive/root/children`;

  const createRes = await fetch(parentUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "retain"
    })
  });

  if (!createRes.ok && createRes.status !== 409) {
    const t = await safeText(createRes);
    throw withStatus(createRes.status, `Failed to create folder ${folderName}: ${t}`);
  }
}
``