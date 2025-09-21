import React from "react";
import twemoji from "twemoji";

interface EmojiTextProps {
  children: string;
  size?: number; // Add size prop
  className?: string; // Add className prop for custom CSS classes
}

const EmojiText: React.FC<EmojiTextProps> = ({
  children,
  size = 24,
  className = "",
}) => {
  // Parse emoji to <img>
  let html = twemoji.parse(children, {
    folder: "svg",
    ext: ".svg",
  });

  // Add inline style to <img>
  html = html.replace(
    /<img /,
    `<img style="width:${size}px;height:${size}px;vertical-align:middle;" `
  );

  return (
    <span
      className={`flex justify-center items-center ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default EmojiText;

// Example usage:
// <EmojiText size={48}>🚀</EmojiText>
// <EmojiText size={32} className="px-4">📚</EmojiText>
