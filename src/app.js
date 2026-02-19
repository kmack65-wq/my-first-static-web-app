console.log("app.js loaded");

/*********************************
 * 🔐 LOGIC APP ENDPOINT
 *********************************/
const LOGIC_APP_URL = "PASTE_YOUR_FULL_LOGIC_APP_URL_HERE";

/*********************************
 * INIT
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

  const jobSiteSelect = document.getElementById("jobSite");

  // Populate Job Site dropdown
  allowedJobSites.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    jobSiteSelect.appendChild(opt);
  });

  const getVal = id =>
    document.getElementById(id)?.value?.trim() ?? "";

  let isSubmitting = false;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent double submit
    isSubmitting = true;

    const fullName = getVal("fullName");
    const companyName = getVal("companyName");
    const jobSite = jobSiteSelect.value;
    const phone = getVal("phone");
    const email = getVal("email");

    if (!fullName || !companyName) {
      window.setStatus("Full Name and Company Name are required.", "error");
      isSubmitting = false;
      return;
    }

    if (!jobSite || !allowedJobSites.includes(jobSite)) {
      window.setStatus("Please select a valid Job Site.", "error");
      isSubmitting = false;
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
        timestamp: new Date().toISOString()
      };

      const response = await fetch(LOGIC_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      window.setStatus(
        "Acknowledgement submitted successfully!",
        "success"
      );

      alert("Safety acknowledgement submitted.");

      // Reset form
      form.reset();
      canvas.getContext("2d").clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      window.safetyState.videoCompleted = false;
      window.safetyState.signatureCompleted = false;
      window.updateSubmitState();

    } catch (err) {
      console.error("Submission failed:", err);
      window.setStatus(
        "Submission failed. Please try again.",
        "error"
      );
    }

    isSubmitting = false;
  });
});
