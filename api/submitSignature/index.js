/**
 * api/submitSignature/index.js
 * Azure Static Web Apps Function (Node.js)
 *
 * Creates a SharePoint List item and uploads a signature PNG to a SharePoint library,
 * then patches the list item with the signature file URL.
 *
 * Required env vars:
 *  TENANT_ID
 *  CLIENT_ID
 *  CLIENT_SECRET
 *  SP_HOSTNAME           e.g. kadeancc.sharepoint.com
 *  SP_SITE_PATH          e.g. /sites/SafetyFormsSite
 *  SP_LIST_NAME          e.g. Subcontractor Compliance Records (or your actual list display name)
 *  SP_LIBRARY_NAME       e.g. Subcontractor Signatures
 */

const { v4: uuidv4 } = require("uuid");

// Node 18+ has global fetch. If your runtime doesn't, add: npm i node-fetch and uncomment below.
// const fetch = require("node-fetch");

function json(resStatus, body) {
  return {
    status: resStatus,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function stripDataUrl(dataUrl) {
  // Accepts "data:image/png;base64,AAAA..."
  const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) return null;
  return { mime: match[1].toLowerCase(), b64: match[2] };
}

function safeTrim(v) {
  return typeof v === "string" ? v.trim() : "";
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

async function graphFetch(url, accessToken, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && data.error && data.error.message) ||
      (typeof data === "string" ? data : JSON.stringify(data)) ||
      `Graph error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.graph = data;
    throw err;
  }

  return data;
}

async function getAppAccessToken(tenantId, clientId, clientSecret) {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const form = new URLSearchParams();
  form.append("client_id", clientId);
  form.append("client_secret", clientSecret);
  form.append("grant_type", "client_credentials");
  form.append("scope", "https://graph.microsoft.com/.default");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const msg =
      data.error_description ||
      data.error ||
      `Token acquisition failed (${res.status})`;
    throw new Error(msg);
  }

  return data.access_token;
}

async function resolveSiteId(hostname, sitePath, accessToken) {
  // GET /sites/{hostname}:{server-relative-path}
  const url = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
  const site = await graphFetch(url, accessToken, { method: "GET" });
  return site.id;
}

async function resolveListId(siteId, listDisplayName, accessToken) {
  // Find list by displayName (safer than hardcoding GUID while you iterate)
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$select=id,displayName`;
  const lists = await graphFetch(url, accessToken, { method: "GET" });

  const found = (lists.value || []).find(
    (l) => (l.displayName || "").toLowerCase() === listDisplayName.toLowerCase()
  );
  if (!found) {
    const available = (lists.value || []).map((l) => l.displayName).join(", ");
    throw new Error(
      `List not found: "${listDisplayName}". Available: ${available}`
    );
  }
  return found.id;
}

async function resolveDriveId(siteId, libraryDisplayName, accessToken) {
  // Libraries are Drives in Graph
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives?$select=id,name,driveType`;
  const drives = await graphFetch(url, accessToken, { method: "GET" });

  const found = (drives.value || []).find(
    (d) => (d.name || "").toLowerCase() === libraryDisplayName.toLowerCase()
  );
  if (!found) {
    const available = (drives.value || []).map((d) => d.name).join(", ");
    throw new Error(
      `Library/Drive not found: "${libraryDisplayName}". Available: ${available}`
    );
  }
  return found.id;
}

function buildSignatureFileName({ jobSite, fullName }) {
  // Safe-ish filename for SharePoint
  const safe = (s) =>
    (s || "")
      .replace(/[\\/:*?"<>|#%{}~&]/g, "") // remove illegal-ish chars
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `SafetyAck_${safe(jobSite) || "JobSite"}_${safe(fullName) || "Name"}_${ts}.png`;
}

async function uploadSignaturePngToDrive({
  driveId,
  folderPath = "",
  filename,
  pngBuffer,
  accessToken,
}) {
  // PUT /drives/{driveId}/root:/{path}/{filename}:/content
  const encodedPath = folderPath
    ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${filename}`
    : filename;

  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURIComponent(
    encodedPath
  )}:/content`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/png",
    },
    body: pngBuffer,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && data.error && data.error.message) ||
      (typeof data === "string" ? data : JSON.stringify(data)) ||
      `Upload failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.graph = data;
    throw err;
  }

  // data is driveItem
  return data;
}

