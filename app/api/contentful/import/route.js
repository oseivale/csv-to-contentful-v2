import { createClient } from "contentful-management";
import {
  convertHtmlToRichText,
  replacePlaceholdersWithAssets,
} from "../../../lib/actions/handleSubmit";

const client = createClient({
  accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN, // Server-side only
});

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = process.env.CONTENTFUL_ENVIRONMENT;

export async function POST(req) {
  const encoder = new TextEncoder();

  try {
    const { contentType, csvData, mappings } = await req.json();
    const space = await client.getSpace(spaceId);
    const environment = await space.getEnvironment(environmentId);

    // Stream progress updates
    const readable = new ReadableStream({
      start(controller) {
        (async () => {
          let completedEntries = 0;

          for (const row of csvData) {
            const fields = {};

            for (const { contentfulField, csvHeader } of mappings) {
              const value = row[csvHeader]?.trim();
              if (!value) continue; // Skip empty values

              // ✅ Handle Rich Text Fields
              if (contentfulField === "helpshiftDetails") {
                const richTextContent = await convertHtmlToRichText(
                  value,
                  environment
                );
                const finalRichText = await replacePlaceholdersWithAssets(
                  richTextContent,
                  environment
                );
                fields[contentfulField] = { "en-US": finalRichText };
              } else {
                fields[contentfulField] = {
                  "en-US": typeof value === "string" ? value.trim() : value,
                };
              }
            }

            // Create and publish entry
            const entry = await environment.createEntry(contentType, { fields });
            await entry.publish();

            // Increment completed entries and send progress update
            completedEntries++;
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  completedEntries,
                  totalEntries: csvData.length,
                  message: `Processed ${completedEntries}/${csvData.length}`,
                })
              )
            );
          }

          controller.close();
        })().catch((err) => {
          console.error("Error streaming progress:", err);
          controller.error(err);
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error importing entries to Contentful:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}