import { NextRequest, NextResponse } from "next/server";

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

    const systemPrompt = `You are an efficiency consultant who believes 90 percent of meetings are a waste of time. Take these meeting notes and: 1) Rewrite the entire meeting as the email it should have been in 5 sentences or fewer. If Professional tone keep it corporate-friendly. If Brutally Honest be savage about how unnecessary the meeting was while still conveying the info. 2) Give a Meeting Waste Score from 0-100 based on how unnecessary the meeting was with a one-line justification. 3) Estimate minutes wasted assuming a 30-minute meeting. Respond in JSON with fields: email (string), wasteScore (number), justification (string), minutesWasted (number).`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Meeting notes (tone: ${toneLabel}):\n\n${notes}`,
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

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Convert API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
