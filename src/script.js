window.safetyState = {
  videoCompleted: false,
  signatureCompleted: false
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, type = "info") {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  el.className = `status status-${type}`;
}

window.setStatus = setStatus;

function updateSubmitState() {
  $("submitBtn").disabled = !(
    window.safetyState.videoCompleted &&
    window.safetyState.signatureCompleted
  );
}

window.updateSubmitState = updateSubmitState;

function initVideoGate() {
  const video = $("trainingVideo");
  video.addEventListener("ended", () => {
    window.safetyState.videoCompleted = true;
    setStatus("Video completed. Please sign below.", "success");
    updateSubmitState();
  });
}

function initSignaturePad() {
  const canvas = $("signaturePad");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  const getPos = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = e => {
    drawing = true;
    ctx.beginPath();
    const p = getPos(e);
    ctx.moveTo(p.x, p.y);
  };

  const move = e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    window.safetyState.signatureCompleted = true;
    updateSubmitState();
  };

  const stop = () => drawing = false;

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", stop);
  canvas.addEventListener("mouseleave", stop);

  $("clearSignature").onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.safetyState.signatureCompleted = false;
    updateSubmitState();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initVideoGate();
  initSignaturePad();
  updateSubmitState();
  setStatus("Please watch the video to begin.", "info");
});
