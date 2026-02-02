class TodoParser {
  // Support all unordered list bullet symbols as per spec
  bulletSymbols = ["-", "*", "+"];

  // Default completed status markers
  doneStatusMarkers = ["x", "X", "-"];

  #lines;
  #withChildren;

  #parseIntoChars(content, contentType = "content") {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return Array.from(segmenter.segment(content), (s) => s.segment);
    } else {
      console.error(
        `Intl.Segmenter not available, falling back to Array.from() for ${contentType}`,
      );
      return Array.from(content);
    }
  }

  constructor(lines, withChildren, doneStatusMarkers) {
    this.#lines = lines;
    this.#withChildren = withChildren;
    if (doneStatusMarkers) {
      this.doneStatusMarkers = this.#parseIntoChars(
        doneStatusMarkers,
        "done status markers",
      );
    }
  }

  // Returns heading level (1-6) or 0 if not a heading
  #getHeadingLevel(line) {
    const match = line.match(/^(#{1,6})\s+/);
    return match ? match[1].length : 0;
  }

  // Returns true if line is a checked (completed) checkbox
  #isCheckedCheckbox(line) {
    const match = line.match(/^\s*[*+-]\s+\[(.+?)\]/);
    if (!match) return false;

    const checkboxContent = match[1];
    const contentChars = this.#parseIntoChars(
      checkboxContent,
      "checkbox content",
    );

    if (contentChars.length !== 1) return false;

    return contentChars.some((char) => this.doneStatusMarkers.includes(char));
  }

  // Returns true if line is any checkbox (checked or unchecked)
  #isCheckbox(line) {
    return /^\s*[*+-]\s+\[.+?\]/.test(line);
  }

  // Returns true if line is empty or whitespace only
  #isEmpty(line) {
    return line.trim() === "";
  }

  // Build a nested structure from lines
  #buildTree() {
    const root = { level: 0, heading: null, children: [], content: [] };
    const stack = [root];

    for (const line of this.#lines) {
      if (this.#isEmpty(line)) continue;

      const headingLevel = this.#getHeadingLevel(line);

      if (headingLevel > 0) {
        // Pop stack until we find a parent with lower level
        while (
          stack.length > 1 &&
          stack[stack.length - 1].level >= headingLevel
        ) {
          stack.pop();
        }

        const node = {
          level: headingLevel,
          heading: line,
          children: [],
          content: [],
        };

        stack[stack.length - 1].children.push(node);
        stack.push(node);
      } else {
        // Content line - add to current heading's content
        stack[stack.length - 1].content.push(line);
      }
    }

    return root;
  }

  // Filter content: remove checked checkboxes, keep unchecked and text
  #filterContent(content) {
    return content.filter((line) => !this.#isCheckedCheckbox(line));
  }

  // Recursively prune empty branches and filter content
  #pruneTree(node) {
    // Filter this node's content
    node.content = this.#filterContent(node.content);

    // Recursively prune children
    node.children = node.children
      .map((child) => this.#pruneTree(child))
      .filter((child) => child !== null);

    // If this is a heading node (not root), check if it has any content
    if (node.heading !== null) {
      const hasContent = node.content.length > 0 || node.children.length > 0;
      if (!hasContent) return null;
    }

    return node;
  }

  // Convert tree back to lines with proper formatting
  #treeToLines(node, isFirstContent = true) {
    const lines = [];

    // Add heading if present
    if (node.heading !== null) {
      lines.push(node.heading);
    }

    // Group content into checkbox groups and other content
    const groups = this.#groupContent(node.content);

    let isFirst = node.heading !== null; // skip leading newline if right after heading
    for (const group of groups) {
      if (group.isCheckboxGroup) {
        if (!isFirst) {
          lines.push(""); // newline before checkbox group (but not right after heading)
        }
        lines.push(...group.lines);
        lines.push(""); // newline after checkbox group
      } else {
        lines.push(...group.lines);
      }
      isFirst = false;
    }

    // Process children
    for (const child of node.children) {
      const childLines = this.#treeToLines(child);
      lines.push(...childLines);
    }

    return lines;
  }

  // Group consecutive checkboxes together
  #groupContent(content) {
    const groups = [];
    let currentGroup = null;

    for (const line of content) {
      const isCheckbox = this.#isCheckbox(line);

      if (currentGroup === null) {
        currentGroup = { isCheckboxGroup: isCheckbox, lines: [line] };
      } else if (currentGroup.isCheckboxGroup === isCheckbox) {
        currentGroup.lines.push(line);
      } else {
        groups.push(currentGroup);
        currentGroup = { isCheckboxGroup: isCheckbox, lines: [line] };
      }
    }

    if (currentGroup !== null) {
      groups.push(currentGroup);
    }

    return groups;
  }

  // Clean up output: remove consecutive empty lines, trim start/end, remove empty lines before headings
  #cleanOutput(lines) {
    // Remove consecutive empty lines and empty lines before headings
    const cleaned = [];
    let prevEmpty = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isEmpty = line.trim() === "";

      if (isEmpty) {
        // Check if next non-empty line is a heading
        let nextNonEmpty = null;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() !== "") {
            nextNonEmpty = lines[j];
            break;
          }
        }
        // Skip empty line if it's before a heading or consecutive
        if (prevEmpty || (nextNonEmpty && /^#{1,6}\s+/.test(nextNonEmpty))) {
          continue;
        }
      }

      cleaned.push(line);
      prevEmpty = isEmpty;
    }

    // Trim empty lines from start and end
    while (cleaned.length > 0 && cleaned[0].trim() === "") {
      cleaned.shift();
    }
    while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === "") {
      cleaned.pop();
    }

    return cleaned;
  }

  getTodos() {
    const tree = this.#buildTree();
    const pruned = this.#pruneTree(tree);

    if (
      !pruned ||
      (pruned.content.length === 0 && pruned.children.length === 0)
    ) {
      return [];
    }

    const lines = this.#treeToLines(pruned);
    return this.#cleanOutput(lines);
  }
}

// Utility-function that acts as a thin wrapper around `TodoParser`
export const getTodos = ({
  lines,
  withChildren = false,
  doneStatusMarkers = null,
}) => {
  const todoParser = new TodoParser(lines, withChildren, doneStatusMarkers);
  return todoParser.getTodos();
};
