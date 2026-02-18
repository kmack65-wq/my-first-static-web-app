const axios = require("axios");

module.exports = async function (context, req) {
  context.log("subcontractorAck function triggered");

  try {
    const body = req.body;

    // ✅ Validate required fields (MATCHES YOUR REAL PAYLOAD)
    if (!body || !body.fullName || !body.companyName) {
      context.log.warn("Missing required fields", body);
      context.res = {
        status: 400,
        body: { error: "Missing required fields: fullName, companyName" }
      };
      return;
    }

    // 🔐 ENV VARIABLES
    const SITE_ID = process.env.SITE_ID;
    const LIST_ID = process.env.LIST_ID;

    if (!SITE_ID || !LIST_ID) {
      throw new Error("Missing SITE_ID or LIST_ID environment variables");
    }

    // 🔑 Get Graph token via Managed Identity
    const tokenResponse = await axios.get(
      "http://169.254.169.254/metadata/identity/oauth2/token",
      {
        params: {
          "api-version": "2018-02-01",
          resource: "https://graph.microsoft.com"
        },
        headers: {
          Metadata: "true"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    context.log("Managed Identity token acquired");

    // 📝 Create SharePoint list item
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`;

    const spResponse = await axios.post(
      graphUrl,
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

    context.log("SharePoint item created", spResponse.data.id);

    context.res = {
      status: 201,
      body: {
        message: "Subcontractor acknowledgement saved",
        itemId: spResponse.data.id
      }
    };

  } catch (err) {
    context.log.error(
      "subcontractorAck failed",
      err.response?.data || err.message
    );

    context.res = {
      status: 500,
      body: {
        error: "Failed to write to SharePoint",
        details: err.response?.data || err.message
      }
    };
  }
};
