/*********************************
 * GLOBAL STATE
 *********************************/
window.safetyState = {
  videoCompleted: false,
  signatureCompleted: false
};

/*********************************
 * LOGIC APP CONFIG
 *********************************/
const LOGIC_APP_URL =
  "https://prod-12.northcentralus.logic.azure.com:443/workflows/bdc21a12c859424288de6c5438494284/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DGjs243f1qFfe7a27mH3jV6PejuwsjYSOoFvtQR8JZQ";

/*********************************
 * HELPERS
 *********************************/
function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, type = "info") {
  const el = $("status");
  if (!el) return;

  el.textContent = msg;
  el.className = `status status-${type}`;
}

/*********************************
 * SUBMIT BUTTON STATE
 *********************************/
function updateSubmitState() {
  const btn = $("submitBtn");
  if (!btn) return;

  btn.disabled = !(
    window.safetyState.videoCompleted &&
    window.safetyState.signatureCompleted
  );
}

// expose globally
window.updateSubmitState = updateSubmitState;

/*********************************
 * VIDEO COMPLETION (HTML5)
 *********************************/
function initVideoGate() {
  const video = $("trainingVideo");
  if (!video) return;

  video.addEventListener("ended", () => {
    window.safetyState.videoCompleted = true;
    setStatus("Video completed. Please sign below.", "success");
    updateSubmitState();
  });
}

/*********************************
 * SIGNATURE PAD (WHITE PEN + MOBILE)
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
    ctx.strokeStyle = "#ffffff"; // white pen
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function getPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function start(e) {
    drawing = true;
    ctx.beginPath();
    const p = getPoint(e);
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  }

  function move(e) {
    if (!drawing) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    window.safetyState.signatureCompleted = true;
    updateSubmitState();
  }

  function stop() {
    drawing = false;
  }

  // Mouse
  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", stop);
  canvas.addEventListener("mouseleave", stop);

  // Touch
  canvas.addEventListener("touchstart", e => start(e.touches[0]), { passive: false });
  canvas.addEventListener("touchmove", e => move(e.touches[0]), { passive: false });
  canvas.addEventListener("touchend", stop);

  // Clear
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.safetyState.signatureCompleted = false;
      updateSubmitState();
      setStatus("Signature cleared. Please sign again.", "info");
    });
  }
}

/*********************************
 * LOGIC APP SUBMISSION
 *********************************/
async function submitAcknowledgement({ fullName, companyName }) {
  const payload = {
    fullName,
    companyName,
    acknowledged: true
  };

  const response = await fetch(LOGIC_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Submission failed");
  }
}

/*********************************
 * FORM GUARD + SUBMIT
 *********************************/
function initFormGuard() {
  const form = $("ackForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (
      !window.safetyState.videoCompleted ||
      !window.safetyState.signatureCompleted
    ) {
      setStatus("Please complete the video and signature.", "error");
      return;
    }

    const fullName = $("fullName")?.value?.trim();
    const companyName = $("companyName")?.value?.trim();

    if (!fullName || !companyName) {
      setStatus("Please enter your full name and company.", "error");
      return;
    }

    try {
      setStatus("Submitting acknowledgement…", "info");
      $("submitBtn").disabled = true;

      await submitAcknowledgement({ fullName, companyName });

      setStatus("Acknowledgement submitted successfully ✔", "success");
      form.reset();
    } catch (err) {
      console.error(err);
      setStatus("Submission failed. Please try again.", "error");
      $("submitBtn").disabled = false;
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
