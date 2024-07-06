import getStyle from "../util/Styles";
import DatePicker from "../components/journal/DatePicker";
import EmotionSelector from "../components/journal/EmotionSelector";
import {
  AnalyseButton,
  SaveButton,
  DoneButton,
} from "../components/journal/Buttons";
import { useEffect, useState } from "react";
import { Emotion, JournalEntry } from "../util/Types";
import { useNavigate } from "react-router-dom";
import Ai from "../assets/ai.png";
import {
  getAiResponse,
  getEntryData,
  getSaveEntry,
} from "../services/Services";

function EntrySummary() {
  /* === Entry Text State Management === */
  const [entryText, setEntryText] = useState<string>("");
  const handleEntryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntryText(e.target.value);
  };

  /* === Emotion Related State Management */
  const [emotion, setEmotion] = useState<Emotion>(Emotion.Neutral);
  const handleEmotionChange = (emotion: Emotion) => {
    setEmotion(emotion);
    setEntryEditable(true);
  };

  /* === Date Picker State Management === */
  const [entryDate, setEntryDate] = useState<Date>(new Date());

  /* === Edit buttons state management === */
  const [entryEditable, setEntryEditable] = useState<boolean>(false);

  /* === AI Analysis Related State Managements */
  const [analyseMode, setAnalyseMode] = useState<boolean>(false);

  // TODO: Implement loading status for the ai
  // TODO: Prevent resubmissing the text unless the dream entry changes
  const [aiResponse, setAiResponse] = useState<string>(
    "Analyzing your thoughts..."
  );
  const handleAiResponse = (entry: string) => {
    setAnalyseMode(true);
    getAiResponse({ emotion: emotion, text: entry }).then((response) => {
      setAiResponse(response);
    });
  };

  // TODO: Implement some indicator to show that the entry
  // has been saved

  const handleSave = () => {
    getSaveEntry(entryDate, { emotion: emotion, text: entryText });
    setEntryEditable(false);
  };

  // TODO: Implement a cancel button
  const handleDone = () => {
    getSaveEntry(entryDate, { emotion: emotion, text: entryText });
    setEntryEditable(false);
  };

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
    }
    const fetchEntry = async () => {
      const entryResponse = await getEntryData(entryDate);
      return entryResponse;
    };
    /* Fetches the entry for the day */
    fetchEntry().then((entry: JournalEntry) => {
      setEntryText(entry.text);
      setEmotion(entry.emotion);
      setEntryEditable(false);
    });
  }, [entryDate]);

  return (
    <div className={getStyle(styles, "ctn")}>
      <div className={getStyle(styles, "metadataCtn")}>
        <DatePicker givenDate={entryDate} onChangeDate={setEntryDate} />
        <EmotionSelector
          givenEmotion={emotion}
          onChangeEmotion={handleEmotionChange}
        />
      </div>
      <div className={getStyle(styles, "bodyCtnWrapper")}>
        {analyseMode ? (
          <div className={getStyle(styles, "bodyCtn")}>
            <div className={getStyle(styles, "aiResponseCtn")}>
              <img className="w-24" src={Ai} alt="AI Response Img" />
              <div className="px-5 h-3/4 flex w-full overflow-hidden">
                <p className="text-blue-1 italic">{aiResponse}</p>
              </div>
              <div className={getStyle(styles, "btnsWrapper")}>
                <DoneButton onClick={() => setAnalyseMode(false)} />
              </div>
            </div>
          </div>
        ) : (
          <div className={getStyle(styles, "bodyCtn")}>
            <div
              className={getStyle(styles, "entryCtnWrapper")}
              onClick={() => setEntryEditable(true)}
            >
              <p className={getStyle(styles, "bodyHeading")}>
                Your sanctuary - journal freely:
              </p>
              <textarea
                value={entryText}
                onFocus={() => setEntryEditable(true)}
                onChange={handleEntryChange}
                placeholder="Edit to write how you feel today..."
                className={getStyle(styles, "input")}
                maxLength={2500}
              />
            </div>
            <div className={getStyle(styles, "btnsWrapper")}>
              {!entryEditable ? (
                <AnalyseButton onClick={() => handleAiResponse(entryText)} />
              ) : (
                <div className={getStyle(styles, "editBtnsCtn")}>
                  <DoneButton onClick={handleDone} />
                  <SaveButton onClick={handleSave} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  ctn: [
    "w-full",
    "h-full",
    "flex",
    "flex-col",
    "pt-10",
    "gap-5",
    "bg-blue-1",
    "lg:flex-row",
    "lg:pt-16",
  ],
  metadataCtn: [
    "flex",
    "flex-col",
    "p-4",
    "gap-3",
    "lg:items-center",
    "lg:gap-24",
  ],
  bodyCtnWrapper: [
    "flex",
    "w-full",
    "h-full",
    "px-1",
    "pt-1",
    "md:px-3",
    "lg:px-5",
    "xl:pr-7",
  ],
  bodyCtn: [
    "flex",
    "flex-col",
    "w-full",
    "h-full",
    "px-8",
    "pt-5",
    "bg-peach",
    "rounded-3xl",
  ],
  bodyHeading: ["text-xl", "text-blue-2", "tracking-tight", "lg:text-1xl"],
  btnsWrapper: ["flex", "w-full", "justify-center", "items-center", "h-1/6"],
  entryCtnWrapper: [
    "flex",
    "flex-col",
    "w-full",
    "gap-6",
    "min-h-96",
    "lg:h-5/6",
  ],
  editBtnsCtn: ["flex", "w-full", "items-center", "justify-around"],
  input: [
    "text-blue-1",
    "p-4",
    "rounded-xl",
    "tracking-tight",
    "h-full",
    "resize-none",
    // "overflow-y-auto",
    "leading-5",
    "focus:outline-none",
  ],
  aiResponseCtn: [
    "flex",
    "flex-col",
    "w-full",
    "h-full",
    "gap-6",
    "items-center",
  ],
};

export default EntrySummary;
