import { Emotion, JournalEntry } from "../util/Types";
import { post } from "../util/util";
import { stringToEmotion } from "../util/Types";

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
    return true;
  } else {
    alert("Invalid username or password");
    return false;
  }
}

async function getEntryData(entryDate: Date): Promise<JournalEntry> {
  const dateString = entryDate.toISOString().split("T")[0];
  const response = await post("/entry", {
    entryDate: dateString,
  });

  const resEntry: JournalEntry = {
    emotion: Emotion.Neutral,
    text: "",
  };

  if (response.ok) {
    console.log("Entry data fetched");
    const data = await response.json();

    // Mapper to map text emotion to enum
    resEntry.emotion = stringToEmotion(data.emotion);
    resEntry.text = data.text;
  }

  return resEntry;
}
export { getAiResponse, getEntryData, getLogin };
