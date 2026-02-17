// /api/subcontractorAck/index.js

const fetch = require("node-fetch"); // node-fetch v2
const fs = require("fs");
const path = require("path");
const { DefaultAzureCredential } = require("@azure/identity");
const generateReceipt = require("../shared/generateReceipt");

module.exports = async function (context, req) {
  let tmpFilePath = null;

  try {
    const { itemId, fullName, companyName } = req.body || {};

    // ---------------------------
    // Basic payload validation
    // ---------------------------
    if (!itemId || !fullName || !companyName) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "text/plain" },
        body: "itemId, fullName, and companyName are required"
      };
      return;
    }

    // ---------------------------
    // SharePoint constants
    // ---------------------------
    const SITE_URL = "https://kadeancc.sharepoint.com/sites/SafetyFormsSite";
    const LIST_TITLE = "Subcontractor Safety Acknowledgements";
    const LIBRARY_PATH = "Shared Documents/SafetySignatures/Receipts";

    // ---------------------------
    // Get Managed Identity token
    // ---------------------------
    const credential = new DefaultAzureCredential();
    const token = await credential.getToken(
      "https://kadeancc.sharepoint.com/.default"
    );

    const authHeaders = {
      Authorization: `Bearer ${token.token}`,
      Accept: "application/json;odata=verbose"
    };

    // ---------------------------
    // Generate receipt PDF
    // ---------------------------
    const { filePath, fileName } = await generateReceipt({
      fullName,
      companyName
    });

    tmpFilePath = filePath;
    const fileBuffer = fs.readFileSync(filePath);

    // ---------------------------
    // Upload PDF to SharePoint
    // ---------------------------
    const uploadUrl =
      `${SITE_URL}/_api/web/GetFolderByServerRelativeUrl('${LIBRARY_PATH}')` +
      `/Files/add(url='${encodeURIComponent(fileName)}',overwrite=true)`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/pdf"
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const t = await safeText(uploadRes);
      throw withStatus(uploadRes.status, `Upload failed: ${t}`);
    }

    const uploadJson = await uploadRes.json();
    const receiptUrl = uploadJson.d.ListItemAllFields.__deferred.uri;

    // ---------------------------
    // Update SharePoint list item
    // ---------------------------
    const updateUrl =
      `${SITE_URL}/_api/web/lists/getbytitle('${LIST_TITLE}')/items(${itemId})`;

    const updateRes = await fetch(updateUrl, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json;odata=verbose",
        "IF-MATCH": "*",
        "X-HTTP-Method": "MERGE"
      },
      body: JSON.stringify({
        ReceiptUrlText: receiptUrl
      })
    });

    if (!updateRes.ok) {
      const errText = await safeText(updateRes);
      throw withStatus(updateRes.status, `List update failed: ${errText}`);
    }

    // ---------------------------
    // Success
    // ---------------------------
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        receiptUrl
      }
    };

  } catch (err) {
    context.log.error("subcontractorAck error:", err);
    const status =
      err.statusCode && Number.isInteger(err.statusCode)
        ? err.statusCode
        : 500;

    context.res = {
      status,
      headers: { "Content-Type": "text/plain" },
      body: err.message || "Unknown error"
    };

  } finally {
    // ---------------------------
    // Cleanup temp file
    // ---------------------------
    try {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (cleanupErr) {
      context.log.warn("Failed to cleanup temp file:", cleanupErr);
    }
  }
};

// ---------------------------
// Helpers
// ---------------------------
function withStatus(statusCode, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "<no-body>";
  }
}
