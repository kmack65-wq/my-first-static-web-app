const axios = require("axios");

module.exports = async function (context, req) {
  context.log("subcontractorAck triggered");

  try {
    const body = req.body;

    // ✅ CORRECT VALIDATION
    if (!body || !body.fullName || !body.companyName) {
      context.log.warn("Invalid request body", body);
      context.res = {
        status: 400,
        body: { error: "Missing required fields: fullName, companyName" }
      };
      return;
    }

    const SITE_ID = process.env.SITE_ID;
    const LIST_ID = process.env.LIST_ID;

    if (!SITE_ID || !LIST_ID) {
      throw new Error("Missing SITE_ID or LIST_ID env vars");
    }

    // 🔑 Managed Identity token
    const tokenResponse = await axios.get(
      "http://169.254.169.254/metadata/identity/oauth2/token",
      {
        params: {
          "api-version": "2018-02-01",
          resource: "https://graph.microsoft.com"
        },
        headers: { Metadata: "true" }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    context.log("Managed Identity token acquired");

    // 📝 Graph call (MATCHES YOUR SUCCESSFUL TEST)
    const graphResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`,
      {
        fields: {
          Title: body.fullName,
          Company_x0020_Name: body.companyName,
          Acknowledged: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    context.log("Item created", graphResponse.data.id);

    context.res = {
      status: 201,
      body: {
        message: "Acknowledgement saved",
        itemId: graphResponse.data.id
      }
    };

  } catch (err) {
    context.log.error("subcontractorAck failed", err.response?.data || err.message);
    context.res = {
      status: 500,
      body: err.response?.data || err.message
    };
  }
};
