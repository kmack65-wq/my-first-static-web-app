const fetch = require("node-fetch");

/***************************************
 * Get Microsoft Graph Access Token
 ***************************************/
async function getAccessToken() {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Graph configuration");
  }

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      })
    }
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token error: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/***************************************
 * Azure Function Entry
 ***************************************/
module.exports = async function (context, req) {
  try {
    const body = req.body;

    const {
      fullName,
      companyName,
      jobSite,
      phone,
      email,
      superintendent,
      signature
    } = body;

    if (!fullName || !companyName || !signature) {
      context.res = { status: 400, body: "Missing required fields" };
      return;
    }

    const hostname = process.env.SP_HOSTNAME;
    const sitePath = process.env.SP_SITE_PATH;
    const listName = process.env.SP_LIST_NAME;
    const libraryName = process.env.SP_LIBRARY_NAME;

    if (!hostname || !sitePath || !listName || !libraryName) {
      throw new Error("Missing SharePoint configuration");
    }

    const accessToken = await getAccessToken();

    /***************************************
     * Resolve Site ID
     ***************************************/
    const siteRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const siteData = await siteRes.json();
    const siteId = siteData.id;

    /***************************************
     * Resolve List ID
     ***************************************/
    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const listData = await listRes.json();
    const listId = listData.id;

    /***************************************
     * Resolve Drive (Document Library)
     ***************************************/
    const drivesRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const drivesData = await drivesRes.json();
    const drive = drivesData.value.find(d => d.name === libraryName);

    if (!drive) {
      throw new Error("Document library not found");
    }

    const driveId = drive.id;

    /***************************************
     * Upload Signature PNG
     ***************************************/
    const base64Data = signature.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `${fullName.replace(/\s+/g, "_")}_${Date.now()}.png`;

    const uploadRes = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${fileName}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "image/png"
        },
        body: buffer
      }
    );

    const uploadData = await uploadRes.json();
    const fileUrl = uploadData.webUrl;

    /***************************************
     * Create SharePoint List Item
     ***************************************/
    const listItemRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            Title: fullName,
            Company_x0020_Name: companyName,
            Job_x0020_Site: jobSite,
            Phone: phone,
            Email: email,
            Superintendent: superintendent,
            Submitted_x0020_At: new Date().toISOString(),
            Acknowledged: true,
            Signature_x0020_File_x0020_URL: fileUrl
          }
        })
      }
    );

    if (!listItemRes.ok) {
      const err = await listItemRes.text();
      throw new Error(`List item error: ${err}`);
    }

    context.res = {
      status: 200,
      body: {
        message: "Success",
        signatureUrl: fileUrl
      }
    };

  } catch (err) {
    console.error("submitSignature ERROR:", err.message);

    context.res = {
      status: 500,
      body: err.message
    };
  }
};
