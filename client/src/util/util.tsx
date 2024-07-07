import CryptoJs from "crypto-js";

function get_encryption_key() {
  if (!process.env.REACT_APP_ENCRYPTION_KEY) {
    console.log("NO REACT APP ENCRYPTION KEY FOUND");
  }

  return process.env.REACT_APP_ENCRYPTION_KEY || "";
}

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

function encryptData(data: string) {
  const cipherText = CryptoJs.AES.encrypt(
    data,
    get_encryption_key()
  ).toString();

  return cipherText;
}

function decryptData(data: string) {
  const bytes = CryptoJs.AES.decrypt(data, get_encryption_key());
  const originalText = bytes.toString(CryptoJs.enc.Utf8);

  return originalText;
}

export { post, encryptData, decryptData };
