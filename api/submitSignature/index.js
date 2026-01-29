const fetch = require("node-fetch");

module.exports = async function (context, req) {
  const body = req.body;

  const accessToken = process.env.GRAPH_TOKEN;
  const siteId = process.env.SITE_ID;
  const listId = process.env.LIST_ID;

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

  const resp = await fetch(
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

  if (!resp.ok) {
    context.res = { status: 500, body: "SharePoint write failed" };
    return;
  }

  context.res = { status: 200 };
};
