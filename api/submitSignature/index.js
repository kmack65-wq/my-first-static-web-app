const fetch = require("node-fetch");
const { getAccessToken } = require("../shared/auth");

module.exports = async function (context, req) {
  try {
    const body = req.body;

    if (!body?.fullName || !body?.companyName || !body?.signatureUrl) {
      context.res = {
        status: 400,
        body: "Missing required fields"
      };
      return;
    }

    const token = await getAccessToken();

    const siteId = process.env.SP_SITE_ID;
    const listId = process.env.SP_LIST_ID;

    const payload = {
      fields: {
        Title: body.fullName,
        Company_x0020_Name: body.companyName,
        Job_x0020_Site: body.jobSite || null,
        Phone: body.phone || null,
        Email: body.email || null,
        Superintendent: body.superintendent || null,
        Submitted_x0020_At: new Date().toISOString(),
        Acknowledged: true,
        Signature_x0020_File_x0020_URL: body.signatureUrl
      }
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      context.log.error("Graph error:", data);
      context.res = {
        status: 500,
        body: data
      };
      return;
    }

    context.res = {
      status: 200,
      body: {
        message: "Signature submitted successfully",
        itemId: data.id
      }
    };
  } catch (err) {
    context.log.error("submitSignature failed", err);
    context.res = {
      status: 500,
      body: err.message
    };
  }
};
