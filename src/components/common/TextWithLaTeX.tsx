// import React, { useMemo } from 'react'
// import LaTeXRenderer from './LaTeXRenderer'

// interface TextWithLaTeXProps
// {
//     text: string
//     className?: string
//     preserveLineBreaks?: boolean
// }

// const TextWithLaTeX: React.FC<TextWithLaTeXProps> = ({
//     text,
//     className = '',
//     preserveLineBreaks = false
// }) =>
// {
//     const renderContent = useMemo(() =>
//     {
//         if (!text) return null

//         // Паттерны для поиска формул LaTeX:
//         // 1. \( ... \) - инлайн формулы
//         // 2. \[ ... \] - блочные формулы
//         // 3. $ ... $ - инлайн формулы (альтернативный синтаксис)
//         // 4. $$ ... $$ - блочные формулы (альтернативный синтаксис)

//         const parts: React.ReactNode[] = []
//         let lastIndex = 0

//         // Паттерны в порядке приоритета
//         const patterns = [
//             { regex: /\\\[(.*?)\\\]/g, displayMode: true },    // \[ ... \]
//             { regex: /\$\$(.*?)\$\$/g, displayMode: true },    // $$ ... $$
//             { regex: /\\\((.*?)\\\)/g, displayMode: false },   // \( ... \)
//             { regex: /\$(.*?)\$/g, displayMode: false },       // $ ... $
//         ]

//         // Функция для добавления текстовой части
//         const addTextPart = (textPart: string) =>
//         {
//             if (!textPart) return

//             if (preserveLineBreaks)
//             {
//                 const lines = textPart.split('\n')
//                 return lines.map((line, index) => (
//                     <React.Fragment key={index}>
//                         {line}
//                         {index < lines.length - 1 && <br />}
//                     </React.Fragment>
//                 ))
//             }
//             return textPart
//         }

//         // Обходим все паттерны
//         for (const { regex, displayMode } of patterns)
//         {
//             const matches = Array.from(text.matchAll(regex))

//             if (matches.length > 0)
//             {
//                 for (const match of matches)
//                 {
//                     const matchStart = match.index!
//                     const matchEnd = matchStart + match[0].length

//                     // Добавляем текст до формулы
//                     if (matchStart > lastIndex)
//                     {
//                         const textBefore = text.substring(lastIndex, matchStart)
//                         parts.push(
//                             <span key={`text-${matchStart}`}>
//                                 {addTextPart(textBefore)}
//                             </span>
//                         )
//                     }

//                     // Добавляем формулу
//                     const formulaContent = match[1].trim()
//                     parts.push(
//                         <LaTeXRenderer
//                             key={`formula-${matchStart}`}
//                             content={formulaContent}
//                             displayMode={displayMode}
//                             className="inline-block mx-1"
//                         />
//                     )

//                     lastIndex = matchEnd
//                 }

//                 // Добавляем оставшийся текст
//                 if (lastIndex < text.length)
//                 {
//                     const remainingText = text.substring(lastIndex)
//                     parts.push(
//                         <span key="text-remaining">
//                             {addTextPart(remainingText)}
//                         </span>
//                     )
//                 }

//                 return parts
//             }
//         }

//         // Если формул не найдено, возвращаем обычный текст
//         return addTextPart(text)

//     }, [text, preserveLineBreaks])

//     return (
//         <div className={`${className}`}>
//             {renderContent}
//         </div>
//     )
// }

// export default TextWithLaTeX