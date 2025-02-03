import { createClient } from "contentful-management";

export const client = createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
});

export const space = await client.getSpace(
  process.env.CONTENTFUL_SPACE_ID
);

export const spaceId = process.env.CONTENTFUL_SPACE_ID;
export const environmentId = process.env.CONTENTFUL_ENVIRONMENT;

export const getEnvironment = async () => {
  return space.getEnvironment(process.env.CONTENTFUL_ENVIRONMENT);
};

export const environment = await space.getEnvironment(
  process.env.CONTENTFUL_ENVIRONMENT
);

export const createEntry = async (contentTypeId, fields) => {
  const environment = await getEnvironment();
  const entry = await environment.createEntry(contentTypeId, { fields });
  await entry.publish();
  return entry;
};

export const stringToRichText = (text) => {
  return {
    nodeType: "document",
    data: {},
    content: [
      {
        nodeType: "paragraph",
        data: {},
        content: [
          {
            nodeType: "text",
            value: text,
            marks: [],
            data: {},
          },
        ],
      },
    ],
  };
};
