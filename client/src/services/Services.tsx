import { Emotion, JournalEntry } from "../util/Types";
import { post, encryptData, decryptData } from "../util/util";
import { stringToEmotion, emotionToString } from "../util/Types";

function token() {
  return localStorage.getItem("access_token") || "";
}

/* 
 Logs in the user and stores the access token in local storage
 */
async function getLogin(username: string, password: string) {
  const response = await post("/login", {
    username: username,
    password: encryptData(password),
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
    console.log("\n===== Access token created! =====\n");
    console.log(data.access_token);
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
    password: encryptData(password),
  });

  const data = await response.json();
  /*
    Recieved Response format:
    {
      message: "string"
    }
    */
  if (response.ok) {
    localStorage.setItem("access_token", decryptData(data.access_token));
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
  if (!token()) {
    console.log("No token found");
  }
  const dateString = entryDate.toISOString().split("T")[0];
  const response = await post(
    "/entry",
    { date: dateString },
    localStorage.getItem("access_token") || ""
  );

  const resEntry: JournalEntry = {
    emotion: Emotion.Neutral,
    text: "",
  };

  if (response.ok) {
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
    resEntry.text = decryptData(data.text);
  } else {
    localStorage.removeItem("access_token");
    console.log("Failed to fetch entry");
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
      text: encryptData(entry.text),
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
    alert("Failed to save entry");
    console.log("Error saving entry");
  }
}

async function getAiResponse(entry: JournalEntry) {
  const text = entry.text;
  const emotion = emotionToString(entry.emotion);

  const response = await post(
    "/entry/ai",
    { text: text, emotion: emotion },
    token()
  );

  if (response.ok) {
    const data = await response.json();
    /* 
    Recieved Response format:
      Success:
      {
        analysis: "string"
      } 
      Failure:
      {
        message: "string"
      }
  */
    return data.analysis;
  } else {
    console.log("Failed to get AI response");
    return "Failed to fetch from endpoint";
  }
}

export { getAiResponse, getEntryData, getLogin, getSaveEntry, getSignup };
