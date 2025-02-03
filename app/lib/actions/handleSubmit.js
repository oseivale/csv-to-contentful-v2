import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import { parseDocument, DomUtils } from "htmlparser2";
import { environment } from "../contentful";

export const convertHtmlToRichText = async (htmlString, environment) => {
  if (!htmlString || htmlString.trim() === "") {
    return {
      nodeType: "document",
      data: {},
      content: [],
    };
  }

  const dom = parseDocument(htmlString);
  let imagePlaceholders = []; // To store images as placeholders

  const parseNodes = async (nodes) => {
    const blockElements = [];
    let currentInlineNodes = [];

    for (const node of nodes) {
      if (node.type === "text") {
        const textValue = node.data.trim();
        if (textValue) {
          currentInlineNodes.push({
            nodeType: "text",
            value: textValue,
            marks: [],
            data: {},
          });
        }
        continue;
      }

      switch (node.name) {
        case "p":
        case "div": {
          if (currentInlineNodes.length > 0) {
            blockElements.push({
              nodeType: BLOCKS.PARAGRAPH,
              data: {},
              content: currentInlineNodes,
            });
            currentInlineNodes = [];
          }

          const parsedChildren = await parseNodes(node.children || []);
          if (parsedChildren.length > 0) {
            blockElements.push(...parsedChildren);
          }
          break;
        }
        case "ul":
        case "ol": {
          const isOrdered = node.name === "ol";

          const listItems = await Promise.all(
            (node.children || [])
              .filter((child) => child.name === "li")
              .map(async (liNode) => ({
                nodeType: BLOCKS.LIST_ITEM,
                data: {},
                content: await parseNodes(liNode.children || []), // Ensure it's an array
              }))
          );

          blockElements.push({
            nodeType: isOrdered ? BLOCKS.OL_LIST : BLOCKS.UL_LIST,
            data: {},
            content: listItems.length > 0 ? listItems : [], // Ensure it's an array
          });
          break;
        }

        case "li": {
          blockElements.push({
            nodeType: BLOCKS.LIST_ITEM,
            data: {},
            content: await parseNodes(node.children || []), // Ensure it's an array
          });
          break;
        }

        case "a": {
          const containsImage = node.children.some(
            (child) => child.name === "img"
          );
          if (containsImage) {
            const imgNode = node.children.find((child) => child.name === "img");
            if (imgNode && imgNode.attribs?.src) {
              const placeholder = `{{image-${imagePlaceholders.length}}}`;
              imagePlaceholders.push({
                placeholder,
                url: imgNode.attribs.src,
              });

              blockElements.push({
                nodeType: "text",
                value: placeholder, // Temporary placeholder
                marks: [],
                data: {},
              });
            }
          } else {
            currentInlineNodes.push({
              nodeType: INLINES.HYPERLINK,
              data: { uri: node.attribs?.href || "#" },
              content: [
                {
                  nodeType: "text",
                  value: DomUtils.textContent(node).trim() || "Link",
                  marks: [],
                  data: {},
                },
              ],
            });
          }
          break;
        }

        case "img": {
          if (node.attribs?.src) {
            const placeholder = `{{image-${imagePlaceholders.length}}}`;
            imagePlaceholders.push({ placeholder, url: node.attribs.src });

            blockElements.push({
              nodeType: "text",
              value: placeholder, // Temporary placeholder
              marks: [],
              data: {},
            });
          }
          break;
        }
        default: {
          const textContent = DomUtils.textContent(node).trim();
          if (textContent) {
            currentInlineNodes.push({
              nodeType: "text",
              value: textContent,
              marks: [],
              data: {},
            });
          }
        }
      }
    }

    if (currentInlineNodes.length > 0) {
      blockElements.push({
        nodeType: BLOCKS.PARAGRAPH,
        data: {},
        content: currentInlineNodes,
      });
    }

    return blockElements;
  };

  return {
    nodeType: "document",
    data: {},
    content: await parseNodes(dom.children || []),
    imagePlaceholders, // Return placeholders to be replaced later
  };
};

export const createOrGetAsset = async (imageUrl) => {
  try {
    // Check if asset already exists
    const assets = await environment.getAssets();
    let existingAsset = assets.items.find(
      (asset) => asset.fields?.file?.["en-US"]?.url === imageUrl
    );

    if (existingAsset) {
      console.log(`✅ Asset already exists with ID: ${existingAsset.sys.id}`);
      return existingAsset.sys.id; // **Return only the asset ID**
    }

    // Create new asset
    let asset = await environment.createAsset({
      fields: {
        title: { "en-US": "Imported Image" },
        file: {
          "en-US": {
            contentType: "image/jpeg",
            fileName: imageUrl.split("/").pop(),
            upload: imageUrl, // External URL import
          },
        },
      },
    });

    await asset.processForAllLocales();
    asset = await environment.getAsset(asset.sys.id); // Fetch latest version

    const publishedAsset = await asset.publish();
    console.log(`🚀 Published asset with ID: ${publishedAsset.sys.id}`);

    return publishedAsset.sys.id; // **Return only the ID**
  } catch (error) {
    console.error("❌ Error creating or retrieving asset:", error);
    throw new Error("Failed to create or retrieve asset.");
  }
};

export const replacePlaceholdersWithAssets = async (richText, environment) => {
  const { content, imagePlaceholders } = richText;

  console.log("content--- processing--", content);
  for (const { placeholder, url } of imagePlaceholders) {
    // Get or create the asset
    const assetId = await createOrGetAsset(url); //--> LOOK INTO THIS

    console.log("--url--", url);
    // Replace placeholders in the content array
    for (let i = 0; i < content.length; i++) {
      if (content[i].nodeType === "paragraph") {
        // Replace text placeholders inside paragraphs
        content[i].content = content[i].content.map((child) => {
          if (child.nodeType === "text" && child.value === placeholder) {
            return {
              nodeType: BLOCKS.EMBEDDED_ASSET,
              data: {
                target: {
                  sys: {
                    id: assetId !== null ? assetId : "",
                    linkType: "Asset",
                    type: "Link",
                  },
                },
              },
              content: [],
            };
          }
          return child;
        });
      } else if (
        content[i].nodeType === "text" &&
        content[i].value === placeholder
      ) {
        // If the placeholder is a standalone node, replace it with an embedded asset block
        content[i] = {
          nodeType: BLOCKS.EMBEDDED_ASSET,
          data: {
            target: {
              sys: {
                id: assetId !== null ? assetId : "",
                linkType: "Asset",
                type: "Link",
              },
            },
          },
          content: [],
        };
      }
    }
  }

  return { nodeType: "document", data: {}, content };
};
