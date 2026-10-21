import { NextRequest, NextResponse } from "next/server";

const LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  hinglish: "hi-IN",
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sarvam API key not configured" }, { status: 500 });
  }

  try {
    const { text, language = "en" } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Truncate to 1000 chars (Sarvam REST TTS limit)
    const truncated = text.slice(0, 1000);
    const targetLang = LANG_MAP[language] || "en-IN";

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        inputs: [truncated],
        target_language_code: targetLang,
        model: "bulbul:v3",
        speaker: "simran",
        audio_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam TTS error:", response.status, errText);
      return NextResponse.json({ error: "Speech synthesis failed" }, { status: 502 });
    }

    const data = await response.json();
    const audioBase64 = data.audios?.[0];
    if (!audioBase64) {
      return NextResponse.json({ error: "No audio generated" }, { status: 502 });
    }

    return NextResponse.json({ audio: audioBase64 });
  } catch (e: any) {
    console.error("TTS error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
