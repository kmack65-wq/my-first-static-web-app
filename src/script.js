/*********************************
 * GLOBAL STATE
 *********************************/
const safetyState = {
  videoCompleted: false,
  signatureCompleted: false
};

window.safetyState = safetyState;

/*********************************
 * HELPERS
 *********************************/
const $ = id => document.getElementById(id);

function setStatus(msg, type = "info") {
  const el = document.getElementById("status");

  if (!el) {
    console.warn("Status element not found yet.");
    return;
  }

  el.textContent = msg;
  el.className = `status ${type}`;
}

window.updateSubmitState = updateSubmitState;

/*********************************
 * VIDEO GATING (HTML5)
 *********************************/
function initVideoGate() {
  const video = $("trainingVideo");
  if (!video) return;

  video.addEventListener("ended", () => {
    safetyState.videoCompleted = true;
    setStatus("Video completed. Please sign below.", "success");
    updateSubmitState();
  });
}

/*********************************
 * SIGNATURE PAD (WHITE + MOBILE)
 *********************************/
function initSignaturePad() {
  const canvas = $("signaturePad");
  const clearBtn = $("clearSignature");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let drawing = false;

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

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const getPoint = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = e => {
    drawing = true;
    ctx.beginPath();
    const p = getPoint(e);
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  };

  const move = e => {
    if (!drawing) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    safetyState.signatureCompleted = true;
    updateSubmitState();
  };

  const stop = () => (drawing = false);

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", stop);
  canvas.addEventListener("mouseleave", stop);

  canvas.addEventListener("touchstart", e => start(e.touches[0]), { passive: false });
  canvas.addEventListener("touchmove", e => move(e.touches[0]), { passive: false });
  canvas.addEventListener("touchend", stop);

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    safetyState.signatureCompleted = false;
    updateSubmitState();
    setStatus("Signature cleared. Please sign again.", "info");
  });
}

/*********************************
 * FORM GUARD
 *********************************/
function initFormGuard() {
  const form = $("ackForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    if (!safetyState.videoCompleted || !safetyState.signatureCompleted) {
      e.preventDefault();
    }
  });
}

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
  initVideoGate();
  initSignaturePad();
  initFormGuard();
  updateSubmitState();
  setStatus("Please watch the video to begin.", "info");
});
