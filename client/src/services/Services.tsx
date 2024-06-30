import { Emotion, JournalEntry } from "../util/Types";
import { post } from "../util/util";
import { stringToEmotion, emotionToString } from "../util/Types";

function token() {
  return localStorage.getItem("access_token") || "";
}

function getAiResponse(entry: string) {
  const response = "This is a response from the AI";

  return response;
}

/* 
 Logs in the user and stores the access token in local storage
 */
async function getLogin(username: string, password: string) {
  const response = await post("/login", {
    username: username,
    password: password,
  });

  if (response.ok) {
    const data = await response.json();
    /*
    Recieved Response format:
    {
      message: "string",
      access_token: "string"
    }
    */
    localStorage.setItem("access_token", data.access_token);
    return true;
  } else {
    localStorage.removeItem("access_token");
    alert("Invalid username or password");
    return false;
  }
}

/* Signs the user up */
async function getSignup(username: string, password: string) {
  const response = await post("/signup", {
    username: username,
    password: password,
  });

  const data = await response.json();
  /*
    Recieved Response format:
    {
      message: "string"
    }
    */
  if (response.ok) {
    localStorage.setItem("access_token", data.access_token);
    return true;
  } else {
    alert(data.message);
    localStorage.removeItem("access_token");
    return false;
  }
}

/* 
  Fetches the entry data for the given date
*/
async function getEntryData(entryDate: Date): Promise<JournalEntry> {
  const dateString = entryDate.toISOString().split("T")[0];
  const response = await post("/entry", { date: dateString }, token());

  const resEntry: JournalEntry = {
    emotion: Emotion.Neutral,
    text: "",
  };

  if (response.ok) {
    console.log("Entry data fetched");
    const data = await response.json();

    /*
    Received Response format:
    {
      emotion: "string",
      text: "string"
    }
    */

    // Mapper to map text emotion to enum
    resEntry.emotion = stringToEmotion(data.emotion);
    resEntry.text = data.text;
  } else {
    localStorage.removeItem("access_token");
  }

  return resEntry;
}

async function getSaveEntry(entryDate: Date, entry: JournalEntry) {
  const dateString = entryDate.toISOString().split("T")[0];
  const response = await post(
    "/entry/save",
    {
      date: dateString,
      emotion: emotionToString(entry.emotion),
      text: entry.text,
    },
    token()
  );

  if (response.ok) {
    /* 
    Recieved Response format:
    {
      message: "string"
    }
    */
    console.log("Entry saved");
  } else {
    console.log("Error saving entry");
  }
}

export { getAiResponse, getEntryData, getLogin, getSaveEntry, getSignup };
