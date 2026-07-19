async function post(url = "", data = {}, token = "") {
  const response = await fetch(`http://localhost:5000${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  return response;
}

function dateToDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

export { post, dateToDateString };
