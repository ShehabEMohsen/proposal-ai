import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

//   const { clientName, projectType, deliverables, timeline, price, yourName, tone } = await req.json();
    const { notes, yourName, clientName } = await req.json();

//   const prompt = `
// You are a professional proposal writer. Write a complete client proposal with these details:

// - Client name: ${clientName}
// - Project type: ${projectType}
// - Deliverables: ${deliverables}
// - Timeline: ${timeline}
// - Price: ${price}
// - Prepared by: ${yourName}
// - Tone: ${tone || "Professional"}

// Structure it with these sections:
// 1. Introduction (2-3 sentences addressing the client by name)
// 2. Project Overview
// 3. Scope of Work (bullet list)
// 4. Timeline (broken into phases)
// 5. Investment (pricing summary)
// 6. Next Steps (clear call to action)
// 7. Closing line

// Return clean HTML using only these tags: <h2> <p> <ul> <li> <table> <tr> <td> <th>
// No markdown. No code blocks. No backticks. Just raw HTML.
//   `;

const prompt = `
You are a professional proposal writer. A freelancer or consultant has pasted their raw meeting notes from a client discovery call below.

Extract all relevant information from the notes and write a complete, polished client proposal.

If any details are missing (like exact price or timeline), make a reasonable professional estimate based on the context and note it as "estimated" or "to be confirmed."

Meeting notes:
${notes}

The client name is ${clientName} and the proposal should be prepared by ${yourName}.

Write a full proposal with these sections:
1. Introduction (address the client by name, reference what they're trying to achieve)
2. Project Overview
3. Scope of Work (bullet list of deliverables you inferred from the notes)
4. Timeline (broken into phases, based on any dates or urgency mentioned)
5. Investment (pricing based on what was mentioned, mark as estimate if unclear)
6. Next Steps (clear call to action)
7. Closing line

Return clean HTML using only: <h2> <p> <ul> <li> <table> <tr> <td> <th>
No markdown. No code blocks. Just raw HTML.
`;

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          controller.enqueue(new TextEncoder().encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}