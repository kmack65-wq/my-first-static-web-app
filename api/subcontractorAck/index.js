const axios = require("axios");

module.exports = async function (context, req) {
  try {
    const body = req.body;

    if (!body?.fullName || !body?.companyName) {
      return context.res = {
        status: 400,
        body: { error: "Missing required fields" }
      };
    }

    const SITE_ID = process.env.SITE_ID;
    const LIST_ID = process.env.LIST_ID;

    // 🔑 Get token using Managed Identity
    const tokenResponse = await axios.get(
      "http://169.254.169.254/metadata/identity/oauth2/token",
      {
        params: {
          resource: "https://graph.microsoft.com",
          api_version: "2018-02-01"
        },
        headers: {
          Metadata: "true"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 📝 Create list item
    const spResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`,
      {
        fields: {
          Title: body.fullName,
          Company_x0020_Name: body.companyName,
          Acknowledged: body.acknowledged ?? true,
          Job_x0020_Site: body.jobSite || "",
          Email: body.email || "",
          Phone: body.phone || "",
          Superintendent: body.superintendent || ""
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    context.res = {
      status: 201,
      body: { success: true, itemId: spResponse.data.id }
    };

  } catch (err) {
    context.log.error(err.response?.data || err.message);
    context.res = {
      status: 500,
      body: { error: "Failed to write to SharePoint" }
    };
  }
};
