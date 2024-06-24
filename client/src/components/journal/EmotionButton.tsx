import { useCallback } from "react";
import getStyle from "../../util/Styles";
import { Emotion, emotionToString } from "../../util/Types";
import Happy from "../../assets/emojis/happy.png";
import Sad from "../../assets/emojis/sad.png";
import Neutral from "../../assets/emojis/neutral.png";
import Stressed from "../../assets/emojis/stressed.png";
import Angry from "../../assets/emojis/angry.png";
import Surprised from "../../assets/emojis/surprised.png";
import Dissapointed from "../../assets/emojis/dissapointed.png";
import Nervous from "../../assets/emojis/nervous.png";
import Anxious from "../../assets/emojis/anxious.png";
import Scared from "../../assets/emojis/scared.png";

interface Props {
    clickHandler: (emotion: Emotion) => void;
    chosenEmotion: Emotion;
    emotion: Emotion;
}

function EmotionButton({ clickHandler, chosenEmotion, emotion }: Props) {
    const Image = useCallback(() => {
        switch(emotion) {
            case Emotion.Happy:
                return (
                    <img src={Happy} className={getStyle(styles, "img")} />
                );
            case Emotion.Sad:
                return (
                    <img src={Sad} className={getStyle(styles, "img")} />
                );
            case Emotion.Angry:
                return (
                    <img src={Angry} className={getStyle(styles, "img")} />
                );
            case Emotion.Surprised:
                return (
                    <img src={Surprised} className={getStyle(styles, "img")} />
                )
            case Emotion.Dissapointed:
                return (
                    <img src={Dissapointed} className={getStyle(styles, "img")} />
                )
            case Emotion.Nervous:
                return (
                    <img src={Nervous} className={getStyle(styles, "img")} />
                )
            case Emotion.Anxious:
                return (
                    <img src={Anxious} className={getStyle(styles, "img")} />
                )
            case Emotion.Stressed:
                return (
                    <img src={Stressed} className={getStyle(styles, "img")} />
                )
            case Emotion.Neutral:
                return (
                    <img src={Neutral} className={getStyle(styles, "img")} />
                )
            case Emotion.Scared:
                return (
                    <img src={Scared} className={getStyle(styles, "img")} />
                )
            default:
                return (
                    <img src={Neutral} className={getStyle(styles, "img")} />
                )
        }
    }, [chosenEmotion, emotion])

    return (
        <div onClick={() => clickHandler(emotion)} className={chosenEmotion === emotion ? getStyle(styles, "ctnSelected") : getStyle(styles, "ctnDefault")}>
            <Image />
            <p className={chosenEmotion === emotion ? getStyle(styles, "txtSelected") : getStyle(styles, "txtDefault")}>{emotionToString(emotion)}</p>
        </div>
    );
}

const styles = {
    ctnDefault: [
        "flex",
        "flex-shrink-0",
        "flex-col",
        "justify-center",
        "items-center",
        "rounded-lg",
        "bg-blue-2",
        "shadow-md",
        "cursor-pointer",
        "pb-1",
        "hover:bg-blue-3",
        "px-1",
    ],
    ctnSelected: [
        "flex",
        "flex-shrink-0",
        "flex-col",
        "justify-center",
        "items-center",
        "rounded-lg",
        "bg-white",
        "shadow-md",
        "cursor-pointer",
        "pb-1",
        "px-1",
    ],
    img: [
        "w-14",
        "h-14",
        "md:w-16",
        "md:h-16",
        "lg:w-20",
        "lg:h-20"
    ],
    txtDefault: [
        "text-peach",
        "text-sm",
    ],
    txtSelected: [
        "text-black",
        "text-sm",
    ],

}

export default EmotionButton;