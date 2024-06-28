import getStyle from "../util/Styles";
import DatePicker from "../components/journal/DatePicker";
import EmotionSelector from "../components/journal/EmotionSelector";
import {
  AnalyseButton,
  SaveButton,
  DoneButton,
} from "../components/journal/Buttons";
import { stringToEmotion } from "../util/Types";
import { useEffect, useState } from "react";
import { Emotion, JournalEntry } from "../util/Types";
import { useNavigate } from "react-router-dom";
import Ai from "../assets/ai.png";
import { getAiResponse, getEntryData } from "../services/Services";

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
  const [aiResponse, setAiResponse] = useState<string>(
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Elit ullamcorper dignissim cras tincidunt lobortis feugiat. Elit pellentesque habitant morbi tristique senectus. Et sollicitudin ac orci phasellus egestas tellus rutrum. Mattis pellentesque id nibh tortor id. Viverra adipiscing at in tellus. Feugiat nisl pretium fusce id velit ut tortor pretium viverra. Sed nisi lacus sed viverra tellus in hac habitasse. Pharetra massa massa ultricies mi quis hendrerit dolor magna eget. Ac tortor dignissim convallis aenean et. Nibh tortor id aliquet lectus proin. Duis ultricies lacus sed turpis tincidunt id. Faucibus et molestie ac feugiat sed lectus vestibulum. Vel eros donec ac odio tempor orci dapibus ultrices. Fermentum dui faucibus in ornare quam viverra orci sagittis eu. Pretium quam vulputate dignissim suspendisse in. Interdum consectetur libero id faucibus nisl tincidunt eget nullam non. Tristique magna sit amet purus. Urna id volutpat lacus laoreet non.

    Ipsum dolor sit amet consectetur. Nisl nunc mi ipsum faucibus vitae aliquet nec ullamcorper. Tellus pellentesque eu tincidunt tortor aliquam. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Viverra orci sagittis eu volutpat odio facilisis mauris sit. Pretium lectus quam id leo in vitae turpis. Dolor sit amet consectetur adipiscing elit pellentesque habitant. At volutpat diam ut venenatis tellus in metus. Neque gravida in fermentum et sollicitudin. Iaculis at erat pellentesque adipiscing commodo elit. Sed arcu non odio euismod lacinia. Nam libero justo laoreet sit amet cursus. Risus feugiat in ante metus. Et tortor consequat id porta.`
  );
  const handleAiResponse = (entry: string) => {
    setAnalyseMode(true);
    const response: string = getAiResponse(entry);
    setAiResponse(response);
  };

  const handleSave = () => {
    setEntryEditable(true);
  };

  const handleDone = () => {
    setEntryEditable(false);
  };

  const navigate = useNavigate();

  useEffect(() => {
    console.log("Fetching Access token");
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
    }

    // const fetchEntry = async () => {
    //   console.log("Getting entry data");
    //   const entryResponse = await getEntryData(entryDate);
    //   console.log("Entry data fetched:");
    //   console.log(entryResponse);
    //   return entryResponse;
    // };

    // /* Fetches the entry for the day */
    // const entry = fetchEntry();
    // entry.then((entry: JournalEntry) => {
    //   setEntryText(entry.text);
    //   setEmotion(entry.emotion);
    // });
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
              <div className="px-5 flex w-full overflow-hidden">
                <p className="text-blue-1 italic overflow-y-scroll">
                  {aiResponse}
                </p>
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
                maxLength={800}
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
    "lg:pt-12",
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
    "p-1",
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
  entryCtnWrapper: ["flex", "flex-col", "w-full", "gap-6", "h-5/6"],
  editBtnsCtn: ["flex", "w-full", "items-center", "justify-around"],
  input: [
    "text-blue-1",
    "p-4",
    "rounded-xl",
    "tracking-tight",
    "h-full",
    "overflow-y-auto",
    "leading-5",
    "focus:outline-none",
  ],
  aiResponseCtn: ["flex", "flex-col", "w-full", "gap-6", "items-center"],
};
export default EntrySummary;
