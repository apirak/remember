import React from "react";
import twemoji from "twemoji";

interface EmojiTextProps {
  children: string;
  size?: number; // Add size prop
}

const EmojiText: React.FC<EmojiTextProps> = ({ children, size = 24 }) => {
  // Parse emoji to <img>
  let html = twemoji.parse(children, {
    folder: "svg",
    ext: ".svg",
  });

  // Add inline style to <img>
  html = html.replace(
    /<img /,
    `<img style="width:${size}px;height:${size}px;display:inline-block;vertical-align:middle;" `
  );

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export default EmojiText;

// Example usage:
// <EmojiText size={48}>🚀</EmojiText>
// <EmojiText size={32}>📚</EmojiText>
