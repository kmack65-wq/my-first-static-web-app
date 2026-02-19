/*************************************************
 * CONFIG
 *************************************************/
const LOGIC_APP_URL =
  "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

// 🔧 DEV MODE — set to false for production
const DEV_BYPASS_VIDEO = true;

/*************************************************
 * GLOBAL STATE (ONE DECLARATION ONLY)
 *************************************************/
const safetyState = {
  videoCompleted: DEV_BYPASS_VIDEO,
  signatureCompleted: false,
  submitting: false
};

/*************************************************
 * DOM HELPERS
 *************************************************/
const $ = id => document.getElementById(id);

/*************************************************
 * FORCE BLUE THEME BACK
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.remove("dark");
  document.body.classList.add("blue-theme");
});

/*************************************************
 * JOB SITES (HARDCODED)
 *************************************************/
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

/*************************************************
 * POPULATE JOB SITES
 *************************************************/
function loadJobSites() {
  const select = $("jobSite");
  if (!select) return;

  select.innerHTML = `<option value="">Select a job site</option>`;
  JOB_SITES.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    select.appendChild(opt);
  });
}

/*************************************************
 * VIDEO GATE
 *************************************************/
function initVideoGate() {
  if (DEV_BYPASS_VIDEO) return;

  const video = $("trainingVideo");
  if (!video) return;

  video.addEventListener("ended", () => {
    safetyState.videoCompleted = true;
    updateSubmitState();
    setStatus("Video completed. Please sign below.", "success");
  });
}

/*************************************************
 * SIGNATURE PAD (SINGLE CONTEXT)
 *************************************************/
let canvas;
let ctx;
let drawing = false;

function initSignaturePad() {
  canvas = $("signaturePad");
  if (!canvas) return;

  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);

  canvas.addEventListener("touchstart", e => startDraw(e.touches[0]), { passive: false });
  canvas.addEventListener("touchmove", e => draw(e.touches[0]), { passive: false });
  canvas.addEventListener("touchend", stopDraw);

  $("clearSignature")?.addEventListener("click", clearSignature);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = 150 * ratio;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";
}

function getPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startDraw(e) {
  drawing = true;
  ctx.beginPath();
  const p = getPoint(e);
  ctx.moveTo(p.x, p.y);
  e.preventDefault();
}

function draw(e) {
  if (!drawing) return;
  const p = getPoint(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  safetyState.signatureCompleted = true;
  updateSubmitState();
}

function stopDraw() {
  drawing = false;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  safetyState.signatureCompleted = false;
  updateSubmitState();
}

/*************************************************
 * SUBMIT BUTTON STATE
 *************************************************/
function updateSubmitState() {
  const btn = $("submitBtn");
  if (!btn) return;

  btn.disabled = !(
    safetyState.videoCompleted &&
    safetyState.signatureCompleted &&
    !safetyState.submitting
  );
}

/*************************************************
 * STATUS UI
 *************************************************/
function setStatus(msg, type = "info") {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  el.className = `status ${type}`;
}

/*************************************************
 * SUCCESS SCREEN
 *************************************************/
function showSuccessScreen() {
  document.querySelector(".container").innerHTML = `
    <div class="success-screen">
      <h1>Submission Complete</h1>
      <p>Thank you. Your safety acknowledgement has been recorded.</p>
      <p>You may now close this page.</p>
    </div>
  `;
}

/*************************************************
 * FORM SUBMIT
 *************************************************/
function initFormSubmit() {
  const form = $("ackForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (safetyState.submitting) return;

    const payload = {
      fullName: $("fullName").value.trim(),
      companyName: $("companyName").value.trim(),
      jobSite: $("jobSite").value,
      phone: $("phone").value.trim(),
      email: $("email").value.trim(),
      signature: canvas.toDataURL("image/png"),
      timestamp: new Date().toISOString()
    };

    if (!payload.fullName || !payload.companyName || !payload.jobSite) {
      setStatus("Please complete all required fields.", "error");
      return;
    }

    try {
      safetyState.submitting = true;
      updateSubmitState();
      setStatus("Submitting acknowledgement…", "info");

      const res = await fetch(LOGIC_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Submit failed");

      showSuccessScreen();

    } catch (err) {
      console.error(err);
      setStatus("Submission failed. Please try again.", "error");
      safetyState.submitting = false;
      updateSubmitState();
    }
  });
}

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  loadJobSites();
  initVideoGate();
  initSignaturePad();
  initFormSubmit();
  updateSubmitState();

  if (DEV_BYPASS_VIDEO) {
    setStatus("DEV MODE: Video check bypassed.", "info");
  } else {
    setStatus("Please watch the video to begin.", "info");
  }
});
