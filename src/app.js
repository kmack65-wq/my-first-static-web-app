const LOGIC_APP_URL = "PASTE_YOUR_LOGIC_APP_URL_HERE";

function showSuccessScreen() {
  document.getElementById("formWrapper").classList.add("hidden");
  document.getElementById("successScreen").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("ackForm");

  const jobSites = [
    "25-129 PHC Cardiac Rehab",
    "25-103 Ajax Memphis",
    "25-120 Blue Cloud Pittsburg",
    "25-116 Harcros Chemical"
  ];

  const jobSiteSelect = document.getElementById("jobSite");
  jobSites.forEach(s => {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    jobSiteSelect.appendChild(o);
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    setStatus("Submitting acknowledgement...", "info");

    const canvas = document.getElementById("signaturePad");

    const payload = {
      fullName: fullName.value.trim(),
      companyName: companyName.value.trim(),
      jobSite: jobSiteSelect.value,
      phone: phone.value.trim(),
      email: email.value.trim(),
      signature: canvas.toDataURL("image/png"),
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(LOGIC_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Submit failed");

      setStatus("Acknowledgement submitted successfully!", "success");
      showSuccessScreen();

    } catch (err) {
      console.error(err);
      setStatus("Submission failed. Please try again.", "error");
    }
  });
});
