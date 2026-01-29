const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const { itemId, receiptUrl } = req.body || {};

    if (!itemId || !receiptUrl) {
      context.res = {
        status: 400,
        body: "itemId and receiptUrl are required"
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

    // 🔐 Get Graph access token
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

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    // 🔗 PATCH list item FIELDS (this matters)
    const patchUrl =
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}` +
      `/lists/${LIST_ID}/items/${itemId}/fields`;

    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ReceiptUrl: {
          Url: receiptUrl,
          Description: "Signed safety acknowledgement"
        }
      })
    });

    if (!patchRes.ok) {
      const errorText = await patchRes.text();
      throw new Error(`PATCH failed: ${errorText}`);
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "ReceiptUrl updated successfully"
      }
    };

  } catch (err) {
    context.log.error(err);
    context.res = {
      status: 500,
      body: err.message
    };
  }
};
