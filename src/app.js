console.log("app.js loaded");

/*********************************
 * CONFIG
 *********************************/
const LOGIC_APP_URL =
  "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

// ⚠️ DEV ONLY — set to false for production
const DEV_SKIP_VIDEO = true;

/*********************************
 * JOB SITES (HARDCODED)
 *********************************/
const JOB_SITES = [
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

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
  initJobSites();
  initSignaturePadOnce();
  initFormSubmit();
});

/*********************************
 * JOB SITE DROPDOWN
 *********************************/
function initJobSites() {
  const select = document.getElementById("jobSite");
  if (!select) return;

  select.innerHTML = `<option value="">Select a job site</option>`;

  JOB_SITES.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    select.appendChild(opt);
  });
}

/*********************************
 * SIGNATURE PAD (SAFE INIT)
 *********************************/
let signatureInitialized = false;

function initSignaturePadOnce() {
  if (signatureInitialized) return;
  signatureInitialized = true;

  const canvas = document.getElementById("signaturePad");
  const clearBtn = document.getElementById("clearSignature");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let drawing = false;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = 150 * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ffffff";
  }

  resize();
  window.addEventListener("resize", resize);

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e) {
    drawing = true;
    ctx.beginPath();
    const p = getPos(e);
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  }

  function move(e) {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    window.safetyState.signatureCompleted = true;
    window.updateSubmitState();
  }

  function stop() {
    drawing = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", stop);
  canvas.addEventListener("mouseleave", stop);

  canvas.addEventListener("touchstart", e => start(e.touches[0]), { passive: false });
  canvas.addEventListener("touchmove", e => move(e.touches[0]), { passive: false });
  canvas.addEventListener("touchend", stop);

  clearBtn?.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.safetyState.signatureCompleted = false;
    window.updateSubmitState();
  });
}

/*********************************
 * FORM SUBMIT
 *********************************/
function initFormSubmit() {
  const form = document.getElementById("ackForm");
  if (!form) return;

  if (DEV_SKIP_VIDEO) {
    window.safetyState.videoCompleted = true;
    window.updateSubmitState();
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    try {
      const canvas = document.getElementById("signaturePad");

      const payload = {
        fullName: fullName.value.trim(),
        companyName: companyName.value.trim(),
        jobSite: jobSite.value,
        phone: phone.value.trim(),
        email: email.value.trim(),
        signature: canvas.toDataURL("image/png"),
        timestamp: new Date().toISOString()
      };

      const res = await fetch(LOGIC_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Submit failed");

      document.querySelector(".container").innerHTML = `
        <div class="success-screen">
          <h1>Submission Complete</h1>
          <p>Your safety acknowledgement has been received.</p>
          <p class="small">You may now close this page.</p>
        </div>
      `;
    } catch (err) {
      console.error(err);
      window.setStatus("Submission failed. Please try again.", "error");
    }
  });
}
