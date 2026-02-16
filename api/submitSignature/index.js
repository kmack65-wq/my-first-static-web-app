const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    context.log("submitSignature function triggered");

    // -------------------------
    // 1️⃣ Validate environment
    // -------------------------
    const {
      CLIENT_ID,
      CLIENT_SECRET,
      TENANT_ID,
      SP_HOSTNAME,
      SP_SITE_PATH,
      SP_LIST_NAME
    } = process.env;

    if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
      context.log.error("Missing Azure AD configuration");
      context.res = { status: 500, body: "Missing Graph configuration" };
      return;
    }

    if (!SP_HOSTNAME || !SP_SITE_PATH || !SP_LIST_NAME) {
      context.log.error("Missing SharePoint configuration");
      context.res = { status: 500, body: "Missing SharePoint configuration" };
      return;
    }

    // -------------------------
    // 2️⃣ Acquire Graph Token
    // -------------------------
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          scope: "https://graph.microsoft.com/.default",
          client_secret: CLIENT_SECRET,
          grant_type: "client_credentials"
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      context.log.error("Token acquisition failed", tokenData);
      context.res = { status: 500, body: "Failed to acquire Graph token" };
      return;
    }

    const accessToken = tokenData.access_token;

    // -------------------------
    // 3️⃣ Get Site ID
    // -------------------------
    const siteResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SP_HOSTNAME}:${SP_SITE_PATH}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const siteData = await siteResponse.json();

    if (!siteResponse.ok) {
      context.log.error("Failed to get site", siteData);
      context.res = { status: 500, body: "Failed to resolve SharePoint site" };
      return;
    }

    const siteId = siteData.id;

    // -------------------------
    // 4️⃣ Get List ID
    // -------------------------
    const listsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const listsData = await listsResponse.json();

    const list = listsData.value.find(l => l.displayName === SP_LIST_NAME);

    if (!list) {
      context.log.error("List not found");
      context.res = { status: 500, body: "SharePoint list not found" };
      return;
    }

    const listId = list.id;

    // -------------------------
    // 5️⃣ Create List Item
    // -------------------------
    const body = req.body;

    const payload = {
      fields: {
        Title: body.fullName,
        Company_x0020_Name: body.companyName,
        Job_x0020_Site: body.jobSite || null,
        Phone: body.phone || null,
        Email: body.email || null,
        Superintendent: body.superintendent || null,
        Submitted_x0020_At: new Date().toISOString(),
        Acknowledged: true
      }
    };

    const createResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      context.log.error("List item creation failed", createData);
      context.res = { status: 500, body: createData };
      return;
    }

    context.res = {
      status: 200,
      body: { message: "List item created successfully" }
    };

  } catch (err) {
    context.log.error("Unhandled error", err);
    context.res = { status: 500, body: err.message };
  }
};
