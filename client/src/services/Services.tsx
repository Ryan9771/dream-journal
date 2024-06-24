import { Emotion, JournalEntry } from "../util/Types";
import { post } from "../util/util";
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

function getAiResponse(entry: string) {
  const response = "This is a response from the AI";

  return response;
}

async function getLogin(username: string, password: string) {
  const response = await post("/login", {
    username: username,
    password: password,
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem("access_token", data.access_token);
    navigate("/home");
  } else {
    alert("Invalid username or password");
  }
}

async function getEntryData(entryDate: Date): Promise<JournalEntry> {
  const response = await post("/entry", {
    entryDate: entryDate,
  });

  const resEntry: JournalEntry = {
    emotion: Emotion.Neutral,
    text: "",
  };

  if (response.ok) {
    console.log("Entry data fetched");
    const data = await response.json();

    resEntry.emotion = data.emotion;
    resEntry.text = data.text;
  }

  return resEntry;
}
export { getAiResponse, getEntryData, getLogin };
