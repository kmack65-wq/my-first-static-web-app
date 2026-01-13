module.exports = async function (context, req) {
  try {
    const {
      fullName,
      companyName,
      jobSite,
      phone,
      email,
      signature
    } = req.body || {};

    // Basic validation
    if (!fullName || !companyName || !jobSite || !phone || !email || !signature) {
      context.res = {
        status: 400,
        body: { error: "Missing required fields" }
      };
      return;
    }

    // TEMP: log submission (you’ll see this in Azure logs)
    context.log("New submission received:", {
      fullName,
      companyName,
      jobSite,
      phone,
      email,
      signatureLength: signature.length
    });

    // ✅ SUCCESS RESPONSE
    context.res = {
      status: 200,
      body: { success: true }
    };

  } catch (err) {
    context.log.error("Submission error:", err);

    context.res = {
      status: 500,
      body: { error: "Server error" }
    };
  }
};
