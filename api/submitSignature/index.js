const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    /***********************
     * 1. Validate input
     ***********************/
    const body = req.body;

    if (!body?.fullName || !body?.companyName || !body?.signature) {
      context.res = {
        status: 400,
        body: "Missing required fields"
      };
      return;
    }

    /***********************
     * 2. Load environment
     ***********************/
    const {
      GRAPH_TOKEN,
      SITE_ID,
      LIST_ID,
      SP_LIBRARY_NAME
    } = process.env;

    if (!GRAPH_TOKEN || !SITE_ID || !LIST_ID || !SP_LIBRARY_NAME) {
      context.log.error("Missing environment configuration");
      context.res = { status: 500, body: "Missing Graph configuration" };
      return;
    }

    /***********************
     * 3. Upload signature
     ***********************/
    const base64 = body.signature.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const fileName = `Signature_${body.fullName.replace(/\s+/g, "_")}_${Date.now()}.png`;

    const uploadUrl =
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}` +
      `/drives/root:/${SP_LIBRARY_NAME}/${fileName}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GRAPH_TOKEN}`,
        "Content-Type": "image/png"
      },
      body: buffer
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      context.log.error("Signature upload failed:", text);
      context.res = { status: 500, body: "Signature upload failed" };
      return;
    }

    const uploadedFile = await uploadRes.json();
    const signatureFileUrl = uploadedFile.webUrl;

    /***********************
     * 4. Create list item
     ***********************/
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
        Signature_x0020_File_x0020_URL: signatureFileUrl
      }
    };

    context.log("LIST PAYLOAD:", JSON.stringify(payload, null, 2));

    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GRAPH_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!listRes.ok) {
      const text = await listRes.text();
      context.log.error("List item creation failed:", text);
      context.res = { status: 500, body: "List item creation failed" };
      return;
    }

    const listItem = await listRes.json();

    /***********************
     * 5. Success
     ***********************/
    context.res = {
      status: 200,
      body: {
        message: "Acknowledgement submitted successfully",
        listItemId: listItem.id,
        signatureUrl: signatureFileUrl
      }
    };

  } catch (err) {
    context.log.error("submitSignature error:", err);
    context.res = {
      status: 500,
      body: "Unhandled server error"
    };
  }
};
