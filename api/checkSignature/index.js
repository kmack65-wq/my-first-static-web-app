const axios = require("axios");

module.exports = async function (context, req) {
  try {
    const { fullName, company } = req.body || {};

    if (!fullName || !company) {
      context.res = {
        status: 400,
        body: { error: "Missing fullName or company" }
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
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    const accessToken = tokenRes.data.access_token;

    // 🔍 Query SharePoint list items
    const listRes = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items?$expand=fields`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const items = listRes.data.value || [];

    const match = items.find(item =>
      item.fields?.Title === fullName &&
      item.fields?.Company_x0020_Name === company
    );

    context.res = {
      status: 200,
      body: {
        signed: !!match,
        itemId: match ? match.id : null
      }
    };

  } catch (err) {
    context.log.error(
      "checkSignature error:",
      err.response?.data || err.message
    );

    context.res = {
      status: 500,
      body: { error: "Failed to check signature" }
    };
  }
};
