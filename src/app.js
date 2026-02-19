// ===== CONFIG =====
const LOGIC_APP_URL =
  "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

// ===== SUCCESS SCREEN =====
function showSuccessScreen() {
  document.getElementById("formWrapper").classList.add("hidden");
  document.getElementById("successScreen").classList.remove("hidden");
}

// ===== MAIN =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("app.js loaded");

  const form = document.getElementById("ackForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    setStatus("Submitting acknowledgement…", "info");

    const canvas = document.getElementById("signaturePad");

    const payload = {
      fullName: document.getElementById("fullName").value.trim(),
      companyName: document.getElementById("companyName").value.trim(),
      jobSite: document.getElementById("jobSite").value,
      phone: document.getElementById("phone").value.trim(),
      email: document.getElementById("email").value.trim(),
      signature: canvas.toDataURL("image/png"),
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(LOGIC_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      setStatus("Submission complete.", "success");
      showSuccessScreen();

    } catch (err) {
      console.error("Submit failed:", err);
      setStatus("Submission failed. Please try again.", "error");
    }
  });
});
