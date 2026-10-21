import React, { useEffect, useState } from "react";
import { delayRender, continueRender, cancelRender } from "remotion";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-kannada/400.css";
import "@fontsource/noto-sans-tamil/400.css";
import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-bengali/400.css";
import "@fontsource/noto-sans-gujarati/400.css";
import "@fontsource/noto-sans-gurmukhi/400.css";
const family: Record<string, [string, string]> = {
  english: ["Noto Sans", "Explanation"],
  hindi: ["Noto Sans Devanagari", "ज्ञान"],
  marathi: ["Noto Sans Devanagari", "ज्ञान"],
  kannada: ["Noto Sans Kannada", "ಕನ್ನಡ"],
  tamil: ["Noto Sans Tamil", "தமிழ்"],
  telugu: ["Noto Sans Telugu", "తెలుగు"],
  bengali: ["Noto Sans Bengali", "বাংলা"],
  gujarati: ["Noto Sans Gujarati", "ગુજરાતી"],
  punjabi: ["Noto Sans Gurmukhi", "ਪੰਜਾਬੀ"],
};
export function FontReady({ language }: { language: string }) {
  const [handle] = useState(() => delayRender("Bundled narration fonts"));
  useEffect(() => {
    const [name, sample] = family[language] || family.english;
    Promise.all([
      document.fonts.load(`400 24px "${name}"`, sample),
      document.fonts.load('400 24px "Noto Sans"', "Pragyan"),
    ])
      .then(() => continueRender(handle))
      .catch(cancelRender);
    return () => continueRender(handle);
  }, [handle, language]);
  return null;
}
