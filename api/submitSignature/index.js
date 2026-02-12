const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const body = req.body;

    const accessToken = process.env.GRAPH_TOKEN;
    const siteId = process.env.SITE_ID;
    const listId = process.env.LIST_ID;

    if (!accessToken || !siteId || !listId) {
      throw new Error("Missing Graph configuration");
    }

    if (!body.fullName || !body.companyName) {
      return {
        status: 400,
        body: "Missing required fields"
      };
    }

    const payload = {
      fields: {
        Title: body.fullName,
        Company_x0020_Name: body.companyName,
        Job_x0020_Site: body.jobSite || null,
        Phone: body.phone || null,
        Email: body.email || null,
        Superintendent: body.superintendent || null,
        Submitted_x0020_At: new Date().toISOString()
        // DO NOT send Acknowledged
      }
    };

    const response = await fetch(
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

    const result = await response.text();

    if (!response.ok) {
      context.log.error("Graph error:", result);
      return {
        status: 500,
        body: result
      };
    }

    return {
      status: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    context.log.error("submitSignature failed:", err.message);
    return {
      status: 500,
      body: err.message
    };
  }
};
