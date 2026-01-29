document.getElementById("ackForm").addEventListener("submit", async e => {
  e.preventDefault();

  const payload = {
    fullName: fullName.value,
    companyName: companyName.value,
    jobSite: jobSite.value,
    phone: phone.value,
    email: email.value,
    superintendent: superintendent.value
  };

  const res = await fetch("/api/submitSignature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert("Submission failed.");
    return;
  }

  alert("Acknowledgement submitted successfully.");
  location.reload();
});
