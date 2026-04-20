console.log("app.js loaded");

// =====================
// CONFIG
// =====================
const APP_CONFIG = window.APP_CONFIG || {
  requireVideo: true,
  language: "en"
};

const LOGIC_APP_URL = "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

// =====================
// TRANSLATIONS
// =====================
const TEXT = {
  en: {
    title: "Safety Acknowledgement",
    videoTitle: "Required Safety Video",
    videoStatus: "You must watch the entire video before submitting.",
    videoComplete: "Video completed. Please sign below.",
    fullName: "Full Name",
    companyName: "Company Name",
    jobSite: "Job Site",
    email: "Email",
    phone: "Phone",
    clear: "Clear Signature",
    submit: "Submit Acknowledgement",
    footer: "By submitting this form, you confirm completion of the required safety training.",
    successTitle: "Submission Complete",
    successMessage: "Submission complete. Please screenshot this screen."
  },
  es: {
    title: "Confirmación de Seguridad",
    videoTitle: "Video de Seguridad Requerido",
    videoStatus: "Debe ver el video completo antes de enviar.",
    videoComplete: "Video completado. Por favor firme abajo.",
    fullName: "Nombre Completo",
    companyName: "Nombre de la Empresa",
    jobSite: "Lugar de Trabajo",
    email: "Correo Electrónico",
    phone: "Teléfono",
    clear: "Borrar Firma",
    submit: "Enviar Confirmación",
    footer: "Al enviar este formulario, usted confirma que completó la capacitación de seguridad requerida.",
    successTitle: "Envío Completo",
    successMessage: "Envío completo. Por favor tome una captura de pantalla."
  }
};

const t = TEXT[APP_CONFIG.language] || TEXT.en;

// =====================
// JOB SITES
// =====================
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
  "26-107 Beck Flavors",
  "RMMC CO",
  "Fondren Surgical Suites"
];

let videoCompleted = false;
let isDrawing = false;
let canvas, ctx;

document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  populateJobSites();
  setupVideo();
  setupSignaturePad();
  setupSubmit();

  const phoneInput = document.getElementById("phone");

  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      const input = e.target;

      const cursorPosition = input.selectionStart;
      const previousLength = input.value.length;

     const formatted = formatPhone(input.value);
      input.value = formatted;

      const newLength = formatted.length;
      const diff = newLength - previousLength;
      const newCursor = Math.max(cursorPosition + diff, 0);

      input.setSelectionRange(newCursor, newCursor);
    });
  }
});

// =====================
// APPLY TRANSLATIONS
// =====================
function applyTranslations() {
  document.title = t.title;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("pageTitle", t.title);
  set("videoTitle", t.videoTitle);
  set("videoStatus", t.videoStatus);
  set("labelFullName", t.fullName);
  set("labelCompany", t.companyName);
  set("labelJobSite", t.jobSite);
  set("labelEmail", t.email);
  set("labelPhone", t.phone);
  set("clearSignature", t.clear);
  set("submitButton", t.submit);
  set("footerNote", t.footer);
  set("successTitle", t.successTitle);
  set("successMessage", t.successMessage);
}

// =====================
// JOB SITE DROPDOWN
// =====================
function populateJobSites() {
  const select = document.getElementById("jobSite");
  if (!select) return;

  JOB_SITES.forEach(site => {
    const opt = document.createElement("option");
    opt.value = site;
    opt.textContent = site;
    select.appendChild(opt);
  });
}

// =====================
// PHONE AUTO-FORMAT
// =====================
function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));

  return parts.join("-");
}

// =====================
// VIDEO TRACKING
// =====================
function setupVideo() {
  const video = document.getElementById("safetyVideo");
  const status = document.getElementById("videoStatus");

  if (!APP_CONFIG.requireVideo) {
    videoCompleted = true;
    if (video) video.style.display = "none";
    if (status) status.style.display = "none";
    return;
  }

  if (video) {
    video.addEventListener("ended", () => {
      videoCompleted = true;
      if (status) status.textContent = t.videoComplete;
    });
  }
}

// =====================
// SIGNATURE PAD
// =====================
function setupSignaturePad() {
  canvas = document.getElementById("signatureCanvas");
  if (!canvas) return;

  ctx = canvas.getContext("2d");
  resizeCanvas();

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);

  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", stopDraw);

  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = 160;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";
}

function getPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const evt = e.touches ? e.touches[0] : e;
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function startDraw(e) {
  isDrawing = true;
  ctx.beginPath();
  const pos = getPosition(e);
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPosition(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDraw() {
  isDrawing = false;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// =====================
// SUBMIT
// =====================
function setupSubmit() {
  document
    .getElementById("ackForm")
    .addEventListener("submit", submitForm);

  document
    .getElementById("clearSignature")
    .addEventListener("click", clearSignature);
}

async function submitForm(e) {
  e.preventDefault();

  if (APP_CONFIG.requireVideo && !videoCompleted) {
    alert(t.videoStatus);
    return;
  }

  const payload = {
    fullName: document.getElementById("fullName").value,
    companyName: document.getElementById("companyName").value,
    jobSite: document.getElementById("jobSite").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    signature: canvas.toDataURL("image/png"),
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(LOGIC_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Submission error:", err);
  }

  showSuccessScreen();
}

// =====================
// SUCCESS SCREEN
// =====================
function showSuccessScreen() {
  const formWrapper = document.getElementById("formWrapper");
  const successScreen = document.getElementById("successScreen");
  const submissionTime = document.getElementById("submissionTime");

  submissionTime.textContent =
    new Date().toLocaleString();

  formWrapper.classList.add("hidden");
  successScreen.classList.remove("hidden");

  successScreen.scrollIntoView({ behavior: "smooth" });
}
