export enum Emotion {
    Neutral,
    Happy,
    Sad,
    Angry,
    Surprised,
    Stressed,
    Anxious,
    Dissapointed,
    Scared,
    Nervous,
}

export function emotionToString(emotion: Emotion): string {
    switch (emotion) {
        case Emotion.Neutral:
            return "neutral";
        case Emotion.Happy:
            return "happy";
        case Emotion.Sad:
            return "sad";
        case Emotion.Angry:
            return "angry";
        case Emotion.Surprised:
            return "surprised";
        case Emotion.Stressed:
            return "stressed";
        case Emotion.Anxious:
            return "anxious";
        case Emotion.Dissapointed:
            return "dissapointed";
        case Emotion.Scared:
            return "scared";
        case Emotion.Nervous:
            return "nervous";
        default:
            return "neutral";
    }
}

export function stringToEmotion(emotionStr: string): Emotion {
    switch (emotionStr.toLowerCase()) {
        case "neutral":
            return Emotion.Neutral;
        case "happy":
            return Emotion.Happy;
        case "sad":
            return Emotion.Sad;
        case "angry":
            return Emotion.Angry;
        case "surprised":
            return Emotion.Surprised;
        case "stressed":
            return Emotion.Stressed;
        case "anxious":
            return Emotion.Anxious;
        case "dissapointed": 
            return Emotion.Dissapointed;
        case "scared":
            return Emotion.Scared;
        case "nervous":
            return Emotion.Nervous;
        default:
            return Emotion.Neutral; 
    }
}

export interface JournalEntry {
    emotion: Emotion;
    text: string;
}

export enum AuthState {
    Default,
    Login, 
    Signup,
}
