export type IntentModality = "visual" | "voice" | "text" | "mixed";

export type IntentCategory =
  | "math"
  | "coding"
  | "visual"
  | "general"
  | "video_request";

export interface IntentInput {
  modality: IntentModality;
  content: string;
  imageData?: string;
  language: string;
  timestamp: number;
}

export interface IntentResult {
  id: string;
  category: IntentCategory;
  explanation: string;
  videoUrl?: string;
  subtitlesUrl?: string;
  duration?: number;
  confidence: number;
  processingTime: number;
}

export interface VideoGenerationRequest {
  concept: string;
  explanation: string;
  language: string;
  visualStyle?: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  subtitlesUrl: string;
  duration: number;
  thumbnailUrl?: string;
}