module.exports = async function (context, req) {
  const corr = req.headers?.["x-ms-client-request-id"] || uuidv4();

  try {
    // ---- Config
    const TENANT_ID = requireEnv("TENANT_ID");
    const CLIENT_ID = requireEnv("CLIENT_ID");
    const CLIENT_SECRET = requireEnv("CLIENT_SECRET");
    const SP_HOSTNAME = requireEnv("SP_HOSTNAME");
    const SP_SITE_PATH = requireEnv("SP_SITE_PATH");
    const SP_LIST_NAME = "Subcontractor Safety Acknowledgements";
    const SP_LIBRARY_NAME = requireEnv("SP_LIBRARY_NAME");

    // ---- Parse/validate input
    const body = req.body || {};
    const fullName = safeTrim(body.fullName);
    const companyName = safeTrim(body.companyName);
    const jobSite = safeTrim(body.jobSite);
    const phone = safeTrim(body.phone);
    const email = safeTrim(body.email);
    const superintendent = safeTrim(body.superintendent);
    const signatureDataUrl = body.signature; // data URL expected

    if (!fullName || !companyName) {
      return json(400, {
        correlationId: corr,
        error: "fullName and companyName are required.",
      });
    }
    if (!jobSite) {
      return json(400, {
        correlationId: corr,
        error: "jobSite is required.",
      });
    }
    if (!signatureDataUrl) {
      return json(400, {
        correlationId: corr,
        error: "signature (data URL) is required.",
      });
    }

    const sig = stripDataUrl(signatureDataUrl);
    if (!sig || sig.mime !== "image/png") {
      return json(400, {
        correlationId: corr,
        error:
          "signature must be a PNG data URL like data:image/png;base64,...",
      });
    }

    const pngBuffer = Buffer.from(sig.b64, "base64");
    if (!pngBuffer || pngBuffer.length < 50) {
      return json(400, {
        correlationId: corr,
        error: "signature PNG looks empty/corrupt.",
      });
    }

    // ---- Token
    const accessToken = await getAppAccessToken(
      TENANT_ID,
      CLIENT_ID,
      CLIENT_SECRET
    );

    // ---- Resolve IDs
    const siteId = await resolveSiteId(SP_HOSTNAME, SP_SITE_PATH, accessToken);
    const listId = await resolveListId(siteId, SP_LIST_NAME, accessToken);
    const driveId = await resolveDriveId(siteId, SP_LIBRARY_NAME, accessToken);

    // ---- 1) Create list item (no signature URL yet)
    // IMPORTANT: must match Graph Explorer shape: { fields: { ... } }
    const submittedAtIso = new Date().toISOString();

    const createPayload = {
      fields: {
        Title: fullName,
        Company_x0020_Name: companyName,
        Job_x0020_Site: jobSite,
        Phone: phone || undefined,
        Email: email || undefined,
        Superintendent: superintendent || undefined,
        Submitted_x0020_At: submittedAtIso,
        Acknowledged: true,
      },
    };

    // Remove undefined fields so SharePoint doesn't choke on them
    for (const k of Object.keys(createPayload.fields)) {
      if (createPayload.fields[k] === undefined) delete createPayload.fields[k];
    }

    context.log(
      `[${corr}] Creating list item payload: ${JSON.stringify(createPayload)}`
    );

    const createdItem = await graphFetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
      accessToken,
      { method: "POST", body: JSON.stringify(createPayload) }
    );

    const itemId = createdItem.id;

    // ---- 2) Upload signature PNG to library
    const filename = buildSignatureFileName({ jobSite, fullName });

    // Optional: put in a folder inside the library (e.g. "signatures")
    const folderPath = ""; // e.g. "signatures"

    const uploaded = await uploadSignaturePngToDrive({
      driveId,
      folderPath,
      filename,
      pngBuffer,
      accessToken,
    });

    const signatureWebUrl = uploaded.webUrl;

    context.log(
      `[${corr}] Uploaded signature: ${filename} => ${signatureWebUrl}`
    );

    // ---- 3) Patch list item fields with Signature URL
    // NOTE: Patch the /fields endpoint for the item.
    const patchPayload = {
      Signature_x0020_File_x0020_URL: signatureWebUrl,
    };

    await graphFetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`,
      accessToken,
      { method: "PATCH", body: JSON.stringify(patchPayload) }
    );

    // Done
    return json(200, {
      correlationId: corr,
      ok: true,
      listItemId: itemId,
      signatureUrl: signatureWebUrl,
      submittedAt: submittedAtIso,
      listWebUrl: createdItem.webUrl,
    });
  } catch (err) {
    // Normalize error output
    const status = err.status && Number.isInteger(err.status) ? err.status : 500;

    // Log full details server-side
    context.log.error(
      `submitSignature failed: ${err.message}`,
      err.graph ? JSON.stringify(err.graph) : ""
    );

    return json(status, {
      correlationId:
        req.headers?.["x-ms-client-request-id"] || "no-correlation-id",
      ok: false,
      error: err.message || "Unknown error",
      graph: err.graph?.error
        ? {
            code: err.graph.error.code,
            message: err.graph.error.message,
          }
        : undefined,
    });
  }
};  


