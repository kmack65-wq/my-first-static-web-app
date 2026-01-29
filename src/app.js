// app.js - Only handles form submission, not UI state
console.log("app.js LOADED");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("ackForm");
  
  if (!form) {
    console.error("ackForm not found");
    return;
  }

  // SharePoint dropdown validation
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

  const setStatus = (msg, type = "info") => {
    const statusEl = document.getElementById("status");
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `status-${type}`;
  };

  const getVal = (id) => document.getElementById(id)?.value?.trim() ?? "";

  // Main submit handler
  form.addEventListener("submit", async (e) => {
    // Note: The form guard in script.js already validated video/signature
    
    // Additional validation
    const fullName = getVal("fullName");
    const companyName = getVal("companyName");
    const jobSite = document.getElementById("jobSite")?.value || "";
    const phone = getVal("phone");
    const email = getVal("email");
    const superintendent = getVal("superintendent");

    if (!fullName || !companyName) {
      setStatus("Full Name and Company Name are required.", "error");
      alert("Full Name and Company Name are required.");
      e.preventDefault();
      return;
    }

    if (!jobSite || !allowedJobSites.includes(jobSite)) {
      setStatus("Please select a valid Job Site from the list.", "error");
      alert("Please select a valid Job Site.");
      e.preventDefault();
      return;
    }

    try {
      setStatus("Submitting your acknowledgement...", "info");
      
      // Get signature as data URL
      const canvas = document.getElementById("signaturePad");
      const signatureData = canvas.toDataURL("image/png");
      
      // Prepare submission data
      const formData = {
        fullName,
        companyName,
        jobSite,
        phone,
        email,
        superintendent,
        signature: signatureData,
        timestamp: new Date().toISOString(),
        videoCompleted: window.safetyState?.videoCompleted || false,
        signatureCompleted: window.safetyState?.signatureCompleted || false
      };

      console.log("Submitting form data:", { ...formData, signature: '...' });
      
      // Submit to API
      const submitRes = await fetch("/api/submitSignature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        throw new Error(`submitSignature ${submitRes.status}: ${errText}`);
      }

      const result = await submitRes.json();
      console.log("API Response:", result);

      setStatus("Acknowledgement submitted successfully!", "success");
      alert("Safety acknowledgement submitted successfully!");
      
      // Reset form
      form.reset();
      document.getElementById("superintendent").value = "";
      
      // Clear signature
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Reset state
      if (window.safetyState) {
        window.safetyState.videoCompleted = false;
        window.safetyState.signatureCompleted = false;
      }
      
      // Disable submit button
      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
      }
      
      setStatus("Form reset. You may submit another acknowledgement.", "info");
      
    } catch (err) {
      console.error("SUBMIT FAILED", err);
      setStatus(`Submission failed: ${err.message}`, "error");
      alert("Submission failed. Please try again or contact support.");
    }
  });
});