from openai import OpenAI
from dotenv import dotenv_values
from util.prompts import analysis_prompt

secret = dotenv_values(".env")

client = OpenAI(api_key=secret["OPENAI_API_KEY"])


def _send_to_ai(text: str, emotion: str):
    """
    Formats the text to send to the model.
    """
    query = f"""
    Dream Description: {text}

    Emotion they tagged this dream: {emotion}
    """
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": analysis_prompt},
            {"role": "user", "content": text},
        ],
    )
    response_message = response.choices[0].message

    return response_message


def get_analysis(text: str, emotion: str):
    """
    Handles the metadata and entry text to get an analysis.
    """
    if not text.strip():
        return "Hmm, seems like you haven't written up an entry!"
    ai_analysis = _send_to_ai(text, emotion)

    return ai_analysis
