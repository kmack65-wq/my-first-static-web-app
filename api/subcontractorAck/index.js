export default async function (context, req) {

  context.log("RAW BODY:", req.rawBody);
  context.log("REQ BODY:", req.body);
  context.log("HEADERS:", req.headers);

  let body = req.body;

  if (!body && req.rawBody) {
    try {
      body = JSON.parse(req.rawBody);
    } catch (e) {
      context.log("JSON parse failed:", e.message);
      body = {};
    }
  }

  context.log("FINAL BODY:", body);

  const { itemId, fullName, companyName } = body || {};

  if (!itemId || !fullName || !companyName) {
    context.res = {
      status: 400,
      body: {
        error: "Missing required fields",
        received: body
      }
    };
    return;
  }

import fetch from "node-fetch";
import fs from "fs";
import { DefaultAzureCredential } from "@azure/identity";

export default async function (context, req) {
  try {
    // 🔍 Parse body safely
    let body = req.body;

if (!body) {
  try {
    body = JSON.parse(req.rawBody);
  } catch {
    body = {};
  }
}

context.log("Parsed body:", body);

const { itemId, fullName, companyName } = body;


    if (!fullName || !companyName) {
      context.res = {
        status: 400,
        body: { error: "Missing required fields: fullName, companyName" }
      };
      return;
    }

    // 🌍 ENV VARS
    const SITE_ID = process.env.SP_SITE_ID;
    const LIST_ID = process.env.SP_LIST_ID;

    if (!SITE_ID || !LIST_ID) {
      context.res = {
        status: 500,
        body: { error: "Missing SP_SITE_ID or SP_LIST_ID" }
      };
      return;
    }

    // 🔐 Managed Identity → Graph token
    const credential = new DefaultAzureCredential();
    const token = await credential.getToken("https://graph.microsoft.com/.default");

    // 📝 Create SharePoint list item
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            Title: fullName,
            Company_x0020_Name: companyName
          }
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = await response.json();

    context.res = {
      status: 201,
      body: {
        success: true,
        itemId: data.id
      }
    };

  } catch (err) {
    context.log.error("Function error:", err);
    context.res = {
      status: 500,
      body: err.message
    };
  }
}


