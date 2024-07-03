from openai import OpenAI
from dotenv import dotenv_values
from util.prompts import analysis_prompt

# from prompts import analysis_prompt

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
            {"role": "user", "content": query},
        ],
    )

    response_message = response.choices[0].message.content

    return response_message


def get_ai_analysis(text: str, emotion: str):
    """
    Handles the metadata and entry text to get an analysis.
    """
    if not text.strip():
        return "Hmm, seems like you haven't written up an entry!"
    ai_analysis = _send_to_ai(text, emotion)

    return ai_analysis


if __name__ == "__main__":
    print(get_ai_analysis("I was walking in the park", "happy"))
