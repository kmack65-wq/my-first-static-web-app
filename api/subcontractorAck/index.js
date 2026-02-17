// /api/subcontractorAck/index.js

import fetch from "node-fetch";
import fs from "fs";
import { DefaultAzureCredential } from "@azure/identity";
import generateReceipt from "../shared/generateReceipt.js";

export default async function (context, req) {
  let tmpFilePath = null;

  try {
    // ---------------------------
    // Parse body safely
    // ---------------------------
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { itemId, fullName, companyName } = body || {};

    if (!itemId || !fullName || !companyName) {
      context.res = {
        status: 400,
        body: "itemId, fullName, and companyName are required"
      };
      return;
    }

    // ---------------------------
    // ENV VARS (REQUIRED)
    // ---------------------------
    const {
      SITE_ID,
      LIST_ID,
      DRIVE_ID
    } = process.env;

    if (!SITE_ID || !LIST_ID || !DRIVE_ID) {
      context.res = {
        status: 500,
        body: "Missing SITE_ID, LIST_ID, or DRIVE_ID"
      };
      return;
    }

    // ---------------------------
    // Get Graph token via Managed Identity
    // ---------------------------
    const credential = new DefaultAzureCredential();
    const token = await credential.getToken("https://graph.microsoft.com/.default");

    const headers = {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json"
    };

    // ---------------------------
    // Generate receipt PDF
    // ---------------------------
    const { filePath, fileName } = await generateReceipt({ fullName, companyName });
    tmpFilePath = filePath;
    const fileBuffer = fs.readFileSync(filePath);

    // ---------------------------
    // Upload PDF to document library
    // Path: /SafetySignatures/Receipts/
    // ---------------------------
    const uploadUrl =
      `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}` +
      `/root:/SafetySignatures/Receipts/${encodeURIComponent(fileName)}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/pdf"
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const t = await uploadRes.text();
      throw new Error(`Upload failed: ${t}`);
    }

    const uploadJson = await uploadRes.json();
    const receiptUrl = uploadJson.webUrl;

    // ---------------------------
    // Update SharePoint list item
    // ---------------------------
    const updateUrl =
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}` +
      `/lists/${LIST_ID}/items/${itemId}/fields`;

    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        ReceiptUrlText: receiptUrl
      })
    });

    if (!updateRes.ok) {
      const t = await updateRes.text();
      throw new Error(`List update failed: ${t}`);
    }

    // ---------------------------
    // Success
    // ---------------------------
    context.res = {
      status: 200,
      body: {
        success: true,
        receiptUrl
      }
    };

  } catch (err) {
    context.log.error("subcontractorAck error:", err);
    context.res = {
      status: 500,
      body: err.message
    };
  } finally {
    try {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch {}
  }
}
