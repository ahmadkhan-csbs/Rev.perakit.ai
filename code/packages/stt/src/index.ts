// @rev/stt — Deepgram live URL builder + result parser
export function buildLiveUrl(opts: { language?: string; encoding?: string; sampleRate?: number } = {}): string {
  const params = new URLSearchParams({
    model: "nova-3",
    language: opts.language ?? "multi",
    punctuate: "true",
    smart_format: "true",
    interim_results: "true",
    utterance_end_ms: "1000",
    vad_events: "true",
  });
  if (opts.encoding) params.set("encoding", opts.encoding);
  if (opts.sampleRate) params.set("sample_rate", String(opts.sampleRate));
  return `wss://api.deepgram.com/v1/listen?${params}`;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  speaker?: number;
  confidence?: number;
}

export function parseResultMessage(msg: unknown): TranscriptEvent | null {
  const m = msg as any;
  if (!m || m.type !== "Results") return null;
  const alt = m.channel?.alternatives?.[0];
  if (!alt) return null;
  const text = (alt.transcript ?? "").trim();
  if (!text) return null;
  return {
    text,
    isFinal: Boolean(m.is_final),
    speechFinal: Boolean(m.speech_final),
    speaker: alt.words?.[0]?.speaker,
    confidence: alt.confidence,
  };
}
