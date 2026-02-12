const axios = require("axios");

module.exports = async function (context, req) {
  try {
    // 🔐 Validate API key
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.INTAKE_API_KEY) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const {
      fullName,
      companyName,
      jobSite,
      phone,
      email,
      signatureBase64
    } = req.body;

    if (!fullName || !companyName || !jobSite || !signatureBase64) {
      context.res = { status: 400, body: "Missing required fields" };
      return;
    }

    // 🔑 Get Microsoft Graph access token
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      })
    );

    const accessToken = tokenResponse.data.access_token;

    const graphHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    };

    // 📝 Create SharePoint List item
    const listResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/sites/${process.env.SP_HOSTNAME}:${process.env.SP_SITE_PATH}:/lists/${process.env.SP_LIST_NAME}/items`,
      {
        fields: {
          Title: fullName,
          CompanyName: companyName,
          JobSite: jobSite,
          Phone: phone,
          Email: email
        }
      },
      { headers: graphHeaders }
    );

    // ✍️ Upload signature image to SharePoint Library
    const imageBuffer = Buffer.from(
      signatureBase64.replace(/^data:image\/png;base64,/, ""),
      "base64"
    );

    const safeName = fullName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${safeName}_${Date.now()}.png`;

    await axios.put(
      `https://graph.microsoft.com/v1.0/sites/${process.env.SP_HOSTNAME}:${process.env.SP_SITE_PATH}:/drives/${process.env.SP_LIBRARY_NAME}/root:/${fileName}:/content`,
      imageBuffer,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "image/png"
        }
      }
    );

    context.res = {
      status: 200,
      body: { success: true }
    };

  } catch (error) {
    console.error("Submission error:", error.response?.data || error.message);
    context.res = {
      status: 500,
      body: "Server error"
    };
  }
};
