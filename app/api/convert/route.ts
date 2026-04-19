import { NextRequest, NextResponse } from "next/server";

const MAX_NOTES_CHARS = 15000;

export async function POST(req: NextRequest) {
  try {
    const { notes, tone } = await req.json();

    if (!notes || !tone) {
      return NextResponse.json(
        { error: "Missing required fields: notes and tone" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error: missing API key" },
        { status: 500 }
      );
    }

    const toneLabel = tone === "brutal" ? "Brutally Honest" : "Professional";

    // Cap the input — a 60-minute Zoom transcript would otherwise blow past context and cost.
    const trimmedNotes = String(notes).slice(0, MAX_NOTES_CHARS);
    const wasTrimmed = String(notes).length > MAX_NOTES_CHARS;

    const systemPrompt = `You are an efficiency consultant who believes 90 percent of meetings are a waste of time. Take these meeting notes and do FIVE things:

1. Write a SUBJECT LINE for the email this meeting should have been. If Professional: clean, useful, specific. If Brutally Honest: savage and specific — reference the worst moment or the core absurdity of the meeting ("Re: That 47 minutes we spent debating the hyphen in 'on-boarding'"). Never generic.

2. Write the EMAIL BODY — the whole meeting summarized in 5 sentences or fewer. Same tone rules as subject.

3. Give a Meeting Waste Score from 0-100 based on how unnecessary the meeting was.

4. Provide a one-line justification for the score.

5. Estimate the total meeting duration in minutes (guess from context: detailed transcripts suggest longer, tiny bullets suggest shorter) and how many of those minutes were wasted.

Respond with ONLY a valid JSON object, no markdown, no preamble, no code fences. Schema:
{
  "subject": string,
  "email": string,
  "wasteScore": number,
  "justification": string,
  "minutesWasted": number,
  "meetingDuration": number
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Meeting notes (tone: ${toneLabel}${wasTrimmed ? "; note: input was truncated to first 15k chars" : ""}):\n\n${trimmedNotes}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Anthropic API error:", errorData);
      return NextResponse.json(
        { error: "Failed to process meeting notes" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Strip markdown fences if present, then parse
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // Fallback: match the outermost braces
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 500 }
        );
      }
      result = JSON.parse(jsonMatch[0]);
    }

    // Shape validation
    if (
      typeof result?.subject !== "string" ||
      typeof result?.email !== "string" ||
      typeof result?.wasteScore !== "number" ||
      typeof result?.justification !== "string" ||
      typeof result?.minutesWasted !== "number"
    ) {
      return NextResponse.json(
        { error: "Malformed AI response" },
        { status: 500 }
      );
    }

    // Normalize + clamp
    const normalized = {
      subject: result.subject,
      email: result.email,
      wasteScore: Math.min(100, Math.max(0, Math.round(result.wasteScore))),
      justification: result.justification,
      minutesWasted: Math.max(0, Math.round(result.minutesWasted)),
      meetingDuration:
        typeof result.meetingDuration === "number" && result.meetingDuration > 0
          ? Math.round(result.meetingDuration)
          : 30,
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Convert API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
