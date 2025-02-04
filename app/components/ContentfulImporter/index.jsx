"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./styles.module.css";
import { Loading } from "../../icons/loading";

const ContentfulImporter = ({
  csvData,
  selectedContentType,
  setSelectedContentType,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [progress, setProgress] = useState(0); // Percentage Progress (0-100)
  // eslint-disable-next-line
  const [totalEntries, setTotalEntries] = useState(0);
  // eslint-disable-next-line
  const [completedEntries, setCompletedEntries] = useState(0);

  const contentTypeMappings = {
    informationHelpshift: [
      { contentfulField: "internalName", csvHeader: "EN FAQ Title" },
      { contentfulField: "title", csvHeader: "EN FAQ Title" },
      { contentfulField: "helpshiftDetails", csvHeader: "EN FAQ Content" },
      { contentfulField: "associationId", csvHeader: "Association ID" },
    ],
    componentCard: [
      { contentfulField: "internalName", csvHeader: "Association ID" },
      { contentfulField: "title", csvHeader: "EN Section Name" },
    ],
  };

  const handleReload = () => {
    window.location.reload(); // Reloads the page
  };

  const handleSubmit = async () => {
    if (!selectedContentType || csvData.length === 0) {
      toast.error("Please select a content type and upload a CSV file.");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    setTotalEntries(csvData.length);
    setCompletedEntries(0);

    try {
      const response = await fetch("/api/contentful/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType: selectedContentType,
          csvData,
          mappings: contentTypeMappings[selectedContentType],
        }),
      });

      console.log('response---', response)

      if (!response.ok) {
        const error = await response.json();
        toast.error(`Error: ${error.message}`);
        return;
      }

      // Streaming progress updates from the backend
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode the chunk from the stream
        const chunk = decoder.decode(value, { stream: true });

        // Ensure the chunk is properly formatted before parsing
        if (!chunk.trim()) continue;

        // const parsedData = JSON.parse(chunk);

        const parsedData = typeof chunk === "string" ? JSON.parse(chunk) : chunk;
        console.log('chunk', parsedData)

        // Update progress for each completed entry
        setCompletedEntries((prev) => {
          const newCompleted = parsedData.completedEntries;
          setProgress(Math.round((newCompleted / csvData.length) * 100));
          return newCompleted;
        });
      }

      // Final success message after all entries have been processed
      toast.success(
        "🎉 All entries have been imported and published successfully!"
      );
    } catch (error) {
      console.error("Error during import:", error);
      toast.error("Failed to import entries.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div
      className={`${styles.container} ${
        selectedContentType ? styles.show : ""
      }`}
    >
      {/* <h3 className={styles.title}>
        Are you creating <strong>FAQ</strong> entries or{" "}
        <strong>Articles/Products?</strong>
      </h3> */}
      {/* <select
      className={styles.select}
      // className={styles.dropdown}
      value={selectedContentType}
      onChange={(e) => setSelectedContentType(e.target.value)}
    >
      <option value="">-- Select the content type you are creating--</option>
      <option value="informationHelpshift">FAQ</option>
      <option value="componentCard">Product/Article</option>
    </select> */}

      {selectedContentType && (
        <div className={styles.contentTypeContainer}>
          <div>
            {selectedContentType === "informationHelpshift" && (
              <h3 className={styles.title}>
                {`Looks like you're trying to create new entries for`}{" "}
                <strong>FAQs</strong>
              </h3>
            )}

            {selectedContentType === "componentCard" && (
              <h3 className={styles.title}>
                {`Looks like you're trying to create new entries for`}{" "}
                <strong>Articles & Products</strong>
              </h3>
            )}
          </div>

          <label className={styles.label}>Selected Content Type:</label>
          <select
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            className={styles.dropdown}
          >
            <option value="informationHelpshift">Information Helpshift</option>
            <option value="componentCard">Component Card</option>
          </select>
        </div>
      )}
      <h3 style={{ color: "red" }}>Does this look correct?</h3>
      <div className={styles.checkboxContainer}>
        <input
          type="checkbox"
          id="confirmImport"
          checked={isChecked}
          onChange={() => setIsChecked(!isChecked)}
          className={styles.checkbox}
        />
        <label htmlFor="confirmImport" className={styles.checkboxLabel}>
          I confirm that the data is correct and ready for import.
        </label>
      </div>
      {csvData.length > 0 && progress !== 100 && (
        <button
          className={`${styles.button} ${isSubmitting ? styles.hide : ""}`}
          onClick={handleSubmit}
          // disabled={isSubmitting}
          disabled={!isChecked || isSubmitting}
        >
          {"Import to Contentful"}
        </button>
      )}

      <div>
        {isSubmitting && progress < 100 && (
          // <div
          //   style={{
          //     width: "100%",
          //     backgroundColor: "#e0e0e0",
          //     borderRadius: "5px",
          //     marginTop: "30px",
          //   }}
          // >
          //   <div
          //     style={{
          //       width: `${progress}%`,
          //       backgroundColor: progress < 100 ? "#4caf50" : "#2196F3",
          //       height: "10px",
          //       borderRadius: "5px",
          //       transition: "width 0.4s ease-in-out",
          //     }}
          //   ></div>
          // </div>
          <div className={styles.loading}>
            <Loading progress={progress} />
          </div>
        )}

        {progress === 100 && (
          <>
            <div className={styles.loading}>
              <Loading progress={progress} />
              {/* <Completed /> */}
              <button
                className={`${styles.reload}  ${
                  progress === 100 ? styles.show : ""
                }`}
                onClick={handleReload}
              >
                Upload More Files
              </button>
            </div>
          </>
        )}
        {/* {progress === 100 ? (
           <div className={styles.loading}>
           <Loading progress={progress} />
         </div>
        ) : null} */}
        {/* {isSubmitting && (
          <p style={{ textAlign: "center", marginTop: "5px" }}>
            {progress}% Completed
          </p>
        )} */}
      </div>
    </div>
  );
};

export default ContentfulImporter;
