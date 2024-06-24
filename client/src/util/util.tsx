async function post(url = "", data = {}) {
  const response = await fetch(`http://localhost:5000/${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response;
}

export { post };
