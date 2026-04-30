import katex from 'katex'
import 'katex/dist/katex.min.css'
import React, { useEffect, useRef } from 'react'

interface LatexRendererProps
{
    latex: string
    displayMode?: boolean
    className?: string
    errorColor?: string
}

const LatexRenderer: React.FC<LatexRendererProps> = ({
    latex,
    displayMode = false,
    className = '',
    errorColor = '#cc0000'
}) =>
{
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() =>
    {
        if (!containerRef.current) return;

        try
        {
            containerRef.current.innerHTML = '';

            let processedLatex = latex;
            processedLatex = processedLatex.replace(/(\d)\s+(\d)/g, '$1$2');

            processedLatex = processedLatex.replace(/\\frac\s*{([^}]+)}\s*{([^}]+)}/g, '\\frac{$1}{$2}');

            processedLatex = processedLatex.replace(/\\sqrt\s*{([^}]+)}/g, '\\sqrt{$1}');
            processedLatex = processedLatex.replace(/\\sqrt\[([^\]]+)\]\s*{([^}]+)}/g, '\\sqrt[$1]{$2}');

            processedLatex = processedLatex.replace(/\^{(\s*)([^}]+)(\s*)}/g, '^{$2}');
            processedLatex = processedLatex.replace(/\_{(\s*)([^}]+)(\s*)}/g, '_{$2}');

            processedLatex = processedLatex.replace(/\s*([+\-*/=])\s*/g, '$1');

            katex.render(processedLatex, containerRef.current, {
                displayMode: displayMode,
                throwOnError: false,
                errorColor: errorColor,
                strict: false,
                trust: true,
                macros: {
                    "\frac": "\frac",
                    "\dfrac": "\\dfrac",
                    "\tfrac": "\\tfrac",
                    "\cfrac": "\\cfrac",

                    "\alpha": "\\alpha",
                    "\beta": "\\beta",
                    "\gamma": "\\gamma",
                    "\delta": "\\delta",
                    "\epsilon": "\\epsilon",
                    "\varepsilon": "\\varepsilon",
                    "\zeta": "\\zeta",
                    "\eta": "\\eta",
                    "\theta": "\\theta",
                    "\vartheta": "\\vartheta",
                    "\iota": "\\iota",
                    "\kappa": "\\kappa",
                    "\lambda": "\\lambda",
                    "\mu": "\\mu",
                    "\\nu": "\\nu",
                    "\\xi": "\\xi",
                    "\omicron": "o",
                    "\pi": "\\pi",
                    "\varpi": "\\varpi",
                    "\rho": "\\rho",
                    "\varrho": "\\varrho",
                    "\sigma": "\\sigma",
                    "\varsigma": "\\varsigma",
                    "\tau": "\\tau",
                    "\\upsilon": "\\upsilon",
                    "\phi": "\\phi",
                    "\varphi": "\\varphi",
                    "\chi": "\\chi",
                    "\psi": "\\psi",
                    "\omega": "\\omega",

                    "\cdot": "\\cdot",
                    "\cdots": "\\cdots",
                    "\times": "\\times",
                    "\div": "\\div",
                    "\pm": "\\pm",
                    "\mp": "\\mp",
                    "\sqrt": "\\sqrt",
                    "\sqrt[3]": "\\sqrt[3]",
                    "\sqrt[4]": "\\sqrt[4]",
                    "\sum": "\\sum",
                    "\prod": "\\prod",
                    "\int": "\\int",
                    "\oint": "\\oint",
                    "\iint": "\\iint",
                    "\iiint": "\\iiint",
                    "\lim": "\\lim",
                    "\sin": "\\sin",
                    "\cos": "\\cos",
                    "\tan": "\\tan",
                    "\cot": "\\cot",
                    "\sec": "\\sec",
                    "\csc": "\\csc",
                    "\arcsin": "\\arcsin",
                    "\arccos": "\\arccos",
                    "\arctan": "\\arctan",
                    "\sinh": "\\sinh",
                    "\cosh": "\\cosh",
                    "\tanh": "\\tanh",
                    "\coth": "\\coth",
                    "\log": "\\log",
                    "\ln": "\\ln",
                    "\exp": "\\exp",

                    "\infty": "\\infty",
                    "\partial": "\\partial",
                    "\\nabla": "\\nabla",
                    "\forall": "\\forall",
                    "\exists": "\\exists",
                    "\emptyset": "\\emptyset",
                    "\varnothing": "\\varnothing",
                    "\mathbb{R}": "\\mathbb{R}",
                    "\mathbb{C}": "\\mathbb{C}",
                    "\mathbb{N}": "\\mathbb{N}",
                    "\mathbb{Z}": "\\mathbb{Z}",
                    "\mathbb{Q}": "\\mathbb{Q}",
                    "\mathbb{P}": "\\mathbb{P}",
                }
            })
        } catch (error)
        {
            if (containerRef.current)
                containerRef.current.innerHTML = `
                    <div style="color: ${errorColor}; padding: 4px; border: 1px dashed ${errorColor}; border-radius: 4px; font-size: 0.9em;">
                        ${latex}
                    </div>
                `
        }
    }, [latex, displayMode, errorColor])

    return <div ref={containerRef} className={`katex-renderer ${className}`} />
}

export default LatexRenderer