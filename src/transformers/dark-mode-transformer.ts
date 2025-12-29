/**
 * Dark Mode Color Transformer
 * 
 * Replaces hard-coded colors in SVG with CSS custom properties
 * for proper dark mode compatibility.
 */

import type { SvgTransformer, TransformContext, TransformResult } from './types';

// Pre-compiled regex patterns for optimal performance
// Using combined pattern with alternation for single-pass matching
const COLOR_REPLACEMENT_RULES = [
    {
        pattern: /("#000"|"black")/g,
        replacement: '"currentColor"',
        description: 'black to currentColor',
    },
    {
        pattern: /("#fff"|"white")/g,
        replacement: '"var(--background-primary)"',
        description: 'white to background',
    },
] as const;

/**
 * Transformer that adapts SVG colors for dark mode
 * Replaces black with currentColor and white with background variable
 */
export class DarkModeColorTransformer implements SvgTransformer {
    readonly name = 'dark-mode-color';
    readonly priority = 10; // Run early in pipeline
    enabled = true;

    constructor(enabled = true) {
        this.enabled = enabled;
    }

    transform(ctx: TransformContext): TransformResult {
        if (!this.enabled) {
            return { svg: ctx.svg, modified: false };
        }

        let svg = ctx.svg;
        let modified = false;

        // Apply all color replacement rules
        for (const rule of COLOR_REPLACEMENT_RULES) {
            const before = svg;
            svg = svg.replace(rule.pattern, rule.replacement);
            if (svg !== before) {
                modified = true;
            }
        }

        return { svg, modified };
    }
}

/**
 * Factory function for creating DarkModeColorTransformer
 */
export function createDarkModeTransformer(enabled = true): DarkModeColorTransformer {
    return new DarkModeColorTransformer(enabled);
}
