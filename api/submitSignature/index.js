const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const body = req.body;

    const accessToken = process.env.GRAPH_TOKEN;
    const siteId = process.env.SITE_ID;
    const listId = process.env.LIST_ID;

    if (!accessToken || !siteId || !listId) {
      context.res = {
        status: 500,
        body: "Missing Graph configuration"
      };
      return;
    }

    /* ===============================
       1️⃣ CREATE LIST ITEM
       =============================== */

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

    const createResp = await fetch(
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

    if (!createResp.ok) {
      const errText = await createResp.text();
      context.res = {
        status: 500,
        body: `SharePoint item creation failed: ${errText}`
      };
      return;
    }

    const itemJson = await createResp.json();
    const itemId = itemJson.id;

    /* ===============================
       2️⃣ UPLOAD SIGNATURE PNG
       =============================== */

    let signatureUrl = null;

    if (body.signatureImage) {
      const base64Data = body.signatureImage.replace(
        /^data:image\/png;base64,/,
        ""
      );
      const buffer = Buffer.from(base64Data, "base64");

      const safeName = body.fullName.replace(/[^a-z0-9]/gi, "_");
      const fileName = `${safeName}_${Date.now()}.png`;

      const uploadResp = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/Signatures/${fileName}:/content`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "image/png"
          },
          body: buffer
        }
      );

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        context.res = {
          status: 500,
          body: `Signature upload failed: ${errText}`
        };
        return;
      }

      const uploadJson = await uploadResp.json();
      signatureUrl = uploadJson.webUrl;
    }

    /* ===============================
       3️⃣ PATCH LIST ITEM WITH URL
       =============================== */

    if (signatureUrl) {
      const patchResp = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            Signature_x0020_File_x0020_URL: {
              Url: signatureUrl,
              Description: "Signature image"
            }
          })
        }
      );

      if (!patchResp.ok) {
        const errText = await patchResp.text();
        context.res = {
          status: 500,
          body: `Signature URL patch failed: ${errText}`
        };
        return;
      }
    }

    /* ===============================
       4️⃣ SUCCESS RESPONSE
       =============================== */

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        itemId,
        signatureUrl
      }
    };

  } catch (err) {
    context.log.error("submitSignature error:", err);
    context.res = {
      status: 500,
      body: "Unexpected server error"
    };
  }
};
