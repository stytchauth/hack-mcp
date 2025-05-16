import React, { useState } from 'react';

interface CodeBlockProps {
    text: string;
}

const copySVG = (
    <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"
         color="inherit">
        <path clip-rule="evenodd" d="M4 2H15V4H6V17H4V2ZM8 6H20V22H8V6ZM10 8V20H18V8H10Z"
              fill="currentColor" fill-rule="evenodd"></path>
    </svg>
);

const confirmSVG = (
    <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"
         color="#09906A">
        <path d="M18 6H20V8H18V6Z" fill="currentColor"></path>
        <path d="M16 10V8H18V10H16Z" fill="currentColor"></path>
        <path d="M14 12V10H16V12H14Z" fill="currentColor"></path>
        <path d="M12 14H14V12H12V14Z" fill="currentColor"></path>
        <path d="M10 16H12V14H10V16Z" fill="currentColor"></path>
        <path d="M8 16V18H10V16H8Z" fill="currentColor"></path>
        <path clip-rule="evenodd" d="M6 14H4V12H6V14ZM6 14H8V16H6V14Z" fill="currentColor"
              fill-rule="evenodd"></path>
    </svg>
);

const CodeBlock: React.FC<CodeBlockProps> = ({ text }) => {
    const [showCopyIcon, setShowCopyIcon] = useState(false);
    const [showConfirmIcon, setShowConfirmIcon] = useState(false);

    const handleMouseEnter = () => {
        setShowCopyIcon(true);
        setShowConfirmIcon(false);
    };

    const handleMouseLeave = () => {
        setShowCopyIcon(false);
        setShowConfirmIcon(false);
    };

    const handleClick = () => {
        navigator.clipboard.writeText(text).then(() => {
            setShowConfirmIcon(true);
            setShowCopyIcon(false);
        });
    };

    return (
        <div 
            className="code-block" 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            {text}
            {showCopyIcon && <div className="icon-overlay">{copySVG}</div>}
            {showConfirmIcon && <div className="icon-overlay">{confirmSVG}</div>}
        </div>
    );
}

export default CodeBlock;
