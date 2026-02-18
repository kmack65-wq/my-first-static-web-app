console.log("app.js loaded");

/*********************************
 * CONFIG
 *********************************/
const LOGIC_APP_URL =
  "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

/*********************************
 * APP LOGIC
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("ackForm");
  if (!form) return;

  const allowedJobSites = [
    "25-129 PHC Cardiac Rehab",
    "25-103 Ajax Memphis",
    "25-120 Blue Cloud Pittsburg",
    "24-116 BS-MOB 2 / Addition",
    "25-131 Eagle Point Expansion",
    "25-116 Harcros Chemical",
    "25-127 Alton Memorial SLCH Therapy",
    "25-126 Blue Cloud Toledo",
    "25-114 Mapletree Corp",
    "364 Logistics Center",
    "25-132 Blue Cloud Charlotte",
    "25-134 Blue Cloud Reno",
    "25-105 MBMC Switchgear",
    "25-111 PHC Power Plant",
    "23-159 BJH CPAP Renovation/ Change Order",
    "25-130 Kuna Freezer Expansion",
    "25-121 ABC Supply",
    "RMMC CO",
    "Fondren Surgical Suites"
  ];

  // Populate Job Site dropdown
  const jobSiteSelect = document.getElementById("jobSite");
  allowedJobSites.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    jobSiteSelect.appendChild(opt);
  });

  const getVal = id =>
    document.getElementById(id)?.value?.trim() ?? "";

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const fullName = getVal("fullName");
    const companyName = getVal("companyName");
    const jobSite = jobSiteSelect.value;
    const phone = getVal("phone");
    const email = getVal("email");

    if (!fullName || !companyName) {
      window.setStatus("Full Name and Company Name are required.", "error");
      return;
    }

    if (!jobSite || !allowedJobSites.includes(jobSite)) {
      window.setStatus("Please select a valid Job Site.", "error");
      return;
    }

    try {
      window.setStatus("Submitting acknowledgement...", "info");

      const canvas = document.getElementById("signaturePad");
      const signature = canvas.toDataURL("image/png");

      const payload = {
        fullName,
        companyName,
        jobSite,
        phone,
        email,
        signature,
        acknowledged: true,
        submittedAt: new Date().toISOString()
      };

      const res = await fetch(LOGIC_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      window.setStatus("Acknowledgement submitted successfully!", "success");
      alert("Safety acknowledgement submitted.");

      form.reset();
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      window.safetyState.videoCompleted = false;
      window.safetyState.signatureCompleted = false;
      window.updateSubmitState();

    } catch (err) {
      console.error(err);
      window.setStatus("Submission failed. Please try again.", "error");
    }
  });
});
